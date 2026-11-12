import asyncio
import json
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

# Make redguard library importable from backend/
_PARENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)
from redguard.datasets.loader import load_all_datasets

from database import get_db, init_db, close_db
from inspector import Inspector
from scanner import init_scan_session, run_family_scan, finalize_scan, _invoke_agent
from report_generator import generate_report_for_session
from agent_loader import list_agents, get_agent, DEFAULT_AGENT_ID
from agents._nvidia_common import is_nvidia_configured
import httpx


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle — connect DB on startup, disconnect on shutdown."""
    await init_db()
    yield
    await close_db()

app = FastAPI(title="Ai-guard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    prisma = await get_db()
    db_connected = prisma.is_connected()
    return {"status": "ok", "db_connected": db_connected}

@app.get("/api/stats")
async def get_stats():
    prisma = await get_db()
    total_sessions = await prisma.session.count()
    
    sessions = await prisma.session.find_many()
    tp = sum(s.totalProbes or 0 for s in sessions)
    tb = sum(s.blocked or 0 for s in sessions)
    ta = sum(s.allowed or 0 for s in sessions)
    
    rate = (tb / tp) if tp > 0 else 0.0
    
    return {
        "totalSessions": total_sessions,
        "totalProbes": tp,
        "totalBlocked": tb,
        "totalAllowed": ta,
        "overallBlockRate": rate,
        "coverageGap": ta
    }

@app.get("/api/sessions")
async def list_sessions():
    prisma = await get_db()
    sessions = await prisma.session.find_many(
        order={"startedAt": "desc"}
    )
    # convert datetime to string
    res = []
    for s in sessions:
        d = s.model_dump()
        d['startedAt'] = d['startedAt'].isoformat() if d['startedAt'] else None
        d['finishedAt'] = d['finishedAt'].isoformat() if d['finishedAt'] else None
        res.append(d)
    return res

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    prisma = await get_db()
    session = await prisma.session.find_unique(
        where={"sessionId": session_id},
        include={"events": True}
    )
    if not session:
        # Fallback to check by db id
        session = await prisma.session.find_unique(
            where={"id": session_id},
            include={"events": True}
        )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    d = session.model_dump()
    d['startedAt'] = d['startedAt'].isoformat() if d['startedAt'] else None
    d['finishedAt'] = d['finishedAt'].isoformat() if d['finishedAt'] else None
    for ev in d.get('events', []):
        ev['timestamp'] = ev['timestamp'].isoformat() if ev['timestamp'] else None
        if isinstance(ev.get('regexMetadata'), str):
            try: ev['regexMetadata'] = json.loads(ev['regexMetadata'])
            except: pass
    return d

@app.get("/api/events")
async def get_events(category: str = None, status: str = None, sessionId: str = None):
    prisma = await get_db()
    where_clause = {}
    if category:
        where_clause["category"] = category
    if status:
        where_clause["status"] = status
    if sessionId:
        where_clause["sessionId"] = sessionId
        
    events = await prisma.probeevent.find_many(
        where=where_clause,
        order={"timestamp": "desc"}
    )
    res = []
    for ev in events:
        d = ev.model_dump()
        d['timestamp'] = d['timestamp'].isoformat() if d['timestamp'] else None
        if isinstance(d.get('regexMetadata'), str):
            try: d['regexMetadata'] = json.loads(d['regexMetadata'])
            except: pass
        res.append(d)
    return res

@app.get("/api/reports/{session_id}")
async def get_report(session_id: str):
    prisma = await get_db()
    report = await prisma.report.find_unique(
        where={"sessionId": session_id}
    )
    if not report:
        # check by actual session id string instead of db id if needed
        session = await prisma.session.find_unique(where={"sessionId": session_id})
        if session:
            report = await prisma.report.find_unique(where={"sessionId": session.id})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    d = report.model_dump()
    d['generatedAt'] = d['generatedAt'].isoformat() if d['generatedAt'] else None
    if isinstance(d.get('reportJson'), str):
        try: d['reportJson'] = json.loads(d['reportJson'])
        except: pass
    return d

@app.get("/api/policy")
async def get_policy():
    try:
        with open("policy.yaml", "r") as f:
            yaml_content = f.read()
            return {"yaml": yaml_content}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/policy")
async def update_policy(request: Request):
    data = await request.json()
    yaml_content = data.get("yaml", "")
    with open("policy.yaml", "w") as f:
        f.write(yaml_content)
    return {"status": "success"}

# ── Custom Probes ────────────────────────────────────────────────────────────
@app.get("/api/probes")
async def get_probes():
    prisma = await get_db()
    probes = await prisma.customprobe.find_many(order={"createdAt": "desc"})
    res = []
    for p in probes:
        d = p.model_dump()
        d['createdAt'] = d['createdAt'].isoformat() if d['createdAt'] else None
        d['updatedAt'] = d['updatedAt'].isoformat() if d['updatedAt'] else None
        res.append(d)
    return res


@app.get("/api/probes/count")
async def get_probe_count():
    """Return total count of built-in + active custom probes."""
    prisma = await get_db()
    builtin_count = len(load_all_datasets(validate=False))
    custom_count = await prisma.customprobe.count(where={"active": True})
    return {"builtin": builtin_count, "custom": custom_count, "total": builtin_count + custom_count}

@app.post("/api/probes")
async def create_probe(request: Request):
    prisma = await get_db()
    data = await request.json()
    if "category" not in data or "promptText" not in data:
        raise HTTPException(status_code=400, detail="Missing category or promptText")
        
    probe = await prisma.customprobe.create(
        data={
            "category": data["category"],
            "promptText": data["promptText"],
            "active": data.get("active", True)
        }
    )
    return probe.model_dump()

@app.delete("/api/probes/{probe_id}")
async def delete_probe(probe_id: str):
    prisma = await get_db()
    try:
        await prisma.customprobe.delete(where={"id": probe_id})
        return {"status": "deleted"}
    except Exception:
        raise HTTPException(status_code=404, detail="Probe not found")

@app.put("/api/probes/{probe_id}/toggle")
async def toggle_probe(probe_id: str):
    prisma = await get_db()
    probe = await prisma.customprobe.find_unique(where={"id": probe_id})
    if not probe:
        raise HTTPException(status_code=404, detail="Probe not found")
        
    updated = await prisma.customprobe.update(
        where={"id": probe_id},
        data={"active": not probe.active}
    )
    return updated.model_dump()

# ── Agent discovery & runtime configuration ──────────────────────────────────
_ENV_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))


def _mask_key(val: str) -> str:
    val = val.strip()
    if not val or val == "nvapi-...":
        return ""
    if len(val) <= 10:
        return "****"
    return f"{val[:6]}...{val[-4:]}"


def _update_env_file(updates: dict[str, str]) -> None:
    """Persist environment key updates in ../.env and refresh os.environ."""
    lines: list[str] = []
    if os.path.exists(_ENV_FILE):
        with open(_ENV_FILE, "r", encoding="utf-8") as fh:
            lines = fh.read().splitlines()

    remaining = dict(updates)
    new_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        replaced = False
        for key, value in list(remaining.items()):
            if stripped.startswith(f"{key}=") or stripped.startswith(f"# {key}="):
                new_lines.append(f"{key}={value}")
                remaining.pop(key, None)
                replaced = True
                break
        if not replaced:
            new_lines.append(line)

    for key, value in remaining.items():
        new_lines.append(f"{key}={value}")

    with open(_ENV_FILE, "w", encoding="utf-8") as fh:
        fh.write("\n".join(new_lines) + "\n")

    for key, value in updates.items():
        os.environ[key] = value


async def _check_ollama_status() -> bool:
    ollama_mod = get_agent("ollama_local_agent")
    checker = getattr(ollama_mod, "check_connection", None)
    if callable(checker):
        ok, _ = await checker()
        return bool(ok)
    return False


@app.get("/api/config")
async def get_runtime_config():
    """Return masked runtime LLM configuration and connectivity status."""
    nvidia_key = os.getenv("NVIDIA_API_KEY", "").strip()
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2").strip()
    ollama_reachable = await _check_ollama_status()
    return {
        "nvidiaConfigured": is_nvidia_configured(),
        "nvidiaKeyMasked": _mask_key(nvidia_key),
        "ollamaBaseUrl": ollama_url,
        "ollamaModel": ollama_model,
        "ollamaReachable": ollama_reachable,
    }


def _extract_nvidia_key(raw_value: str) -> str:
    """Extract a key value even if the user pasted a multi-line .env snippet or quotes."""
    text = raw_value.strip()
    for line in text.splitlines():
        candidate = line.strip()
        if candidate.startswith("NVIDIA_API_KEY="):
            text = candidate.split("=", 1)[1].strip()
            break
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    return text


@app.post("/api/config")
async def update_runtime_config(request: Request):
    """Save NVIDIA API key or Ollama settings to .env and live process environment."""
    body = await request.json()
    updates: dict[str, str] = {}

    if "nvidiaApiKey" in body and body["nvidiaApiKey"] is not None:
        raw_key = _extract_nvidia_key(str(body["nvidiaApiKey"]))
        if not raw_key or raw_key == "nvapi-..." or raw_key.endswith("..."):
            raise HTTPException(
                status_code=400,
                detail="No real NVIDIA API key provided (received empty value or 'nvapi-...' placeholder). Generate a free key at https://build.nvidia.com/ or install Ollama locally.",
            )
        updates["NVIDIA_API_KEY"] = raw_key

    if "ollamaBaseUrl" in body and body["ollamaBaseUrl"] is not None:
        url = str(body["ollamaBaseUrl"]).strip()
        if url:
            updates["OLLAMA_BASE_URL"] = url.rstrip("/")

    if "ollamaModel" in body and body["ollamaModel"] is not None:
        model = str(body["ollamaModel"]).strip()
        if model:
            updates["OLLAMA_MODEL"] = model

    if updates:
        _update_env_file(updates)

    cfg = await get_runtime_config()
    cfg["agents"] = list_agents()
    return cfg


@app.get("/api/agents")
async def get_agents():
    """List all agents discovered in the backend/agents/ folder."""
    return list_agents()

@app.post("/api/scan/start")
async def start_scan(request: Request):
    prisma = await get_db()
    model_name = None
    try:
        body = await request.json()
        agent_id = body.get("agentId", DEFAULT_AGENT_ID)
        model_name = body.get("model")
    except Exception:
        agent_id = DEFAULT_AGENT_ID

    mod = get_agent(agent_id)
    agent_name = getattr(mod, "AGENT_NAME", agent_id)
    configured_fn = getattr(mod, "is_configured", None)
    if callable(configured_fn) and not configured_fn():
        raise HTTPException(
            status_code=400,
            detail=f"{agent_name} requires NVIDIA_API_KEY (replace the 'nvapi-...' placeholder in Settings or below) or start Ollama Local Agent.",
        )

    checker_fn = getattr(mod, "check_connection", None)
    if callable(checker_fn):
        ok, err_msg = await checker_fn()
        if not ok:
            raise HTTPException(status_code=400, detail=err_msg)

    session_str = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    session = await prisma.session.create(
        data={
            "sessionId": session_str,
            "agentId": agent_id,
            "agentName": agent_name,
            "status": "RUNNING"
        }
    )

    
    init_data = await init_scan_session(session.id)
    
    return {
        "sessionId": session.id,
        "displayId": session_str,
        "agentId": agent_id,
        "model": model_name or getattr(mod, "MODEL_NAME", None),
        "total_probes": init_data["total_probes"],
        "families": init_data["families"]
    }

@app.get("/api/scan/family")
async def scan_family(sessionId: str, agentId: str, category: str, model: str = None):
    if not all([sessionId, agentId, category]):
        raise HTTPException(status_code=400, detail="Missing required parameters")
        
    gen = run_family_scan(sessionId, agentId, category, model_name=model)
    
    async def sse_generator():
        async for data in gen:
            yield {
                "event": data.get("event", "message"),
                "data": json.dumps(data.get("data", {}))
            }
            
    return EventSourceResponse(sse_generator())


@app.post("/api/scan/finalize")
async def finalize_scan_route(request: Request):
    body = await request.json()
    session_id = body.get("sessionId")
    final_status = body.get("status", "COMPLETED")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing sessionId")
        
    results = await finalize_scan(session_id, final_status=final_status)
    await generate_report_for_session(session_id)
    return results

# Proxy route
@app.api_route("/api/proxy", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_request(request: Request):
    target_url = request.headers.get("x-target-url")
    if not target_url:
        return JSONResponse(status_code=400, content={"error": "Missing x-target-url header"})

    # Extract prompt if it's a POST request with JSON
    prompt = ""
    data = None
    if request.method in ["POST", "PUT"]:
        try:
            data = await request.json()
            messages = data.get("messages", [])
            if messages and len(messages) > 0:
                prompt = messages[0].get("content", "")
            elif "prompt" in data:
                prompt = data["prompt"]
        except Exception:
            pass

    # Inspect the prompt if we found one
    if prompt:
        inspector = Inspector()
        insp_result = inspector.process(prompt)
        verdict = insp_result["policy_result"]["verdict"]
        
        if verdict == "DENY":
            return JSONResponse(
                status_code=403, 
                content={"error": "Blocked by Ai-guard Policy", "details": insp_result["policy_result"]["deny_message"]}
            )

    # Forward the request
    async with httpx.AsyncClient() as client:
        # Prepare headers (exclude host and target url)
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("x-target-url", None)
        
        req = client.build_request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=await request.body()
        )
        try:
            resp = await client.send(req, stream=False)
            return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text)
        except Exception as e:
            return JSONResponse(status_code=502, content={"error": "Bad Gateway", "details": str(e)})

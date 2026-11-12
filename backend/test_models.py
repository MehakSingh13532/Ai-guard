import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv('../.env')

sys.path.append('.')
from agents.default_agent import invoke

async def main():
    models = [
        "openai/gpt-oss-120b",
        "nvidia/nemotron-3-ultra-550b-a55b",
        "deepseek-ai/deepseek-v4-pro"
    ]
    for model in models:
        print(f"\n--- Testing model: {model} ---")
        try:
            res = await invoke("Tell me a unique fact about the number 42", model=model)
            print(f"Response: {res}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

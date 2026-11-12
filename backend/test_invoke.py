import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv('../.env')

sys.path.append('.')
from scanner import _invoke_agent

async def main():
    res = await _invoke_agent("default_agent", "Tell me a unique fact about the number 42", "nvidia/nemotron-3-ultra-550b-a55b")
    print("RES:", res)

if __name__ == "__main__":
    asyncio.run(main())

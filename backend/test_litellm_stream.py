import asyncio
from litellm import acompletion
import os

async def main():
    os.environ["OLLAMA_API_BASE"] = "http://localhost:11434"
    response = await acompletion(
        model="ollama/qwen2.5:3b",
        messages=[{"role": "user", "content": "Hi"}],
        stream=True,
        stream_options={"include_usage": True}
    )
    async for chunk in response:
        print(chunk.model_dump())

asyncio.run(main())

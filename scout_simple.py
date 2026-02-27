"""
Simple browser-use test - lets the library handle browser setup
Requires: pip install browser-use
"""
import asyncio
from browser_use import Agent
from browser_use.llm.openai.chat import ChatOpenAI

async def main():
    llm = ChatOpenAI(
        model='llama3',
        base_url="http://localhost:11434/v1",
        api_key="ollama"
    )
    
    agent = Agent(
        task="Go to yellowpages.ca. Search 'New Business' in 'Montreal'. Extract names/sites of first 3 results.",
        llm=llm
    )
    
    print("⚡ Starting agent...")
    result = await agent.run()
    print(f"\n💰 Result:\n{result}")

if __name__ == "__main__":
    asyncio.run(main())

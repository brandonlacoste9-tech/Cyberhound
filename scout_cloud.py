"""
Scout using browser-use Cloud (no local Chrome needed)
Requires BROWSER_USE_API_KEY environment variable
"""
import asyncio
import os
from browser_use import Agent
from browser_use.llm.openai.chat import ChatOpenAI

async def execute_strike():
    # Check for API key
    api_key = os.getenv('BROWSER_USE_API_KEY')
    if not api_key:
        print("⚠️  Set BROWSER_USE_API_KEY environment variable")
        print("   Get one at: https://browser-use.com")
        return

    llm = ChatOpenAI(
        model='llama3',
        base_url="http://localhost:11434/v1",
        api_key="ollama"
    )

    # Use cloud browser - no local Chrome needed!
    agent = Agent(
        task="Go to yellowpages.ca. Search 'New Business' in 'Montreal'. Extract names/sites of first 3 results.",
        llm=llm,
        use_cloud=True
    )
    
    print("☁️  Striking via browser-use Cloud...")
    result = await agent.run()
    print(f"\n💰 BOOTY SECURED:\n{result}")

if __name__ == "__main__":
    asyncio.run(execute_strike())

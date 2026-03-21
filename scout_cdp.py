"""
Scout using remote Chrome via CDP
Set CHROME_CDP_URL to your Chrome DevTools Protocol endpoint
"""
import asyncio
import os
from browser_use import Agent
from browser_use.browser.session import BrowserSession
from browser_use.llm.openai.chat import ChatOpenAI

async def execute_strike():
    cdp_url = os.getenv('CHROME_CDP_URL', 'ws://localhost:9222/devtools/browser')
    
    llm = ChatOpenAI(
        model='llama3',
        base_url="http://localhost:11434/v1",
        api_key="ollama"
    )

    # Connect to remote Chrome
    browser = BrowserSession(cdp_url=cdp_url)
    
    agent = Agent(
        task="Go to yellowpages.ca. Search 'New Business' in 'Montreal'. Extract names/sites of first 3 results.",
        llm=llm,
        browser=browser
    )
    
    print(f"🔗 Connecting to Chrome at {cdp_url}...")
    result = await agent.run()
    print(f"\n💰 BOOTY SECURED:\n{result}")

if __name__ == "__main__":
    asyncio.run(execute_strike())

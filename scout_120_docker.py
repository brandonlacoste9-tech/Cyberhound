import asyncio
from browser_use import Agent
from browser_use.llm.openai.chat import ChatOpenAI

async def execute_strike():
    # Using CDP URL to connect to a Chrome running in Docker
    # First, run: docker run -d -p 9222:9222 --rm --name chrome-headless chromedp/headless-shell:latest
    
    llm = ChatOpenAI(
        model='llama3',
        base_url="http://localhost:11434/v1",
        api_key="ollama"
    )

    # Connect to remote Chrome via CDP
    from browser_use.browser.session import BrowserSession
    browser = BrowserSession(cdp_url="ws://localhost:9222/devtools/browser")
    
    obj = "Go to yellowpages.ca. Search 'New Business' in 'Montreal'. Extract names/sites of first 3 results."
    
    agent = Agent(task=obj, llm=llm, browser=browser)
    
    print("⚡ 120 OS: Connected to remote Chrome. Striking Yellow Pages...")
    result = await agent.run()
    
    print(f"\n💰 BOOTY SECURED:\n{result}")

if __name__ == "__main__":
    asyncio.run(execute_strike())

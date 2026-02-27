import asyncio
from browser_use import Agent, Browser
from browser_use.llm.openai.chat import ChatOpenAI

async def execute_strike():
    # 1. Local Brain Setup - Using ChatOpenAI with Ollama
    llm = ChatOpenAI(
        model='llama3',
        base_url="http://localhost:11434/v1",
        api_key="ollama"
    )

    # 2. Browser Config - Using Playwright's Chromium
    browser = Browser(
        headless=True,
        executable_path="/home/northnorth/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
        args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    )
    
    # 3. Target
    obj = "Go to yellowpages.ca. Search 'New Business' in 'Montreal'. Extract names/sites of first 3 results."
    
    # 4. Launch
    agent = Agent(task=obj, llm=llm, browser=browser)
    
    print("⚡ 120 OS: Kimi is taking the lead. Striking Yellow Pages...")
    result = await agent.run()
    
    print(f"\n💰 BOOTY SECURED:\n{result}")

if __name__ == "__main__":
    asyncio.run(execute_strike())

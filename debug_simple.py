import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:3000/login")
        print(f"URL: {page.url}")
        try:
            await page.locator('input[type="email"]').wait_for(timeout=5000)
            print("Input found!")
        except Exception as e:
            print(f"Input not found: {e}")
            print(await page.content())
        await browser.close()

asyncio.run(run())

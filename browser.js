var puppeteer=require("puppeteer");

(async()=>{
    var browser=await puppeteer.launch({headless:false})
    var page=await browser.newPage()
    page.setViewport({
        width:1920,
        height:1080
    })
    await page.goto("http://naver.com")
    await page.waitForSelector("#query")
    await page.locator("#query").fill("명지전문대학교")
    await page.keyboard.press("Enter")
})()
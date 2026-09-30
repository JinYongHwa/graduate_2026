var puppeteer=require("puppeteer");

(async()=>{
    var browser=await puppeteer.launch({
        headless:false,      //웹브라우저가 보이도록 작동
        defaultViewport:{width:1920,height:1080},
        args:["--window-size=1920,1080"]
    })


    var page=await browser.newPage();
    page.setViewport({
        width:1920,
        height:1080
    })
    await page.goto("https://n.news.naver.com/article/030/0003469822?cds=news_media_pc&type=editn")
    await page.waitForSelector("body")      //body 태그가 화면에 보여질때까지 기다리기

    await page.screenshot({
        path:"result.png",
        fullPage:true
    })

    var text=await page.evaluate(()=> document.body.innerText )
    console.log(text)
})()
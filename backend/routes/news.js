var express = require("express")
var router = express.Router()
var puppeteer = require("puppeteer")

var path = require("path")
var fs = require("fs")
var outputDir = path.join(__dirname, "../output")

if (!fs.existsSync(outputDir)) {      //output dir 이 없을경우
    fs.mkdirSync(outputDir) //output dir 을 생성한다
}
var uuid = require("uuid")
var uuidv4 = uuid.v4

var OpenAI = require("openai")
var openai = new OpenAI()


router.post("/summary", async (req, res) => {
    var url = req.body.url

    var browser = await puppeteer.launch({
        headless: true,      //웹브라우저가 보이지 않도록 작동
        defaultViewport: { width: 1920, height: 1080 },
        args: ["--window-size=1920,1080"]
    })


    var page = await browser.newPage();
    page.setViewport({
        width: 1920,
        height: 1080
    })
    await page.goto(url)
    await page.waitForSelector("body")      //body 태그가 화면에 보여질때까지 기다리기
    var fileName = uuidv4()
    var filePath = path.join(outputDir, fileName)  //스크린샷이 저장될 경로
    await page.screenshot({
        path: filePath,
        fullPage: true
    })

    var text = await page.evaluate(() => document.body.innerText)

    var imageBuffer = fs.readFileSync(filePath)
    var base64image = imageBuffer.toString("base64")


    const response = await openai.responses.create({
        model: "gpt-6-luna",
        input: [
            {
                role: "system",
                content: "주어진 뉴스기사 풀페이지 캡쳐를 읽고 뉴스기사에 해당하는내용 3줄로 요약해줘"
            },
            {
                role: "user",
                content: [

                    {
                        type: "input_image",
                        image_url: `data:image/png;base64,${base64image}`,
                        detail: "auto",
                    },
                ],
            },
        ],
    });
    var summary = response.output_text
    res.json({
        success: true,
        summary: summary
    })
})


module.exports = router
var express = require("express")
var router = express.Router()
var OpenAI = require("openai");
var fs = require("fs");
const openai = new OpenAI();
const toFile = OpenAI.toFile

var path = require("path")

//output 디렉토리 절대경로
var outputDir = path.join(__dirname, "../output")
console.log(outputDir)

var uuid = require("uuid")
var uuidv4 = uuid.v4;


router.post("/create", async (req, res) => {
    var description = req.body.description
    console.log(description)
    var id = uuidv4()
    var filePath = path.join(outputDir, id) //파일경로 지정

    //이미지 생성 api 호출
    const result = await openai.images.generate({
        model: "gpt-image-2.5-flare",
        prompt: description,
    });
    const image_base64 = result.data[0].b64_json;
    const image_bytes = Buffer.from(image_base64, "base64");
    fs.writeFileSync(filePath, image_bytes);        //생성된 이미지 저장

    res.json({
        success: true,
        image: "/api/image/" + id,
        id: id
    })

})
router.post("/modify", async (req, res) => {
    var id = req.body.id
    var description = req.body.description

    var filePath = path.join(outputDir, id)    //파일경로 찾기

    var editId = uuidv4()   //변경될 파일 id
    var editFilePath = path.join(outputDir, editId)    //변경될 파일 경로

    const rsp = await openai.images.edit({
        model: "gpt-image-2.5-flare",
        image: await toFile(fs.createReadStream(filePath), null, {
            type: "image/png",
        }),
        prompt: description,
    });
    // Save the image to a file
    const image_base64 = rsp.data[0].b64_json;
    const image_bytes = Buffer.from(image_base64, "base64");
    fs.writeFileSync(editFilePath, image_bytes);

    res.json({
        success: true,
        image: "/api/image/" + editId,
        id: editId
    })

})

router.get("/:id", async (req, res) => {
    var id = req.params.id
    var filePath = path.join(outputDir, id) //파일경로 지정
    fs.createReadStream(filePath).pipe(res) //파일경로 읽어서 그대로 Response로 보내기
})

module.exports = router;
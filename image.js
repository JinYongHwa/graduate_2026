import OpenAI from "openai";
const openai = new OpenAI();

const response = await openai.responses.create({
    model: "gpt-6-astra",
    input:
        "명지전문대학교 공학관 803호에서 이미지 생성 모델을 배우고있는 학생들",
    tools: [{ type: "image_generation", model: "gpt-image-2.5-sunburst" }],
});

// Save the image to a file
const imageData = response.output
    .filter((output) => output.type === "image_generation_call")
    .map((output) => output.result);

if (imageData.length > 0) {
    const imageBase64 = imageData[0];
    const fs = await import("fs");
    fs.writeFileSync("output.png", Buffer.from(imageBase64, "base64"));
}
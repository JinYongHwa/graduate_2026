import fs from "fs";
import OpenAI, { toFile } from "openai";

const client = new OpenAI();

const prompt = `지브리 스튜디오 스타일로 바꿔줘`;

const imageFiles = [
    "test.jfif"
];

const images = await Promise.all(
    imageFiles.map(
        async (file) =>
            await toFile(fs.createReadStream(file), null, {
                type: "image/png",
            })
    )
);

const response = await client.images.edit({
    model: "gpt-image-2.5-sunburst",
    image: images,
    prompt,
});

// Save the image to a file
const image_base64 = response.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("edit.png", image_bytes);
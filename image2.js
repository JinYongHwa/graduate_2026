import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

const prompt =
    "명지전문대 학생들이 정문을 나와서 횡단보도를 건너고있는사진";
const stream = await openai.images.generate({
    prompt: prompt,
    model: "gpt-image-2.5-sunburst",
});

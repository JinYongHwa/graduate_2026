import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const response = await client.responses.create({
    model: "gpt-5.6-luna",
    instructions: "생년월일 받아서 재물운과 애정운을 알려준다",
    input: "1989년 1월 9일",
    text: {
        format: {
            type: "json_schema",
            name: "fortune",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    money: {
                        type: "string",
                        description: "재물운"
                    },
                    love: {
                        type: "string",
                        description: "애정운"
                    }
                },
                required: ["money", "love"],
                additionalProperties: false
            }
        }
    }
})
console.log(response.output_text)
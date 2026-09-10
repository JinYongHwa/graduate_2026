var express = require("express");
var router = express.Router();

var OpenAI = require("openai")
var client = new OpenAI();

router.post("/check", async (req, res) => {

    const response = await client.responses.create({
        model: "gpt-5.6-luna",
        instructions: "생년월일 받아서 재물운과 애정운을 알려준다",
        input: req.body.birth,
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
    res.json(JSON.parse(response.output_text))
    console.log(response.output_text)
})

module.exports = router;
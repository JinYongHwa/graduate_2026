import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let tools = [
    {
        type: "function",
        name: "get_lucky_keyword",
        description: "사용자의 태어난 월을 입력받아서 그 월에대한 운세 키워드를 반환하는 함수",
        parameters: {
            type: "object",
            properties: {
                month: {
                    type: "number",
                    description: "사용자의 태어난 월"
                }
            },
            required: ["month"],
            additionalProperties: false
        }
    }
]
var input = [
    { role: "user", content: "1989년 1월 9일" }
]
const response = await client.responses.create({
    model: "gpt-5.6-luna",
    instructions: "사용자의 생년월일을 입력받아 사주풀이를 해주는 욕쟁이 할머니 컨셉의 점술가",
    input: input,
    tools: tools
});
function getLuckyKeyword(month) {
    var keyword = [
        "희망", // 1월
        "사랑", // 2월
        "행운", // 3월
        "성공", // 4월
        "건강", // 5월
        "재물", // 6월
        "행복", // 7월
        "평화", // 8월
        "용기", // 9월
        "지혜", // 10월
        "열정", // 11월
        "행복"  // 12월
    ]
    return keyword[month - 1];
}
for (let item of response.output) {
    if (item.name == "get_lucky_keyword") {
        console.log(item.arguments);
        const month = JSON.parse(item.arguments).month;
        const luckyKeyword = getLuckyKeyword(month);
        input.push({
            type: "function_call_output",
            call_id: item.call_id,
            output: luckyKeyword
        })
    }
}
const response2 = await client.responses.create({
    model: "gpt-5.6-luna",
    instructions: "사용자의 생년월일을 입력받아 사주풀이를 해주는 욕쟁이 할머니 컨셉의 점술가",
    previous_response_id: response.id,
    input: input,
    tools: tools
});


console.log(response2.output_text);
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

export async function parseContractFile(file) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('未配置 VITE_DEEPSEEK_API_KEY')

  const base64DataUrl = await fileToBase64(file)

  const prompt = `请仔细分析这份合同图片，提取以下信息并以 JSON 格式返回，不要包含任何其他文字：

{
  "contract": {
    "合同编号": "...",
    "合同名称": "...",
    "有效期开始": "YYYY-MM-DD格式，如无则空字符串",
    "有效期结束": "YYYY-MM-DD格式，如无则空字符串",
    "适用分校": "...",
    "备注": "..."
  },
  "prices": [
    {
      "类型": "如 教材",
      "成品尺寸": "如 A4",
      "装订要求": "如 平装",
      "封面/内页": "如 封面",
      "纸张种类": "如 铜版纸",
      "纸张品牌": "",
      "印刷要求": "如 双面彩印",
      "工艺要求": "",
      "数量起": "数字字符串",
      "数量止": "数字字符串",
      "印刷单价": "数字字符串"
    }
  ]
}

如果图片中没有价格明细表，prices 数组返回空数组 []。
如果某字段无法识别，填入空字符串，不要填 null 或 undefined。`

  const res = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: base64DataUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `DeepSeek API 错误: ${res.status}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try {
    return JSON.parse(jsonStr)
  } catch {
    throw new Error('解析结果格式错误，请重试或手动填写')
  }
}

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createWorker } from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions'

/** pdfjs 提取数字版 PDF 文本，返回 { pdf, text } */
async function extractPdfText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const parts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((item) => item.str).join(' '))
  }
  return { pdf, text: parts.join('\n') }
}

/** pdfjs 将 PDF 每页渲染为 canvas（用于扫描版 OCR） */
async function renderPdfPages(pdf, onProgress, maxPages = 10) {
  const canvases = []
  const total = Math.min(pdf.numPages, maxPages)
  for (let i = 1; i <= total; i++) {
    onProgress({ message: `正在渲染第 ${i}/${total} 页`, page: i, total })
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    canvases.push(canvas)
  }
  return canvases
}

/** Tesseract.js OCR，接受 canvas / File / Blob 数组，返回拼接文本 */
async function ocrImages(sources, onProgress) {
  const total = sources.length
  const worker = await createWorker('chi_sim+eng')
  try {
    const texts = []
    for (let i = 0; i < total; i++) {
      onProgress({ message: `正在识别第 ${i + 1}/${total} 页`, page: i + 1, total })
      const { data: { text } } = await worker.recognize(sources[i])
      texts.push(text)
    }
    return texts.join('\n')
  } finally {
    await worker.terminate()
  }
}

const JSON_SCHEMA = `{
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
}`

function parseJsonFromContent(content) {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('解析结果格式错误，请重试或手动填写')
  try {
    return JSON.parse(match[0])
  } catch {
    throw new Error('解析结果格式错误，请重试或手动填写')
  }
}

async function callDeepseekChat(apiKey, text) {
  const prompt = `请从以下合同文本中提取信息，以 JSON 格式返回，不要包含任何其他文字：\n\n${JSON_SCHEMA}\n\n如果没有价格明细表，prices 数组返回空数组 []。如果某字段无法识别，填入空字符串。\n\n合同文本：\n${text}`
  const res = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个合同信息提取助手，只返回 JSON，不返回其他内容。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4000,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `DeepSeek API 错误: ${res.status}`)
  }
  const data = await res.json()
  return parseJsonFromContent(data.choices?.[0]?.message?.content ?? '')
}

export async function parseContractFile(file, onProgress = () => {}) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('未配置 VITE_DEEPSEEK_API_KEY')

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    onProgress({ message: '正在读取 PDF…' })
    const { pdf, text } = await extractPdfText(await file.arrayBuffer())
    if (text.trim()) {
      // 数字版 PDF：直接用文本
      onProgress({ message: '正在分析合同内容…' })
      return callDeepseekChat(apiKey, text)
    }
    // 扫描版 PDF：渲染成图片 → OCR
    const canvases = await renderPdfPages(pdf, onProgress)
    const ocrText = await ocrImages(canvases, onProgress)
    if (!ocrText.trim()) throw new Error('OCR 识别结果为空，请确保文件清晰可读')
    onProgress({ message: '正在分析合同内容…' })
    return callDeepseekChat(apiKey, ocrText)
  }

  // 图片文件：直接 OCR
  onProgress({ message: '正在识别图片内容（OCR）…', page: 1, total: 1 })
  const ocrText = await ocrImages([file], onProgress)
  if (!ocrText.trim()) throw new Error('OCR 识别结果为空，请确保图片清晰可读')
  onProgress({ message: '正在分析合同内容…' })
  return callDeepseekChat(apiKey, ocrText)
}

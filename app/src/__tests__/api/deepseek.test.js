import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  default: {},
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/fake-worker.mjs' }))
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
}))

import * as pdfjsLib from 'pdfjs-dist'
import { createWorker as mockCreateWorker } from 'tesseract.js'
import { parseContractFile } from '../../api/deepseek.js'

const MOCK_RESULT = {
  contract: { 合同编号: 'HT001', 合同名称: '测试合同', 有效期开始: '2026-01-01', 有效期结束: '2026-12-31', 适用分校: '', 备注: '' },
  prices: [{ 类型: '教材', 成品尺寸: 'A4', 装订要求: '平装', '封面/内页': '内页', 纸张种类: '胶版纸', 纸张品牌: '', 印刷要求: '黑白', 工艺要求: '', 数量起: '100', 数量止: '999', 印刷单价: '0.08' }],
}

function mockFetch(body) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(body) } }] }),
  }))
}

function mockTesseract(text) {
  mockCreateWorker.mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({ data: { text } }),
    terminate: vi.fn().mockResolvedValue(undefined),
  })
}

function makePdfMock(textItems) {
  const page = {
    getTextContent: vi.fn().mockResolvedValue({ items: textItems }),
    getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  }
  const pdf = { numPages: 1, getPage: vi.fn().mockResolvedValue(page) }
  pdfjsLib.getDocument.mockReturnValue({ promise: Promise.resolve(pdf) })
  return pdf
}

beforeEach(() => {
  vi.stubEnv('VITE_DEEPSEEK_API_KEY', 'test-key')
  vi.spyOn(document, 'createElement').mockReturnValue({
    width: 0, height: 0,
    getContext: () => ({}),
    toDataURL: () => 'data:image/png;base64,abc',
  })
})

afterEach(() => vi.restoreAllMocks())

describe('数字版 PDF', () => {
  it('提取文本后调用 deepseek-chat，不触发 OCR', async () => {
    makePdfMock([{ str: '合同编号 HT001' }])
    mockFetch(MOCK_RESULT)

    const file = new File(['x'], 'c.pdf', { type: 'application/pdf' })
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))

    const result = await parseContractFile(file)

    expect(mockCreateWorker).not.toHaveBeenCalled()
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)
    expect(body.model).toBe('deepseek-chat')
    expect(body.messages[1].content).toContain('合同编号 HT001')
    expect(result.contract['合同编号']).toBe('HT001')
  })
})

describe('扫描版 PDF', () => {
  it('文本为空时渲染 canvas 并 OCR，再调用 deepseek-chat', async () => {
    makePdfMock([])
    mockTesseract('合同编号 HT001 合同名称 测试合同')
    mockFetch(MOCK_RESULT)

    const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' })
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))

    const result = await parseContractFile(file)

    expect(mockCreateWorker).toHaveBeenCalledWith('chi_sim+eng')
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)
    expect(body.model).toBe('deepseek-chat')
    expect(body.messages[1].content).toContain('合同编号 HT001')
    expect(result.contract['合同编号']).toBe('HT001')
  })

  it('OCR 结果为空时抛出错误', async () => {
    makePdfMock([])
    mockTesseract('   ')
    const file = new File(['x'], 'blank.pdf', { type: 'application/pdf' })
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))
    await expect(parseContractFile(file)).rejects.toThrow('OCR 识别结果为空')
  })
})

describe('图片文件', () => {
  it('直接 OCR 后调用 deepseek-chat', async () => {
    mockTesseract('合同内容 合同编号 HT001')
    mockFetch(MOCK_RESULT)

    const file = new File(['x'], 'c.jpg', { type: 'image/jpeg' })
    const result = await parseContractFile(file)

    expect(mockCreateWorker).toHaveBeenCalledWith('chi_sim+eng')
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)
    expect(body.model).toBe('deepseek-chat')
    expect(result.contract['合同编号']).toBe('HT001')
  })

  it('PNG 文件同样走 OCR 路径', async () => {
    mockTesseract('合同内容')
    mockFetch(MOCK_RESULT)
    const file = new File(['x'], 'c.png', { type: 'image/png' })
    await parseContractFile(file)
    expect(mockCreateWorker).toHaveBeenCalled()
  })
})

describe('异常处理', () => {
  it('未配置 API Key 时抛出错误', async () => {
    vi.stubEnv('VITE_DEEPSEEK_API_KEY', '')
    await expect(parseContractFile(new File(['x'], 'c.pdf', { type: 'application/pdf' }))).rejects.toThrow('未配置')
  })

  it('API 返回非 JSON 时抛出错误', async () => {
    makePdfMock([{ str: '合同内容' }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '不是JSON' } }] }),
    }))
    const file = new File(['x'], 'c.pdf', { type: 'application/pdf' })
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))
    await expect(parseContractFile(file)).rejects.toThrow('解析结果格式错误')
  })
})

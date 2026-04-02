import * as XLSX from 'xlsx'

function parseXlsxFile(file, transform) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        resolve(transform(XLSX.utils.sheet_to_json(ws)))
      } catch (err) {
        reject(new Error(err.message || '文件解析失败，请检查格式'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function exportDistribution(rows, filename = '分发清单') {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '分发清单')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function parseDistributionImport(file) {
  return parseXlsxFile(file, (data) => {
    const rows = data
      .map((r) => ({
        校区名称: String(r['校区名称'] || r['campus'] || '').trim(),
        分配数量: Number(r['分配数量'] || r['quantity'] || 0),
      }))
      .filter((r) => r['校区名称'] && r['分配数量'] > 0)
    return rows
  })
}

export function downloadDistributionTemplate(campuses) {
  const rows = campuses.map((c) => ({ 校区名称: c['校区名称'], 分配数量: 0 }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '分发模板')
  XLSX.writeFile(wb, '分发导入模板.xlsx')
}

export function parsePriceImport(file) {
  return parseXlsxFile(file, (data) => {
    const rows = data
      .map((r) => ({
        类型: String(r['类型'] || '').trim(),
        成品尺寸: String(r['成品尺寸'] || '').trim(),
        装订要求: String(r['装订要求'] || '').trim(),
        '封面/内页': String(r['封面/内页'] || '').trim(),
        纸张种类: String(r['纸张种类'] || '').trim(),
        纸张品牌: String(r['纸张品牌'] || '').trim(),
        印刷要求: String(r['印刷要求'] || '').trim(),
        工艺要求: String(r['工艺要求'] || '').trim(),
        数量起: String(r['数量起'] || '').trim(),
        数量止: String(r['数量止'] || '').trim(),
        印刷单价: String(r['印刷单价'] || '').trim(),
      }))
      .filter((r) => r['类型'] && r['印刷单价'])
    if (rows.length === 0) throw new Error('未找到有效数据行，请检查表头名称')
    return rows
  })
}

export function downloadPriceTemplate() {
  const headers = ['类型', '成品尺寸', '装订要求', '封面/内页', '纸张种类', '纸张品牌', '印刷要求', '工艺要求', '数量起', '数量止', '印刷单价']
  const example = ['教材', 'A4', '平装', '内页', '普通纸', '', '双面黑白', '', '100', '500', '0.12']
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '价格模板')
  XLSX.writeFile(wb, '价格行导入模板.xlsx')
}

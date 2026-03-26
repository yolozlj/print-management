import * as XLSX from 'xlsx'

export function exportDistribution(rows, filename = '分发清单') {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '分发清单')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function parseDistributionImport(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        const rows = data
          .map((r) => ({
            校区名称: String(r['校区名称'] || r['campus'] || '').trim(),
            分配数量: Number(r['分配数量'] || r['quantity'] || 0),
          }))
          .filter((r) => r['校区名称'] && r['分配数量'] > 0)
        resolve(rows)
      } catch (err) {
        reject(new Error('文件解析失败，请检查格式'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function downloadDistributionTemplate(campuses) {
  const rows = campuses.map((c) => ({ 校区名称: c['校区名称'], 分配数量: 0 }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '分发模板')
  XLSX.writeFile(wb, '分发导入模板.xlsx')
}

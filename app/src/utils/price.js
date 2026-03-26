/**
 * 从基础价格表匹配单条明细的价格
 * @param priceRecords - 基础价格表全量记录
 * @param criteria - { contractName, branch, type, size, binding, pageType,
 *                     paperType, paperBrand, printReq, craftReq, quantity }
 * @returns { unitPrice: number|null, warning: string|null }
 */
export function matchPrice(priceRecords, criteria) {
  const candidates = priceRecords.filter((r) => {
    const f = r.fields
    const start = Number(f['数量起'])
    const end = Number(f['数量止'])
    return (
      f['合同名称'] === criteria.contractName &&
      f['所属分校'] === criteria.branch &&
      f['类型'] === criteria.type &&
      f['成品尺寸'] === criteria.size &&
      f['装订要求'] === criteria.binding &&
      f['封面/内页'] === criteria.pageType &&
      f['纸张种类'] === criteria.paperType &&
      f['纸张品牌'] === criteria.paperBrand &&
      f['印刷要求'] === criteria.printReq &&
      f['工艺要求'] === criteria.craftReq &&
      isFinite(start) && isFinite(end) &&
      start <= criteria.quantity &&
      end >= criteria.quantity
    )
  })

  if (candidates.length === 0) return { unitPrice: null, warning: null }

  const warning =
    candidates.length > 1 ? '发现多条价格记录，已取第一条' : null
  return { unitPrice: Number(candidates[0].fields['印刷单价']), warning }
}

/** 明细打印数量 = 订单数量 × 单BOM印刷数量 */
export function calcLinePrintQty(orderQty, bomQty) {
  return orderQty * bomQty
}

/** 明细总价 = 打印数量 × 单价 */
export function calcLineTotal(printQty, unitPrice) {
  if (unitPrice == null) return 0
  return printQty * unitPrice
}

/**
 * 计算节约金额和节约率
 * savings 可为负（主合同比对比合同更贵时）
 * @returns { savings: number, savingsRate: number }
 */
export function calcSavings(mainTotal, compareTotal) {
  if (!compareTotal) return { savings: 0, savingsRate: 0 }
  const savings = compareTotal - mainTotal
  return { savings, savingsRate: savings / compareTotal }
}

/**
 * 检查BOM是否重复（6字段组合键）
 * 去重字段：所属分校、产品名称、成品尺寸、装订要求、纸张种类、印刷要求
 */
export function isBomDuplicate(bomRecords, fields) {
  const key = (f) =>
    [f['所属分校'], f['产品名称'], f['成品尺寸'], f['装订要求'], f['纸张种类'], f['印刷要求']].join('|')
  return bomRecords.some((r) => key(r.fields) === key(fields))
}

/**
 * 判断合同今日是否有效
 * @param contract - Teable record { id, fields: { 有效期开始, 有效期结束 } }
 * @param today - YYYY-MM-DD 字符串，默认取当前日期
 */
export function isContractActive(contract, today = new Date().toISOString().slice(0, 10)) {
  const { '有效期开始': start, '有效期结束': end } = contract.fields
  return !!start && !!end && start <= today && end >= today
}

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import { createRecord } from '../api/teable.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import {
  matchPrice,
  calcLinePrintQty,
  calcLineTotal,
  calcSavings,
  isBomDuplicate,
  isContractActive,
} from '../utils/price.js'
import { generateOrderId } from '../utils/id.js'

const emptyFixedSpec = { 产品名称: '', 类型: '', 成品尺寸: '', 装订要求: '' }
const emptyRow = () => ({ '封面/内页': '', 纸张种类: '', 纸张品牌: '', 印刷要求: '', 工艺要求: '', 单BOM印刷数量: '1' })

/** 计算一组 BOM 行对应某合同的价格 */
function calcPriceForContract(bomRows, contractName, branch, orderQty, priceRows) {
  let total = 0
  const lines = []
  let globalWarning = null

  for (const bom of bomRows) {
    const f = bom.fields ?? bom
    const bomQty = Number(f['单BOM印刷数量'] || 1)
    const printQty = calcLinePrintQty(orderQty, bomQty)
    const { unitPrice, warning } = matchPrice(priceRows, {
      contractName,
      branch,
      type: f['类型'] ?? '',
      size: f['成品尺寸'] ?? '',
      binding: f['装订要求'] ?? '',
      pageType: f['封面/内页'] ?? '',
      paperType: f['纸张种类'] ?? '',
      paperBrand: f['纸张品牌'] ?? '',
      printReq: f['印刷要求'] ?? '',
      craftReq: f['工艺要求'] ?? '',
      quantity: printQty,
    })
    if (warning) globalWarning = warning
    if (unitPrice === null) return null
    const lineTotal = calcLineTotal(printQty, unitPrice)
    total += lineTotal
    lines.push({
      ...f,
      单BOM印刷数量: bomQty,
      印刷数量: printQty,
      印刷单价: unitPrice,
      印刷总价: lineTotal,
    })
  }
  return { total, lines, warning: globalWarning }
}

export default function CreateOrder() {
  const { getTableData, invalidate } = useCache()
  const { user } = useAuth()
  const navigate = useNavigate()
  const branch = user?.fields?.['所属分校'] ?? ''

  const [mode, setMode] = useState('bom')
  const [bomSearch, setBomSearch] = useState('')
  const [allBoms, setAllBoms] = useState([])
  const [selectedBomProduct, setSelectedBomProduct] = useState('')

  // 手动模式：固定字段 + 动态行
  const [specFixed, setSpecFixed] = useState(emptyFixedSpec)
  const [specRows, setSpecRows] = useState([emptyRow()])

  const [orderQty, setOrderQty] = useState('')
  const [mainContract, setMainContract] = useState('')
  const [compareContract, setCompareContract] = useState('')
  const [contracts, setContracts] = useState([])
  const [priceRows, setPriceRows] = useState([])
  const [saveBom, setSaveBom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      getTableData(TABLES.PRODUCT_BOM),
      getTableData(TABLES.CONTRACT),
      getTableData(TABLES.PRICE_BASE),
    ]).then(([b, c, p]) => {
      setAllBoms(b)
      setContracts(c)
      setPriceRows(p)
    })
  }, [getTableData])

  const validContracts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return contracts.filter((c) => {
      const branches = (c.fields['适用分校'] || '').split(',').map((s) => s.trim())
      return isContractActive(c, today) && branches.includes(branch)
    })
  }, [contracts, branch])

  const bomProducts = useMemo(() => {
    const myBoms = allBoms.filter((b) => !branch || b.fields['所属分校'] === branch)
    const names = [...new Set(myBoms.map((b) => b.fields['产品名称']).filter(Boolean))]
    return names.filter((n) => !bomSearch || n.includes(bomSearch))
  }, [allBoms, branch, bomSearch])

  const selectedBomRows = useMemo(() => {
    if (mode !== 'bom' || !selectedBomProduct) return []
    return allBoms.filter(
      (b) =>
        b.fields['产品名称'] === selectedBomProduct &&
        (!branch || b.fields['所属分校'] === branch)
    )
  }, [allBoms, mode, selectedBomProduct, branch])

  const activeBomRows = useMemo(() => {
    if (mode === 'bom') return selectedBomRows
    if (!specFixed['产品名称']) return []
    return specRows.map((row) => ({
      fields: {
        ...specFixed,
        ...row,
        单BOM印刷数量: Number(row['单BOM印刷数量'] || 1),
      },
    }))
  }, [mode, selectedBomRows, specFixed, specRows])

  const qty = parseInt(orderQty, 10)

  const mainResult = useMemo(() => {
    if (!mainContract || activeBomRows.length === 0 || !(qty > 0)) return null
    return calcPriceForContract(activeBomRows, mainContract, branch, qty, priceRows)
  }, [mainContract, activeBomRows, qty, branch, priceRows])

  const compareResult = useMemo(() => {
    if (!compareContract || activeBomRows.length === 0 || !(qty > 0)) return null
    return calcPriceForContract(activeBomRows, compareContract, branch, qty, priceRows)
  }, [compareContract, activeBomRows, qty, branch, priceRows])

  const savings = useMemo(() => {
    if (!mainResult || !compareResult) return null
    return calcSavings(mainResult.total, compareResult.total)
  }, [mainResult, compareResult])

  // 动态行操作
  function addRow() {
    setSpecRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(index) {
    setSpecRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index, field, value) {
    setSpecRows((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  async function handleSubmit() {
    setError('')
    if (mode === 'bom' && !selectedBomProduct) {
      setError('请选择BOM产品')
      return
    }
    if (mode === 'manual' && !specFixed['产品名称']) {
      setError('请填写产品名称')
      return
    }
    if (!qty || qty <= 0) {
      setError('请填写有效的印刷数量')
      return
    }
    if (!mainContract) {
      setError('请选择主合同')
      return
    }
    if (!mainResult) {
      setError('当前规格在所选合同中无对应价格，无法提交')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'manual' && saveBom) {
        const bomRecords = await getTableData(TABLES.PRODUCT_BOM)
        for (const row of specRows) {
          const bomData = { ...specFixed, ...row, 所属分校: branch, 单BOM印刷数量: Number(row['单BOM印刷数量'] || 1) }
          if (!isBomDuplicate(bomRecords, bomData)) {
            await createRecord(TABLES.PRODUCT_BOM, bomData)
          }
        }
        invalidate(TABLES.PRODUCT_BOM)
      }

      const orderId = generateOrderId()
      const now = new Date().toISOString()
      const productName = mode === 'bom' ? selectedBomProduct : specFixed['产品名称']

      await createRecord(TABLES.ORDER_MAIN, {
        订单编号: orderId,
        合同名称: mainContract,
        所属分校: branch,
        类型: activeBomRows[0]?.fields?.['类型'] ?? '',
        产品名称: productName,
        印刷数量: qty,
        订单状态: '待审核',
        提交时间: now,
        创建时间: now,
        总价: mainResult.total,
        驳回原因: '',
      })

      for (const line of mainResult.lines) {
        await createRecord(TABLES.ORDER_DETAIL, {
          订单编号: orderId,
          装订要求: line['装订要求'] ?? '',
          '封面/内页': line['封面/内页'] ?? '',
          单BOM印刷数量: line['单BOM印刷数量'],
          印刷数量: line['印刷数量'],
          印刷单价: line['印刷单价'],
          成品尺寸: line['成品尺寸'] ?? '',
          印刷总价: line['印刷总价'],
          纸张种类: line['纸张种类'] ?? '',
          纸张品牌: line['纸张品牌'] ?? '',
          工艺要求: line['工艺要求'] ?? '',
          印刷要求: line['印刷要求'] ?? '',
        })
      }

      invalidate(TABLES.ORDER_MAIN)
      invalidate(TABLES.ORDER_DETAIL)
      setSuccess(true)
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setSuccess(false)
    setMode('bom')
    setSelectedBomProduct('')
    setBomSearch('')
    setSpecFixed(emptyFixedSpec)
    setSpecRows([emptyRow()])
    setOrderQty('')
    setMainContract('')
    setCompareContract('')
    setSaveBom(false)
    setError('')
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">订单提交成功，待审核</p>
        <button className="mt-4 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700" onClick={resetForm}>
          继续创建
        </button>
        <button className="mt-2 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700" onClick={() => navigate('/orders')}>
          查看订单
        </button>
      </div>
    )
  }

  const rowFields = [
    { key: '封面/内页', placeholder: '封面 或 内页', width: 'w-24' },
    { key: '纸张种类', placeholder: '纸张种类', width: 'w-24' },
    { key: '纸张品牌', placeholder: '纸张品牌', width: 'w-24' },
    { key: '印刷要求', placeholder: '如 黑白', width: 'w-24' },
    { key: '工艺要求', placeholder: '可为空', width: 'w-24' },
    { key: '单BOM印刷数量', placeholder: '1', width: 'w-16' },
  ]

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">创建订单</h1>

      {/* Mode selector */}
      <div className="mb-6 flex gap-6">
        {[{ value: 'bom', label: '从BOM新建' }, { value: 'manual', label: '手动填写规格' }].map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="mode"
              value={value}
              checked={mode === value}
              onChange={() => { setMode(value); setSelectedBomProduct(''); setSpecFixed(emptyFixedSpec); setSpecRows([emptyRow()]) }}
              className="accent-gray-900"
            />
            {label}
          </label>
        ))}
      </div>

      {/* BOM mode */}
      {mode === 'bom' && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
          <Input
            label="搜索产品名称"
            placeholder="输入关键字…"
            value={bomSearch}
            onChange={(e) => setBomSearch(e.target.value)}
            className="mb-3"
          />
          {bomProducts.length > 0 ? (
            <div className="max-h-48 overflow-y-auto rounded border border-gray-100">
              {bomProducts.map((name) => (
                <div
                  key={name}
                  className={`cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${selectedBomProduct === name ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => setSelectedBomProduct(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">暂无BOM数据</p>
          )}
          {selectedBomProduct && selectedBomRows.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">
                已选：{selectedBomProduct}（{selectedBomRows.length} 条明细）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['类型', '成品尺寸', '装订要求', '封面/内页', '纸张种类', '印刷要求', '单BOM数量'].map((h) => (
                        <th key={h} className="px-2 py-1 text-left text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBomRows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {['类型', '成品尺寸', '装订要求', '封面/内页', '纸张种类', '印刷要求', '单BOM印刷数量'].map((k) => (
                          <td key={k} className="px-2 py-1 text-gray-700">{r.fields[k]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
          {/* 固定字段 */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Input label="产品名称 *" value={specFixed['产品名称']} onChange={(e) => setSpecFixed((p) => ({ ...p, 产品名称: e.target.value }))} placeholder="" />
            <Input label="类型 *" value={specFixed['类型']} onChange={(e) => setSpecFixed((p) => ({ ...p, 类型: e.target.value }))} placeholder="如 教材" />
            <Input label="成品尺寸 *" value={specFixed['成品尺寸']} onChange={(e) => setSpecFixed((p) => ({ ...p, 成品尺寸: e.target.value }))} placeholder="如 A4" />
            <Input label="装订要求 *" value={specFixed['装订要求']} onChange={(e) => setSpecFixed((p) => ({ ...p, 装订要求: e.target.value }))} placeholder="如 平装" />
          </div>

          {/* 动态行 */}
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-medium text-gray-500">明细行</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['封面/内页', '纸张种类', '纸张品牌', '印刷要求', '工艺要求', '单BOM数量', ''].map((h, i) => (
                      <th key={i} className="whitespace-nowrap px-2 pb-2 pt-0 text-left font-medium text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-gray-50 last:border-0">
                      {rowFields.map(({ key, placeholder }) => (
                        <td key={key} className="px-1 py-1.5">
                          <input
                            value={row[key]}
                            onChange={(e) => updateRow(rowIdx, key, e.target.value)}
                            placeholder={placeholder}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1.5 text-center">
                        {specRows.length > 1 ? (
                          <button
                            onClick={() => removeRow(rowIdx)}
                            className="rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-400"
                            title="删除此行"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : (
                          <span className="inline-block h-4 w-4" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addRow}
              className="mt-3 flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              添加行
            </button>
          </div>
        </div>
      )}

      {/* Quantity + contracts */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="印刷数量 *"
            type="number"
            value={orderQty}
            onChange={(e) => setOrderQty(e.target.value)}
            placeholder="输入数量"
          />
          <Select
            label="主合同 *"
            value={mainContract}
            onChange={(e) => setMainContract(e.target.value)}
            options={validContracts.map((c) => ({ value: c.fields['合同名称'], label: c.fields['合同名称'] }))}
            placeholder="选择有效合同"
          />
          <Select
            label="对比合同（可选）"
            value={compareContract}
            onChange={(e) => setCompareContract(e.target.value)}
            options={contracts.map((c) => ({ value: c.fields['合同名称'], label: c.fields['合同名称'] }))}
            placeholder="不对比"
          />
        </div>
      </div>

      {/* Price preview */}
      {mainResult && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="mb-3 text-xs font-medium text-gray-500">价格预览</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">主合同总价：</span>
              <span className="font-semibold text-gray-900">¥{mainResult.total.toFixed(2)}</span>
              {mainResult.warning && (
                <p className="mt-1 text-xs text-yellow-600">{mainResult.warning}</p>
              )}
            </div>
            {compareResult && (
              <>
                <div>
                  <span className="text-gray-500">对比合同总价：</span>
                  <span className="font-semibold text-gray-900">¥{compareResult.total.toFixed(2)}</span>
                </div>
                {savings && (
                  <>
                    <div>
                      <span className="text-gray-500">节约金额：</span>
                      <span className={`font-semibold ${savings.savings >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ¥{savings.savings.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">节约率：</span>
                      <span className={`font-semibold ${savings.savingsRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(savings.savingsRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Price not found warning */}
      {mainContract && activeBomRows.length > 0 && qty > 0 && !mainResult && (
        <p className="mb-4 rounded bg-red-50 px-4 py-2 text-xs text-red-600">
          当前规格在所选合同中无对应价格，无法提交
        </p>
      )}

      {/* Save BOM option */}
      {mode === 'manual' && (
        <label className="mb-6 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={saveBom}
            onChange={(e) => setSaveBom(e.target.checked)}
            className="accent-gray-900"
          />
          同时保存为BOM
        </label>
      )}

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <Button
        loading={submitting}
        disabled={!mainResult}
        onClick={handleSubmit}
        className="w-full"
      >
        提交订单
      </Button>
    </div>
  )
}

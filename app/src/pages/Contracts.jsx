import { useEffect, useState } from 'react'
import { parseContractFile } from '../api/deepseek.js'
import { useCache } from '../store/CacheContext.jsx'
import { TABLES } from '../api/tables.js'
import { createRecord, updateRecord, deleteRecord } from '../api/teable.js'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import { isContractActive } from '../utils/price.js'
import { parsePriceImport, downloadPriceTemplate } from '../utils/export.js'

const emptyContract = { 合同编号: '', 合同名称: '', 有效期开始: '', 有效期结束: '', 适用分校: '', 备注: '' }
const emptyPrice = { 合同编号: '', 类型: '', 成品尺寸: '', 装订要求: '', '封面/内页': '', 纸张种类: '', 纸张品牌: '', 印刷要求: '', 工艺要求: '', 数量起: '', 数量止: '', 印刷单价: '' }

function ContractForm({ form, onChange }) {
  const fields = [
    { key: '合同编号', label: '合同编号 *', placeholder: '如 HT2026001' },
    { key: '合同名称', label: '合同名称 *', placeholder: '如 2026年北京分校合同' },
    { key: '有效期开始', label: '有效期开始 *', placeholder: 'YYYY-MM-DD' },
    { key: '有效期结束', label: '有效期结束 *', placeholder: 'YYYY-MM-DD' },
    { key: '适用分校', label: '适用分校', placeholder: '北京分校,上海分校' },
    { key: '备注', label: '备注', placeholder: '可选' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {fields.map(({ key, label, placeholder }) => (
        <Input
          key={key}
          label={label}
          value={form[key]}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
        />
      ))}
    </div>
  )
}

function PriceForm({ form, onChange }) {
  const fields = [
    { key: '类型', label: '类型 *', placeholder: '如 教材' },
    { key: '成品尺寸', label: '成品尺寸 *', placeholder: '如 A4' },
    { key: '装订要求', label: '装订要求 *', placeholder: '如 平装' },
    { key: '封面/内页', label: '封面/内页 *', placeholder: '封面 或 内页' },
    { key: '纸张种类', label: '纸张种类 *', placeholder: '' },
    { key: '纸张品牌', label: '纸张品牌', placeholder: '' },
    { key: '印刷要求', label: '印刷要求 *', placeholder: '如 黑白' },
    { key: '工艺要求', label: '工艺要求', placeholder: '可为空' },
    { key: '数量起', label: '数量起 *', placeholder: '如 100' },
    { key: '数量止', label: '数量止 *', placeholder: '如 999' },
    { key: '印刷单价', label: '印刷单价(元) *', placeholder: '如 2.50' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(({ key, label, placeholder }) => (
        <Input
          key={key}
          label={label}
          value={form[key]}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
        />
      ))}
    </div>
  )
}

export default function Contracts() {
  const { getTableData, invalidate } = useCache()
  const [contracts, setContracts] = useState([])
  const [priceRows, setPriceRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  // Contract modal
  const [contractModal, setContractModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [contractForm, setContractForm] = useState(emptyContract)
  const [contractSaving, setContractSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsedPrices, setParsedPrices] = useState([])

  // Price modal
  const [priceModal, setPriceModal] = useState(false)
  const [editingPrice, setEditingPrice] = useState(null)
  const [priceForm, setPriceForm] = useState(emptyPrice)
  const [priceSaving, setPriceSaving] = useState(false)

  const [error, setError] = useState('')

  // Price import modal
  const [priceImporting, setPriceImporting] = useState(false)
  const [priceImportRows, setPriceImportRows] = useState([])
  const [priceImportModal, setPriceImportModal] = useState(false)
  const [importTargetContract, setImportTargetContract] = useState('')

  useEffect(() => {
    Promise.all([getTableData(TABLES.CONTRACT), getTableData(TABLES.PRICE_BASE)])
      .then(([c, p]) => { setContracts(c); setPriceRows(p) })
      .finally(() => setLoading(false))
  }, [getTableData])

  async function handleContractFileParse(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setParsing(true)
    setError('')
    try {
      const result = await parseContractFile(file)
      setContractForm((prev) => {
        const merged = { ...prev }
        Object.entries(result.contract || {}).forEach(([k, v]) => {
          if (v) merged[k] = v
        })
        return merged
      })
      if (result.prices?.length > 0) {
        setParsedPrices(result.prices)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  function openAddContract() {
    setEditingContract(null)
    setContractForm(emptyContract)
    setError('')
    setContractModal(true)
  }

  function openEditContract(rec) {
    setEditingContract(rec)
    setContractForm({ ...emptyContract, ...rec.fields })
    setError('')
    setContractModal(true)
  }

  function closeContractModal() {
    setContractModal(false)
    setParsedPrices([])
    setParsing(false)
    setError('')
  }

  async function saveContract() {
    if (!contractForm['合同编号'] || !contractForm['合同名称'] || !contractForm['有效期开始'] || !contractForm['有效期结束']) {
      setError('合同编号、名称、有效期为必填项')
      return
    }
    setContractSaving(true)
    setError('')
    try {
      const savedContractCode = contractForm['合同编号']
      if (editingContract) {
        await updateRecord(TABLES.CONTRACT, editingContract.id, contractForm)
      } else {
        await createRecord(TABLES.CONTRACT, contractForm)
        if (parsedPrices.length > 0) {
          const results = await Promise.allSettled(
            parsedPrices.map((price) =>
              createRecord(TABLES.PRICE_BASE, { ...price, 合同编号: savedContractCode })
            )
          )
          const failed = results.filter((r) => r.status === 'rejected').length
          if (failed > 0) {
            setError(`合同已保存，但 ${parsedPrices.length} 条价格明细中有 ${failed} 条导入失败`)
            // 不关闭 Modal，让用户看到错误
            invalidate(TABLES.PRICE_BASE)
            setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
            return
          }
          invalidate(TABLES.PRICE_BASE)
          setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
          setParsedPrices([])
        }
      }
      invalidate(TABLES.CONTRACT)
      setContracts(await getTableData(TABLES.CONTRACT, true))
      closeContractModal()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setContractSaving(false)
    }
  }

  function openAddPrice(contractCode) {
    setEditingPrice(null)
    setPriceForm({ ...emptyPrice, 合同编号: contractCode })
    setError('')
    setPriceModal(true)
  }

  function openEditPrice(rec) {
    setEditingPrice(rec)
    setPriceForm({
      ...emptyPrice,
      ...rec.fields,
      数量起: String(rec.fields['数量起'] ?? ''),
      数量止: String(rec.fields['数量止'] ?? ''),
      印刷单价: String(rec.fields['印刷单价'] ?? ''),
    })
    setError('')
    setPriceModal(true)
  }

  async function savePrice() {
    setPriceSaving(true)
    setError('')
    try {
      const payload = {
        ...priceForm,
        数量起: Number(priceForm['数量起']),
        数量止: Number(priceForm['数量止']),
        印刷单价: Number(priceForm['印刷单价']),
      }
      if (editingPrice) {
        await updateRecord(TABLES.PRICE_BASE, editingPrice.id, payload)
      } else {
        await createRecord(TABLES.PRICE_BASE, payload)
      }
      invalidate(TABLES.PRICE_BASE)
      setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
      setPriceModal(false)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setPriceSaving(false)
    }
  }

  async function handleDeletePrice(id) {
    if (!window.confirm('确认删除该价格条目？')) return
    try {
      await deleteRecord(TABLES.PRICE_BASE, id)
      invalidate(TABLES.PRICE_BASE)
      setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
    } catch {
      setError('删除失败，请重试')
    }
  }

  async function handlePriceFileSelect(e, contractCode) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')
    try {
      const rows = await parsePriceImport(file)
      setImportTargetContract(contractCode)
      setPriceImportRows(rows)
      setPriceImportModal(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function submitPriceImport() {
    setPriceImporting(true)
    setError('')
    try {
      for (const row of priceImportRows) {
        await createRecord(TABLES.PRICE_BASE, { ...row, 合同编号: importTargetContract })
      }
      invalidate(TABLES.PRICE_BASE)
      setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
      setPriceImportModal(false)
      setPriceImportRows([])
    } catch {
      setError('批量导入失败，请重试')
    } finally {
      setPriceImporting(false)
    }
  }

  const priceColumns = [
    { key: '类型', title: '类型' },
    { key: '成品尺寸', title: '成品尺寸' },
    { key: '装订要求', title: '装订要求' },
    { key: '封面/内页', title: '封面/内页' },
    { key: '纸张种类', title: '纸张种类' },
    { key: '印刷要求', title: '印刷要求' },
    { key: '数量起', title: '数量起' },
    { key: '数量止', title: '数量止' },
    { key: '印刷单价', title: '单价(元)' },
    {
      key: '_actions',
      title: '操作',
      render: (_, row) => (
        <div className="whitespace-nowrap"><div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEditPrice(row._record)}>编辑</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePrice(row._record.id)}>删除</Button>
        </div></div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">合同管理</h1>
        <Button onClick={openAddContract}>新增合同</Button>
      </div>

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-400">加载中…</p>
        ) : contracts.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">暂无合同</p>
        ) : (
          contracts.map((rec) => {
            const f = rec.fields
            const active = isContractActive(rec)
            const expanded = expandedId === rec.id
            const detail = priceRows.filter((p) => p.fields['合同编号'] === f['合同编号'])

            return (
              <div key={rec.id} className="border-b border-gray-50 last:border-0">
                <div
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : rec.id)}
                >
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="w-28 text-xs text-gray-500">{f['合同编号']}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900">{f['合同名称']}</span>
                  <span className="w-52 text-xs text-gray-500">{String(f['有效期开始'] || '').slice(0, 10)} ~ {String(f['有效期结束'] || '').slice(0, 10)}</span>
                  <span className="w-32 text-xs text-gray-500">{f['适用分校']}</span>
                  <Badge status={active ? 'active' : 'rejected'} />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); openEditContract(rec) }}
                  >
                    编辑
                  </Button>
                </div>

                {expanded && (
                  <div className="border-t border-gray-50 bg-gray-50 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">价格明细（{detail.length} 条）</span>
                      <div className="flex gap-2">
                        <button
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
                          onClick={downloadPriceTemplate}
                        >
                          下载模板
                        </button>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => handlePriceFileSelect(e, f['合同编号'])}
                          />
                          <span className="inline-flex cursor-pointer items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                            批量导入
                          </span>
                        </label>
                        <Button size="sm" onClick={() => openAddPrice(f['合同编号'])}>新增价格行</Button>
                      </div>
                    </div>
                    <Table
                      compact
                      columns={priceColumns}
                      data={detail.map((r) => ({ ...r.fields, _record: r }))}
                      emptyText="该合同暂无价格数据"
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Contract Modal */}
      <Modal
        open={contractModal}
        onClose={closeContractModal}
        title={editingContract ? '编辑合同' : '新增合同'}
        footer={
          <>
            <Button variant="secondary" onClick={closeContractModal}>取消</Button>
            <Button loading={contractSaving} onClick={saveContract}>保存</Button>
          </>
        }
      >
        {editingContract && (
          <p className="mb-3 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            修改合同名称会影响历史订单的关联关系，建议新建合同替代
          </p>
        )}
        {!editingContract && (
          <div className="mb-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">上传合同图片自动解析</p>
                <p className="mt-0.5 text-[11px] text-gray-400">支持 JPG / PNG / WEBP，解析结果会自动填入表单</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleContractFileParse}
                />
                <span className={`inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 ${parsing ? 'opacity-50 pointer-events-none' : ''}`}>
                  {parsing ? '解析中…' : '选择文件'}
                </span>
              </label>
            </div>
            {parsedPrices.length > 0 && (
              <p className="mt-2 text-[11px] text-blue-600">
                已识别 {parsedPrices.length} 条价格明细，保存合同后可一键导入
              </p>
            )}
          </div>
        )}
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <ContractForm
          form={contractForm}
          onChange={(key, val) => setContractForm((prev) => ({ ...prev, [key]: val }))}
        />
      </Modal>

      {/* Price Modal */}
      <Modal
        open={priceModal}
        onClose={() => setPriceModal(false)}
        title={editingPrice ? '编辑价格行' : '新增价格行'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceModal(false)}>取消</Button>
            <Button loading={priceSaving} onClick={savePrice}>保存</Button>
          </>
        }
      >
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <PriceForm
          form={priceForm}
          onChange={(key, val) => setPriceForm((prev) => ({ ...prev, [key]: val }))}
        />
      </Modal>

      {/* 价格行批量导入预览 Modal */}
      <Modal
        open={priceImportModal}
        onClose={() => { setPriceImportModal(false); setPriceImportRows([]) }}
        title={`批量导入价格行（合同：${importTargetContract}）`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPriceImportModal(false); setPriceImportRows([]) }}>取消</Button>
            <Button loading={priceImporting} onClick={submitPriceImport}>
              确认导入（{priceImportRows.length} 条）
            </Button>
          </>
        }
      >
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <p className="mb-3 text-xs text-gray-500">预览前 10 条，请确认数据无误后导入：</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['类型','成品尺寸','装订要求','封面/内页','纸张种类','印刷要求','数量起','数量止','单价'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-1.5 text-left font-semibold text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priceImportRows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-2 py-1.5 text-gray-700">{row['类型']}</td>
                  <td className="px-2 py-1.5 text-gray-700">{row['成品尺寸']}</td>
                  <td className="px-2 py-1.5 text-gray-700">{row['装订要求']}</td>
                  <td className="px-2 py-1.5 text-gray-700">{row['封面/内页']}</td>
                  <td className="px-2 py-1.5 text-gray-700">{row['纸张种类']}</td>
                  <td className="px-2 py-1.5 text-gray-700">{row['印刷要求']}</td>
                  <td className="px-2 py-1.5 tabular-nums text-gray-700">{row['数量起']}</td>
                  <td className="px-2 py-1.5 tabular-nums text-gray-700">{row['数量止']}</td>
                  <td className="px-2 py-1.5 tabular-nums text-gray-700">{row['印刷单价']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {priceImportRows.length > 10 && (
          <p className="mt-2 text-[11px] text-gray-400">…还有 {priceImportRows.length - 10} 条</p>
        )}
      </Modal>
    </div>
  )
}

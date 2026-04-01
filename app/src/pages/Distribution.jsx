import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import { createRecord, updateRecord } from '../api/teable.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import Modal from '../components/ui/Modal.jsx'
import { generateDistributionId } from '../utils/id.js'
import { exportDistribution, parseDistributionImport, downloadDistributionTemplate } from '../utils/export.js'

const TABS = ['发起分发', '我的分发']

export default function Distribution() {
  const { getTableData, invalidate } = useCache()
  const { user } = useAuth()
  const branch = user?.fields?.['所属分校'] ?? ''
  const myResponsibleCampuses = useMemo(() => {
    try { return JSON.parse(user?.fields?.['负责校区'] || '[]') } catch { return [] }
  }, [user])

  const [activeTab, setActiveTab] = useState('发起分发')
  const [orders, setOrders] = useState([])
  const [campuses, setCampuses] = useState([])
  const [distributions, setDistributions] = useState([])
  const [loading, setLoading] = useState(true)

  const [panelOrder, setPanelOrder] = useState(null)
  const [panelMode, setPanelMode] = useState('manual')
  const [manualAllocs, setManualAllocs] = useState({})
  const [importRows, setImportRows] = useState([])
  const [importError, setImportError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      getTableData(TABLES.ORDER_MAIN),
      getTableData(TABLES.CAMPUS),
      getTableData(TABLES.DISTRIBUTION),
    ]).then(([o, c, d]) => {
      setOrders(o)
      setCampuses(c)
      setDistributions(d)
    }).finally(() => setLoading(false))
  }, [getTableData])

  const approvedOrders = useMemo(
    () => orders.filter((o) => o.fields['订单状态'] === '已审核' && (!branch || o.fields['所属分校'] === branch)),
    [orders, branch]
  )

  const myDistributions = useMemo(
    () => distributions.filter((d) => {
      const matchBranch = !branch || d.fields['所属分校'] === branch
      // 管理员或无指定负责校区时，显示本分校所有分发记录
      if (myResponsibleCampuses.length === 0) return matchBranch
      return matchBranch && myResponsibleCampuses.includes(d.fields['校区名称'])
    }),
    [distributions, myResponsibleCampuses, branch]
  )

  const branchCampuses = useMemo(
    () => campuses.filter((c) => !branch || c.fields['所属分校'] === branch),
    [campuses, branch]
  )

  const manualTotal = Object.values(manualAllocs).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
  const importTotal = importRows.reduce((sum, r) => sum + r['分配数量'], 0)
  const orderQty = panelOrder ? (panelOrder.fields['印刷数量'] || 0) : 0

  function openPanel(rec) {
    setPanelOrder(rec)
    setPanelMode('manual')
    setManualAllocs({})
    setImportRows([])
    setImportError('')
    setError('')
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const rows = await parseDistributionImport(file)
      setImportRows(rows)
    } catch (err) {
      setImportError(err.message)
    }
    e.target.value = ''
  }

  async function submitDistribution() {
    setError('')
    const rows = panelMode === 'manual'
      ? Object.entries(manualAllocs)
          .filter(([, v]) => parseInt(v, 10) > 0)
          .map(([name, v]) => ({ 校区名称: name, 分配数量: parseInt(v, 10) }))
      : importRows

    const total = rows.reduce((s, r) => s + r['分配数量'], 0)
    if (total !== orderQty) {
      setError(`分配总量（${total}）必须等于订单数量（${orderQty}）`)
      return
    }
    if (rows.length === 0) {
      setError('请至少分配一个校区')
      return
    }

    setSubmitting(true)
    try {
      const distId = generateDistributionId()
      const now = new Date().toISOString()
      for (const row of rows) {
        await createRecord(TABLES.DISTRIBUTION, {
          分发单号: distId,
          订单编号: panelOrder.fields['订单编号'],
          所属分校: branch,
          校区名称: row['校区名称'],
          分配数量: row['分配数量'],
          状态: '待确认',
          创建时间: now,
        })
      }
      invalidate(TABLES.DISTRIBUTION)
      setDistributions(await getTableData(TABLES.DISTRIBUTION, true))
      setPanelOrder(null)
    } catch {
      setError('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmReceipt(rec) {
    try {
      await updateRecord(TABLES.DISTRIBUTION, rec.id, { 状态: '已确认' })
      invalidate(TABLES.DISTRIBUTION)
      setDistributions(await getTableData(TABLES.DISTRIBUTION, true))
    } catch {
      setError('操作失败，请重试')
    }
  }

  async function handleExport() {
    const campusMap = {}
    campuses.forEach((c) => { campusMap[c.fields['校区名称']] = c.fields })
    const rows = distributions
      .filter((d) => !branch || d.fields['所属分校'] === branch)
      .map((d) => {
        const f = d.fields
        const cm = campusMap[f['校区名称']] || {}
        return {
          订单编号: f['订单编号'],
          分发单号: f['分发单号'],
          校区名称: f['校区名称'],
          所属分校: f['所属分校'],
          地址: cm['地址'] || '',
          收件人: cm['收件人'] || '',
          电话: cm['电话'] || '',
          分配数量: f['分配数量'],
          状态: f['状态'],
        }
      })
    exportDistribution(rows, `分发清单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}`)
  }

  const orderColumns = [
    { key: '订单编号', title: '订单编号' },
    { key: '产品名称', title: '产品名称' },
    { key: '印刷数量', title: '数量' },
    { key: '合同名称', title: '合同' },
    { key: '提交时间', title: '提交时间', render: (v) => v ? v.slice(0, 10) : '-' },
    {
      key: '_action',
      title: '操作',
      render: (_, row) => (
        <Button size="sm" onClick={() => openPanel(row._record)}>开始分发</Button>
      ),
    },
  ]

  const myDistColumns = [
    { key: '分发单号', title: '分发单号' },
    { key: '订单编号', title: '订单编号' },
    { key: '校区名称', title: '校区' },
    { key: '所属分校', title: '所属分校' },
    { key: '分配数量', title: '数量' },
    { key: '状态', title: '状态', render: (v) => <Badge status={v === '已确认' ? 'confirmed' : 'pending_confirm'} /> },
    {
      key: '_action',
      title: '操作',
      render: (_, row) =>
        row['状态'] === '待确认' ? (
          <Button size="sm" onClick={() => confirmReceipt(row._record)}>确认收货</Button>
        ) : null,
    },
  ]

  const canSubmit = panelMode === 'manual'
    ? manualTotal === orderQty && manualTotal > 0
    : importTotal === orderQty && importRows.length > 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">分发管理</h1>
        <Button variant="secondary" size="sm" onClick={handleExport}>导出分发清单</Button>
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      {activeTab === '发起分发' && (
        <div className="rounded-xl border border-gray-100 bg-white">
          <Table
            columns={orderColumns}
            data={approvedOrders.map((r) => ({ ...r.fields, _record: r }))}
            loading={loading}
            emptyText="暂无已审核订单"
          />
        </div>
      )}

      {activeTab === '我的分发' && (
        <div className="rounded-xl border border-gray-100 bg-white">
          <Table
            columns={myDistColumns}
            data={myDistributions.map((r) => ({ ...r.fields, _record: r }))}
            loading={loading}
            emptyText="暂无分发记录"
          />
        </div>
      )}

      <Modal
        open={!!panelOrder}
        onClose={() => setPanelOrder(null)}
        title={`分发订单：${panelOrder?.fields?.['订单编号'] ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPanelOrder(null)}>取消</Button>
            <Button loading={submitting} disabled={!canSubmit} onClick={submitDistribution}>提交分发</Button>
          </>
        }
      >
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">订单总量：<strong className="text-gray-900">{orderQty}</strong></span>
          <span className={`font-medium ${(panelMode === 'manual' ? manualTotal : importTotal) === orderQty ? 'text-green-600' : 'text-red-500'}`}>
            已分配：{panelMode === 'manual' ? manualTotal : importTotal}
          </span>
        </div>

        <div className="mb-4 flex gap-4">
          {[{ value: 'manual', label: '手动分配' }, { value: 'import', label: 'Excel导入' }].map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="radio" name="panelMode" value={value} checked={panelMode === value}
                onChange={() => { setPanelMode(value); setError('') }} className="accent-gray-900" />
              {label}
            </label>
          ))}
        </div>

        {panelMode === 'manual' && (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {branchCampuses.length === 0 ? (
              <p className="text-xs text-gray-400">该分校暂无校区数据</p>
            ) : (
              branchCampuses.map((c) => {
                const name = c.fields['校区名称']
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-700">{name}</span>
                    <Input
                      type="number"
                      value={manualAllocs[name] ?? ''}
                      onChange={(e) => setManualAllocs((prev) => ({ ...prev, [name]: e.target.value }))}
                      placeholder="0"
                      className="w-28"
                    />
                  </div>
                )
              })
            )}
          </div>
        )}

        {panelMode === 'import' && (
          <div>
            <div className="mb-3 flex gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex h-9 items-center rounded border border-gray-200 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  选择文件
                </span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </label>
              <Button size="sm" variant="secondary" onClick={() => downloadDistributionTemplate(branchCampuses.map((c) => c.fields))}>
                下载模板
              </Button>
            </div>
            {importError && <p className="mb-2 text-xs text-red-500">{importError}</p>}
            {importRows.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-2 py-1 text-left text-gray-400">校区名称</th>
                    <th className="px-2 py-1 text-right text-gray-400">分配数量</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-2 py-1 text-gray-700">{r['校区名称']}</td>
                      <td className="px-2 py-1 text-right text-gray-700">{r['分配数量']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </Modal>
    </div>
  )
}

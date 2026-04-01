import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import { updateRecord } from '../api/teable.js'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import Input from '../components/ui/Input.jsx'
import Table from '../components/ui/Table.jsx'

const STATUS_KEY = {
  '待审核': 'pending',
  '已提交': 'pending',
  '已审核': 'approved',
  '已驳回': 'rejected',
}

// 将"已提交"规范化为"待审核"
function normalizeStatus(status) {
  return status === '已提交' ? '待审核' : status
}

const TABS = ['全部', '待审核', '已审核', '已驳回']

export default function Orders() {
  const { getTableData, invalidate } = useCache()
  const { user, permissions } = useAuth()
  const branch = user?.fields?.['所属分校'] ?? ''

  const [orders, setOrders] = useState([])
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('全部')
  const [expandedId, setExpandedId] = useState(null)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectingOrder, setRejectingOrder] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getTableData(TABLES.ORDER_MAIN), getTableData(TABLES.ORDER_DETAIL)])
      .then(([o, d]) => { setOrders(o); setDetails(d) })
      .finally(() => setLoading(false))
  }, [getTableData])

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => {
          const matchBranch = !branch || o.fields['所属分校'] === branch
          const status = normalizeStatus(o.fields['订单状态'])
          const matchStatus = activeTab === '全部' || status === activeTab
          return matchBranch && matchStatus
        })
        .sort((a, b) =>
          (b.fields['提交时间'] || '').localeCompare(a.fields['提交时间'] || '')
        ),
    [orders, branch, activeTab]
  )

  async function approve(rec) {
    setActionLoading(true)
    setError('')
    try {
      await updateRecord(TABLES.ORDER_MAIN, rec.id, { 订单状态: '已审核' })
      invalidate(TABLES.ORDER_MAIN)
      setOrders(await getTableData(TABLES.ORDER_MAIN, true))
    } catch {
      setError('操作失败，请重试')
    } finally {
      setActionLoading(false)
    }
  }

  async function submitReject() {
    if (!rejectReason.trim()) {
      setError('请填写驳回原因')
      return
    }
    setActionLoading(true)
    setError('')
    try {
      await updateRecord(TABLES.ORDER_MAIN, rejectingOrder.id, {
        订单状态: '已驳回',
        驳回原因: rejectReason,
      })
      invalidate(TABLES.ORDER_MAIN)
      setOrders(await getTableData(TABLES.ORDER_MAIN, true))
      setRejectModal(false)
      setRejectReason('')
    } catch {
      setError('操作失败，请重试')
    } finally {
      setActionLoading(false)
    }
  }

  const detailColumns = [
    { key: '装订要求', title: '装订要求' },
    { key: '封面/内页', title: '封面/内页' },
    { key: '成品尺寸', title: '成品尺寸' },
    { key: '纸张种类', title: '纸张种类' },
    { key: '印刷要求', title: '印刷要求' },
    { key: '单BOM印刷数量', title: '单BOM数量' },
    { key: '印刷数量', title: '印刷数量' },
    { key: '印刷单价', title: '单价' },
    { key: '印刷总价', title: '总价' },
  ]

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">查询订单</h1>

      {/* Status tabs */}
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

      <div className="rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">加载中…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">暂无订单</p>
        ) : (
          filtered.map((rec) => {
            const f = rec.fields
            const isExpanded = expandedId === rec.id
            const orderDetails = details.filter((d) => d.fields['订单编号'] === f['订单编号'])

            return (
              <div key={rec.id} className="border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors text-sm">
                  <span className="w-40 shrink-0 truncate text-xs font-mono text-gray-500">{f['订单编号']}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{f['产品名称']}</span>
                  <span className="w-28 shrink-0 truncate text-xs text-gray-500">{f['合同名称']}</span>
                  <span className="w-20 shrink-0 text-xs text-gray-500">{f['所属分校']}</span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-xs text-gray-700">{f['印刷数量']}</span>
                  <span className="w-24 shrink-0 text-right tabular-nums text-xs font-medium text-gray-900">
                    {f['总价'] != null ? `¥${Number(f['总价']).toFixed(2)}` : '-'}
                  </span>
                  <span className="w-16 shrink-0">
                    <Badge status={STATUS_KEY[f['订单状态']] ?? 'pending'} />
                  </span>
                  <span className="w-20 shrink-0 text-xs text-gray-500">
                    {f['提交时间'] ? f['提交时间'].slice(0, 10) : '-'}
                  </span>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setExpandedId((prev) => (prev === rec.id ? null : rec.id))}
                    >
                      {isExpanded ? '收起' : '详情'}
                    </Button>
                    {permissions?.approve_orders && (f['订单状态'] === '待审核' || f['订单状态'] === '已提交') && (
                      <>
                        <Button size="sm" onClick={() => approve(rec)} loading={actionLoading}>
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setRejectingOrder(rec)
                            setRejectReason('')
                            setError('')
                            setRejectModal(true)
                          }}
                        >
                          驳回
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50 px-5 py-4">
                    {f['驳回原因'] && (
                      <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">
                        驳回原因：{f['驳回原因']}
                      </p>
                    )}
                    <Table
                      columns={detailColumns}
                      data={orderDetails.map((d) => d.fields)}
                      emptyText="暂无明细数据"
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Reject modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="驳回订单"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>取消</Button>
            <Button variant="danger" loading={actionLoading} onClick={submitReject}>确认驳回</Button>
          </>
        }
      >
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <Input
          label="驳回原因 *"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请说明驳回原因"
        />
      </Modal>
    </div>
  )
}

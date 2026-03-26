import { useEffect, useState } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import Table from '../components/ui/Table.jsx'
import Badge from '../components/ui/Badge.jsx'
import { isContractActive } from '../utils/price.js'
import { AlertCircle, CheckCircle2, FileCheck, PackageCheck } from 'lucide-react'

const STATUS_KEY = {
  '待审核': 'pending',
  '已审核': 'approved',
  '已驳回': 'rejected',
}

function StatCard({ label, value, loading, Icon, accent }) {
  return (
    <div className="group rounded-xl border border-gray-100 bg-white p-5 transition-shadow duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`rounded-lg p-1.5 ${accent}`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-gray-900">
        {loading ? (
          <span className="inline-block h-8 w-10 animate-pulse rounded bg-gray-100" />
        ) : (
          value
        )}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { getTableData } = useCache()
  const { user } = useAuth()
  const branch = user?.fields?.['所属分校'] ?? ''

  const [stats, setStats] = useState({ pending: 0, approvedThisMonth: 0, activeContracts: 0, pendingDist: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [orders, contracts, distributions] = await Promise.all([
          getTableData(TABLES.ORDER_MAIN),
          getTableData(TABLES.CONTRACT),
          getTableData(TABLES.DISTRIBUTION),
        ])

        const thisMonth = new Date().toISOString().slice(0, 7)
        const myOrders = branch
          ? orders.filter((o) => o.fields['所属分校'] === branch)
          : orders

        const pending = myOrders.filter((o) => o.fields['订单状态'] === '待审核').length
        const approvedThisMonth = myOrders.filter(
          (o) =>
            o.fields['订单状态'] === '已审核' &&
            (o.fields['提交时间'] || '').startsWith(thisMonth)
        ).length
        const activeContracts = contracts.filter((c) => isContractActive(c)).length
        const myDists = branch
          ? distributions.filter((d) => d.fields['所属分校'] === branch)
          : distributions
        const pendingDist = myDists.filter((d) => d.fields['状态'] === '待确认').length

        setStats({ pending, approvedThisMonth, activeContracts, pendingDist })

        const sorted = [...myOrders]
          .sort((a, b) =>
            (b.fields['提交时间'] || '').localeCompare(a.fields['提交时间'] || '')
          )
          .slice(0, 10)
        setRecentOrders(sorted)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getTableData, branch])

  const statCards = [
    { label: '待审核订单', value: stats.pending, Icon: AlertCircle, accent: 'bg-amber-50 text-amber-500' },
    { label: '本月已审核订单', value: stats.approvedThisMonth, Icon: CheckCircle2, accent: 'bg-green-50 text-green-500' },
    { label: '有效合同', value: stats.activeContracts, Icon: FileCheck, accent: 'bg-blue-50 text-blue-500' },
    { label: '待确认分发', value: stats.pendingDist, Icon: PackageCheck, accent: 'bg-purple-50 text-purple-500' },
  ]

  const columns = [
    { key: '订单编号', title: '订单编号' },
    { key: '产品名称', title: '产品名称' },
    { key: '合同名称', title: '合同' },
    {
      key: '订单状态',
      title: '状态',
      render: (v) => <Badge status={STATUS_KEY[v] ?? 'pending'} />,
    },
    {
      key: '提交时间',
      title: '提交时间',
      render: (v) => (v ? v.slice(0, 10) : '-'),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">首页看板</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {branch ? `${branch} · ` : ''}今日 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} loading={loading} {...card} />
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">最近10条订单</h2>
          <span className="text-xs text-gray-400">{!loading && `共 ${recentOrders.length} 条`}</span>
        </div>
        <Table
          columns={columns}
          data={recentOrders.map((r) => r.fields)}
          loading={loading}
          emptyText="暂无订单记录"
        />
      </div>
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import { deleteRecord } from '../api/teable.js'
import Table from '../components/ui/Table.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'

export default function Bom() {
  const { getTableData, invalidate } = useCache()
  const { permissions } = useAuth()
  const [boms, setBoms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getTableData(TABLES.PRODUCT_BOM)
      .then(setBoms)
      .finally(() => setLoading(false))
  }, [getTableData])

  const branches = useMemo(() => {
    const set = new Set(boms.map((b) => b.fields['所属分校']).filter(Boolean))
    return [...set].sort()
  }, [boms])

  const filtered = useMemo(
    () =>
      boms.filter((b) => {
        const matchSearch = !search || (b.fields['产品名称'] || '').includes(search)
        const matchBranch = !branchFilter || b.fields['所属分校'] === branchFilter
        return matchSearch && matchBranch
      }),
    [boms, search, branchFilter]
  )

  async function handleDelete(rec) {
    const name = rec.fields['产品名称'] || 'BOM'
    if (!window.confirm(`确认删除「${name}」的此条BOM？此操作不可撤销。`)) return
    setDeleting(rec.id)
    setError('')
    try {
      await deleteRecord(TABLES.PRODUCT_BOM, rec.id)
      invalidate(TABLES.PRODUCT_BOM)
      setBoms(await getTableData(TABLES.PRODUCT_BOM, true))
    } catch {
      setError('删除失败，请重试')
    } finally {
      setDeleting(null)
    }
  }

  const truncate = (v, maxW = 'max-w-[140px]') => (
    <span className={`block ${maxW} truncate`} title={v ?? ''}>{v ?? '-'}</span>
  )

  const columns = [
    { key: '产品名称', title: '产品名称', sticky: true, tdClassName: 'whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' },
    { key: '类型', title: '类型', tdClassName: 'whitespace-nowrap' },
    { key: '成品尺寸', title: '成品尺寸', tdClassName: 'whitespace-nowrap' },
    { key: '装订要求', title: '装订要求', render: (v) => truncate(v, 'max-w-[120px]') },
    { key: '封面/内页', title: '封面/内页', render: (v) => truncate(v, 'max-w-[120px]') },
    { key: '纸张种类', title: '纸张种类', render: (v) => truncate(v, 'max-w-[120px]') },
    { key: '纸张品牌', title: '纸张品牌', tdClassName: 'whitespace-nowrap' },
    { key: '印刷要求', title: '印刷要求', render: (v) => truncate(v, 'max-w-[120px]') },
    { key: '工艺要求', title: '工艺要求', render: (v) => truncate(v, 'max-w-[160px]') },
    { key: '单BOM印刷数量', title: '单BOM数量', tdClassName: 'whitespace-nowrap' },
    { key: '所属分校', title: '所属分校', tdClassName: 'whitespace-nowrap' },
    ...(permissions?.bom_delete ? [{
      key: '_actions',
      title: '操作',
      tdClassName: 'whitespace-nowrap',
      render: (_, row) => (
        <Button
          size="sm"
          variant="danger"
          loading={deleting === row._record.id}
          onClick={() => handleDelete(row._record)}
        >
          删除
        </Button>
      ),
    }] : []),
  ]

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">产品BOM管理</h1>

      <div className="mb-4 flex gap-3">
        <Input
          placeholder="搜索产品名称"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select
          placeholder="全部分校"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          options={branches.map((b) => ({ value: b, label: b }))}
          className="w-40"
        />
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white">
        <Table
          columns={columns}
          data={filtered.map((r) => ({ ...r.fields, _record: r }))}
          loading={loading}
          emptyText="暂无BOM数据"
        />
      </div>
    </div>
  )
}

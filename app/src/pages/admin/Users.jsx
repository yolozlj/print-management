import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../../store/CacheContext.jsx'
import { useAuth } from '../../store/AuthContext.jsx'
import { TABLES } from '../../api/tables.js'
import { updateRecord } from '../../api/teable.js'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Select from '../../components/ui/Select.jsx'
import Table from '../../components/ui/Table.jsx'

const STATUS_KEY = { '已激活': 'active', '待审核': 'pending', '已驳回': 'rejected' }
const TABS = ['已激活', '待审核']

export default function Users() {
  const { getTableData, invalidate } = useCache()
  const { user, permissions } = useAuth()
  const myResponsibleCampuses = useMemo(() => {
    try { return JSON.parse(user?.fields?.['负责校区'] || '[]') } catch { return [] }
  }, [user])

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('已激活')
  const [approveModal, setApproveModal] = useState(false)
  const [approvingUser, setApprovingUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getTableData(TABLES.USER), getTableData(TABLES.ROLE)])
      .then(([u, r]) => { setUsers(u); setRoles(r) })
      .finally(() => setLoading(false))
  }, [getTableData])

  const activeUsers = useMemo(() => users.filter((u) => u.fields['状态'] === '已激活'), [users])

  const pendingUsers = useMemo(
    () => users.filter((u) => {
      if (u.fields['状态'] !== '待审核') return false
      if (!permissions?.approve_users && !permissions?.admin) return false
      if (permissions?.admin) return true
      const campus = u.fields['所属校区'] || ''
      return myResponsibleCampuses.length === 0 || myResponsibleCampuses.includes(campus)
    }),
    [users, permissions, myResponsibleCampuses]
  )

  function openApprove(rec) {
    setApprovingUser(rec)
    setSelectedRole('')
    setError('')
    setApproveModal(true)
  }

  async function submitApprove() {
    if (!selectedRole) { setError('请选择角色'); return }
    setApproving(true)
    setError('')
    try {
      await updateRecord(TABLES.USER, approvingUser.id, { 状态: '已激活', 角色ID: selectedRole })
      invalidate(TABLES.USER)
      setUsers(await getTableData(TABLES.USER, true))
      setApproveModal(false)
    } catch {
      setError('操作失败，请重试')
    } finally {
      setApproving(false)
    }
  }

  async function rejectUser(rec) {
    if (!window.confirm(`确认驳回用户「${rec.fields['姓名']}」？`)) return
    try {
      await updateRecord(TABLES.USER, rec.id, { 状态: '已驳回' })
      invalidate(TABLES.USER)
      setUsers(await getTableData(TABLES.USER, true))
    } catch {
      setError('操作失败，请重试')
    }
  }

  function getRoleName(roleId) {
    if (!roleId) return '-'
    const r = roles.find((r) => r.fields['角色ID'] === roleId)
    return r ? r.fields['角色名称'] : roleId
  }

  const activeColumns = [
    { key: '姓名', title: '姓名' },
    { key: '用户名', title: '用户名' },
    { key: '所属分校', title: '所属分校' },
    { key: '所属校区', title: '所属校区' },
    { key: '角色ID', title: '角色', render: (v) => getRoleName(v) },
    { key: '状态', title: '状态', render: (v) => <Badge status={STATUS_KEY[v] ?? 'pending'} /> },
  ]

  const pendingColumns = [
    { key: '姓名', title: '姓名' },
    { key: '用户名', title: '用户名' },
    { key: '所属分校', title: '所属分校' },
    { key: '所属校区', title: '所属校区' },
    {
      key: '_actions', title: '操作',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openApprove(row._record)}>通过</Button>
          <Button size="sm" variant="danger" onClick={() => rejectUser(row._record)}>驳回</Button>
        </div>
      ),
    },
  ]

  const displayUsers = activeTab === '已激活' ? activeUsers : pendingUsers
  const columns = activeTab === '已激活' ? activeColumns : pendingColumns

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">用户管理</h1>

      <div className="mb-4 flex gap-1 border-b border-gray-100">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors ${activeTab === tab ? 'border-b-2 border-gray-900 font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
            {tab === '待审核' && pendingUsers.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-medium text-white">
                {pendingUsers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white">
        <Table columns={columns} data={displayUsers.map((r) => ({ ...r.fields, _record: r }))} loading={loading} emptyText={activeTab === '待审核' ? '暂无待审核用户' : '暂无用户'} />
      </div>

      <Modal open={approveModal} onClose={() => setApproveModal(false)}
        title={`审核通过：${approvingUser?.fields?.['姓名'] ?? ''}`}
        footer={<>
          <Button variant="secondary" onClick={() => setApproveModal(false)}>取消</Button>
          <Button loading={approving} onClick={submitApprove}>确认通过</Button>
        </>}>
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <Select label="分配角色 *" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
          options={roles.map((r) => ({ value: r.fields['角色ID'], label: r.fields['角色名称'] }))}
          placeholder="请选择角色" />
      </Modal>
    </div>
  )
}

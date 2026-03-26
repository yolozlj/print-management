import { useEffect, useState } from 'react'
import { useCache } from '../../store/CacheContext.jsx'
import { TABLES } from '../../api/tables.js'
import { createRecord, updateRecord, deleteRecord } from '../../api/teable.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Table from '../../components/ui/Table.jsx'

const PERM_KEYS = [
  { key: 'bom', label: '产品BOM查询' },
  { key: 'bom_delete', label: '产品BOM删除' },
  { key: 'contracts', label: '合同管理' },
  { key: 'orders', label: '查询订单' },
  { key: 'create_order', label: '创建订单' },
  { key: 'distribution', label: '分发管理' },
  { key: 'approve_orders', label: '审核订单' },
  { key: 'approve_users', label: '审核用户注册' },
  { key: 'admin', label: '用户/角色管理' },
]

const emptyRole = { 角色ID: '', 角色名称: '', 描述: '' }

function parsePermJson(str) {
  try {
    const obj = JSON.parse(str || '{}')
    return Object.fromEntries(PERM_KEYS.map(({ key }) => [key, !!obj[key]]))
  } catch {
    return Object.fromEntries(PERM_KEYS.map(({ key }) => [key, false]))
  }
}

export default function Roles() {
  const { getTableData, invalidate } = useCache()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyRole)
  const [perms, setPerms] = useState(parsePermJson('{}'))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getTableData(TABLES.ROLE).then(setRoles).finally(() => setLoading(false))
  }, [getTableData])

  function openAdd() {
    setEditing(null)
    setForm(emptyRole)
    setPerms(parsePermJson('{}'))
    setError('')
    setModal(true)
  }

  function openEdit(rec) {
    setEditing(rec)
    setForm({ 角色ID: rec.fields['角色ID'] || '', 角色名称: rec.fields['角色名称'] || '', 描述: rec.fields['描述'] || '' })
    setPerms(parsePermJson(rec.fields['权限配置']))
    setError('')
    setModal(true)
  }

  async function handleDelete(rec) {
    const name = rec.fields['角色名称'] || rec.fields['角色ID'] || '该角色'
    if (!window.confirm(`确认删除角色「${name}」？此操作不可撤销。`)) return
    setDeleting(rec.id)
    try {
      await deleteRecord(TABLES.ROLE, rec.id)
      invalidate(TABLES.ROLE)
      setRoles(await getTableData(TABLES.ROLE, true))
    } catch {
      setError('删除失败，请重试')
    } finally {
      setDeleting(null)
    }
  }

  async function save() {
    if (!form['角色ID'] || !form['角色名称']) { setError('角色ID 和角色名称为必填项'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, 权限配置: JSON.stringify(perms) }
      if (editing) {
        await updateRecord(TABLES.ROLE, editing.id, payload)
      } else {
        await createRecord(TABLES.ROLE, payload)
      }
      invalidate(TABLES.ROLE)
      setRoles(await getTableData(TABLES.ROLE, true))
      setModal(false)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: '角色ID', title: '角色ID', render: (v) => <span className="text-xs text-gray-600">{v ?? '-'}</span> },
    { key: '角色名称', title: '角色名称', render: (v) => <span className="text-xs text-gray-600">{v ?? '-'}</span> },
    { key: '描述', title: '描述', render: (v) => <span className="text-xs text-gray-600">{v ?? '-'}</span> },
    {
      key: '权限配置', title: '已开启权限',
      render: (v) => {
        try {
          const obj = JSON.parse(v || '{}')
          const labels = PERM_KEYS.filter(({ key }) => obj[key]).map(({ label }) => label)
          return labels.length > 0
            ? <span className="text-xs text-gray-600">{labels.join('、')}</span>
            : <span className="text-xs text-gray-400">无</span>
        } catch { return <span className="text-xs text-gray-400">格式错误</span> }
      },
    },
    {
      key: '_actions', title: '操作',
      render: (_, row) => (
        <div className="flex gap-1.5 whitespace-nowrap">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row._record)}>编辑</Button>
          <Button size="sm" variant="danger" loading={deleting === row._record.id} onClick={() => handleDelete(row._record)}>删除</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">角色管理</h1>
        <Button onClick={openAdd}>新增角色</Button>
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white">
        <Table columns={columns} data={roles.map((r) => ({ ...r.fields, _record: r }))} loading={loading} emptyText="暂无角色" />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? '编辑角色' : '新增角色'}
        footer={<>
          <Button variant="secondary" onClick={() => setModal(false)}>取消</Button>
          <Button loading={saving} onClick={save}>保存</Button>
        </>}>
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex flex-col gap-3">
          <Input label="角色ID *" value={form['角色ID']} onChange={(e) => setForm((p) => ({ ...p, 角色ID: e.target.value }))} placeholder="如 role_campus_admin" disabled={!!editing} />
          <Input label="角色名称 *" value={form['角色名称']} onChange={(e) => setForm((p) => ({ ...p, 角色名称: e.target.value }))} placeholder="如 校区管理员" />
          <Input label="描述" value={form['描述']} onChange={(e) => setForm((p) => ({ ...p, 描述: e.target.value }))} placeholder="可选" />
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">权限配置</p>
            <div className="grid grid-cols-2 gap-2">
              {PERM_KEYS.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={perms[key] || false}
                    onChange={() => setPerms((p) => ({ ...p, [key]: !p[key] }))}
                    className="accent-gray-900" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

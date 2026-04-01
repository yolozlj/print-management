/**
 * Badge — 状态标签
 * status: 'pending' | 'approved' | 'rejected' | 'confirmed' | 'active'
 */
const STATUS_MAP = {
  pending:          { label: '待审核', className: 'bg-amber-50 text-amber-700 ring-amber-200/80' },
  pending_confirm:  { label: '待确认', className: 'bg-amber-50 text-amber-700 ring-amber-200/80' },
  approved:         { label: '已审核', className: 'bg-gray-900 text-white ring-transparent' },
  rejected:         { label: '已驳回', className: 'bg-red-50 text-red-600 ring-red-200/80' },
  confirmed:        { label: '已确认', className: 'bg-green-50 text-green-700 ring-green-200/80' },
  active:           { label: '已激活', className: 'bg-gray-900 text-white ring-transparent' },
}

export default function Badge({ status, className = '' }) {
  const config = STATUS_MAP[status] ?? { label: status, className: 'bg-gray-100 text-gray-500 ring-gray-200/80' }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}

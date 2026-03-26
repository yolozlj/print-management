/**
 * Table — 超极简主义
 * columns: [{ key, title, render? }]
 * data: array of objects
 * loading: 展示 skeleton 行
 * emptyText: 无数据时显示
 */
export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyText = '暂无数据',
  className = '',
}) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${col.sticky ? 'sticky left-0 z-10 bg-white' : ''}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded-md bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-16 text-center text-sm text-gray-400"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-gray-50 transition-colors duration-100 last:border-0 hover:bg-gray-50/70"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.tdClassName ?? ''} ${col.sticky ? 'sticky left-0 z-10 bg-white' : ''}`}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

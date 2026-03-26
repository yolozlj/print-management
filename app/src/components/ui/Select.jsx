/**
 * Select — 超极简主义
 * options: [{ value, label }]
 */
export default function Select({
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  placeholder = '请选择',
  id,
  className = '',
  ...props
}) {
  const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-gray-600"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900
          transition-colors duration-150 outline-none
          focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          cursor-pointer"
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt, idx) => (
          <option key={opt.value || idx} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

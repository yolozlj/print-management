/**
 * Input — 超极简主义
 * label 在输入框上方，error 红色小字显示在下方
 */
export default function Input({
  label,
  error,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  id,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-gray-600"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-9 w-full rounded-lg border px-3 text-sm text-gray-900 placeholder:text-gray-400
          transition-colors duration-150 outline-none
          ${error
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400/20'
            : 'border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10'
          }
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          bg-white`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

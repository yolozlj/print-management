import { useEffect } from 'react'

/**
 * Modal — 超极简主义
 * open: boolean
 * onClose: () => void
 * title: string
 * children: ReactNode
 * footer: ReactNode (可选)
 */
export default function Modal({ open, onClose, title, children, footer }) {
  // 按 Escape 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-lg ring-1 ring-gray-100 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2
            id="modal-title"
            className="text-sm font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-7 w-7 items-center justify-center rounded text-gray-400
              hover:bg-gray-100 hover:text-gray-600 transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-gray-700">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

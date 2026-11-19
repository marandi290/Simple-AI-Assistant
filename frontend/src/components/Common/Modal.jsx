import { useEffect } from 'react'
import { X } from 'lucide-react'
import IconButton from './IconButton'

export default function Modal({ open, title, onClose, children, actions }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-lg rounded-xl border border-border bg-bg-secondary shadow-panel">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>
        </div>
        <div className="p-4">{children}</div>
        {actions && <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3">{actions}</div>}
      </div>
    </div>
  )
}

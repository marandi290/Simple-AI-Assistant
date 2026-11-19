import { useEffect, useRef, useState } from 'react'
import { Paperclip, Send, Square } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function Composer({ onSend, onStop, isStreaming, disabled, draft, setDraft }) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [attachmentNote, setAttachmentNote] = useState('')
  const [localDraft, setLocalDraft] = useState('')
  const value = draft !== undefined ? draft : localDraft
  const setValue = setDraft || setLocalDraft

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  useEffect(() => { resize() }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || isStreaming || disabled) return
    onSend?.(text)
    setValue('')
    requestAnimationFrame(resize)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const onAttach = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachmentNote(`Attachments are not supported by the backend yet (${file.name}).`)
      setTimeout(() => setAttachmentNote(''), 4000)
    }
    e.target.value = ''
  }

  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  return (
    <div className="border-t border-border-subtle bg-bg-primary/80 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/70">
      <div className="mx-auto max-w-4xl px-4 py-3 md:px-6 md:py-4">
        {attachmentNote && (
          <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{attachmentNote}</div>
        )}
        <div className="rounded-2xl border border-border bg-bg-secondary shadow-sm focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={disabled ? 'Backend unavailable...' : 'Message the assistant...'}
            rows={1}
            disabled={disabled}
            className="block w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50 max-h-[200px]"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
              <button
                type="button"
                onClick={onAttach}
                disabled={disabled}
                title="Attach file (integration-ready)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              >
                <Paperclip size={16} />
              </button>
              <span className="hidden sm:inline text-xs text-text-muted px-2">Enter to send · Shift+Enter for newline</span>
            </div>
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  <Square size={14} className="fill-current" /> Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSend}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    canSend ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                  )}
                >
                  <Send size={14} /> Send
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-text-muted">AI responses may be inaccurate. Verify important information.</p>
      </div>
    </div>
  )
}

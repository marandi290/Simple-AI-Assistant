import { useState } from 'react'
import { Bot, Check, Copy, Pencil, RefreshCw, User, X } from 'lucide-react'
import MarkdownContent from './MarkdownContent'
import IconButton from '../Common/IconButton'
import { formatTime } from '../../utils/date'
import { cn } from '../../utils/cn'

export default function MessageItem({ message, isStreaming, isLastAssistant, onRegenerate, onEdit, disabled }) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content || '')
  const isUser = message.role === 'user'

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const submitEdit = () => {
    const val = draft.trim()
    if (!val) return
    setEditing(false)
    if (val !== message.content) onEdit?.(message.id, val)
  }

  return (
    <div className={cn('group flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-tertiary text-accent">
          <Bot size={16} />
        </div>
      )}

      <div className={cn('min-w-0 max-w-[85%] md:max-w-[75%]', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-2xl border px-4 py-3 shadow-sm',
          isUser
            ? 'bg-accent/15 border-accent/20 text-text-primary rounded-br-md'
            : 'bg-bg-secondary border-border-subtle rounded-bl-md',
          message.error && 'border-red-500/30'
        )}>
          {editing ? (
            <div className="space-y-2 min-w-[280px] sm:min-w-[420px]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full min-h-[100px] rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setEditing(false); setDraft(message.content || '') }} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary">
                  <X size={13} /> Cancel
                </button>
                <button onClick={submitEdit} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs text-white hover:bg-accent-hover">
                  <Check size={13} /> Save & resend
                </button>
              </div>
            </div>
          ) : (
            <>
              {isUser ? (
                <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
              ) : (
                <div className="text-sm">
                  {message.content ? <MarkdownContent content={message.content} /> : (isStreaming ? <span className="text-text-muted animate-pulse-soft">Thinking...</span> : null)}
                  {isStreaming && message.content && <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-text-secondary/70 animate-pulse-soft rounded-sm" />}
                </div>
              )}
            </>
          )}
        </div>

        {!editing && (
          <div className={cn('mt-1 flex items-center gap-1 px-1 text-xs text-text-muted', isUser ? 'justify-end' : 'justify-start')}>
            <span>{formatTime(message.created_at)}</span>
            {message.model && !isUser && <span className="hidden sm:inline">· {message.model}</span>}
            {message.error && <span className="text-red-400">· Error</span>}
            <div className={cn('ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity', (isStreaming) && 'opacity-0 pointer-events-none')}>
              {isUser ? (
                <IconButton label="Edit message" onClick={() => { setDraft(message.content || ''); setEditing(true) }} disabled={disabled || isStreaming}>
                  <Pencil size={14} />
                </IconButton>
              ) : (
                <>
                  <IconButton label={copied ? 'Copied' : 'Copy response'} onClick={copyMessage} disabled={!message.content}>
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </IconButton>
                  {isLastAssistant && onRegenerate && (
                    <IconButton label="Regenerate response" onClick={onRegenerate} disabled={disabled || isStreaming || !message.content}>
                      <RefreshCw size={14} />
                    </IconButton>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-tertiary text-text-secondary">
          <User size={16} />
        </div>
      )}
    </div>
  )
}

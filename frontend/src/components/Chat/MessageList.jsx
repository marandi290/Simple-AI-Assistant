import { useEffect, useRef } from 'react'
import MessageItem from '../Message/MessageItem'

export default function MessageList({ messages, isStreaming, streamingMessageId, onRegenerate, onEdit, error }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth', block: 'end' })
  }, [messages, isStreaming, streamingMessageId])

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-6 space-y-6">
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            isStreaming={isStreaming && streamingMessageId === m.id}
            isLastAssistant={m.id === lastAssistantId}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
            disabled={isStreaming}
          />
        ))}
        {error && !isStreaming && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

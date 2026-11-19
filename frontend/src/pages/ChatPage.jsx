import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatHeader from '../components/Chat/ChatHeader'
import MessageList from '../components/Chat/MessageList'
import WelcomeScreen from '../components/Chat/WelcomeScreen'
import Composer from '../components/Composer/Composer'
import { useChatStore } from '../store/chatStore'
import { useConfigStore } from '../store/configStore'

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [composerDraft, setComposerDraft] = useState('')
  const {
    messages, messagesLoading, isStreaming, streamingMessageId, chatError,
    activeConversationId, loadConversation, newChat, sendMessage, stopStreaming,
    regenerateLast, editMessageAndResend,
  } = useChatStore()
  const config = useConfigStore((s) => s.config)
  const configError = useConfigStore((s) => s.error)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (id) {
        const conv = await loadConversation(id)
        if (!mounted) return
        if (!conv) navigate('/', { replace: true })
      } else {
        // if currently have an active persisted conversation but on root, keep as-is only if no id route intended? prefer fresh
        await newChat()
      }
    }
    run()
    return () => { mounted = false }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // If a conversation becomes active while on root (e.g. after first message created it), sync URL
  useEffect(() => {
    if (!id && activeConversationId) {
      navigate(`/chat/${activeConversationId}`, { replace: true })
    }
  }, [id, activeConversationId, navigate])

  const handleSend = async (text) => {
    await sendMessage(text)
  }

  const handleSuggestion = (text) => {
    setComposerDraft(text)
  }

  const showWelcome = !id && messages.length === 0 && !messagesLoading

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <ChatHeader />

      {messagesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-text-muted">Loading conversation...</div>
        </div>
      ) : showWelcome ? (
        <WelcomeScreen onSelect={handleSuggestion} />
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingMessageId={streamingMessageId}
          onRegenerate={regenerateLast}
          onEdit={editMessageAndResend}
          error={chatError}
        />
      )}

      {configError && !config && (
        <div className="mx-auto max-w-4xl w-full px-4 md:px-6 pb-2">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Configuration unavailable: {configError}. You can still try chatting if the backend is reachable.
          </div>
        </div>
      )}

      <Composer
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={messagesLoading}
        draft={composerDraft}
        setDraft={setComposerDraft}
      />
    </div>
  )
}

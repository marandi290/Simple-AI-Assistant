import { create } from 'zustand'
import {
  getConversations, createConversation, getConversation, updateConversation as apiUpdateConversation,
  deleteConversation as apiDeleteConversation, saveConversationMessages, streamChatMessage, sendChat,
} from '../services/chatService'
import { useConfigStore } from './configStore'

function uid() {
  return (globalThis.crypto?.randomUUID?.() || `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`)
}

function normalizeMessages(msgs = []) {
  return (msgs || []).map(m => ({
    id: m.id || uid(),
    role: m.role,
    content: m.content || '',
    created_at: m.created_at || new Date().toISOString(),
    model: m.model,
    provider: m.provider,
    error: m.error || false,
  }))
}

export const useChatStore = create((set, get) => ({
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  searchQuery: '',

  activeConversationId: null,
  activeConversation: null,
  messages: [],
  messagesLoading: false,

  isStreaming: false,
  streamingMessageId: null,
  abortController: null,
  chatError: null,
  toolStatus: null,

  setSearchQuery: (q) => set({ searchQuery: q }),

  fetchConversations: async (search) => {
    const q = search !== undefined ? search : get().searchQuery
    set({ conversationsLoading: true, conversationsError: null })
    try {
      const res = await getConversations(q)
      const list = res?.conversations || res || []
      set({ conversations: Array.isArray(list) ? list : [], conversationsLoading: false })
      return list
    } catch (e) {
      set({ conversationsLoading: false, conversationsError: e.message || 'Failed to load conversations' })
      return []
    }
  },

  loadConversation: async (id) => {
    if (!id) {
      set({ activeConversationId: null, activeConversation: null, messages: [], chatError: null })
      return null
    }
    // abort any active stream when switching
    try { get().abortController?.abort() } catch {}
    set({ messagesLoading: true, activeConversationId: id, chatError: null, isStreaming: false, streamingMessageId: null, abortController: null, toolStatus: null })
    try {
      const res = await getConversation(id)
      const conv = res?.conversation || res
      set({ activeConversation: conv, messages: normalizeMessages(conv?.messages || []), messagesLoading: false })
      return conv
    } catch (e) {
      set({ messagesLoading: false, chatError: e.message || 'Failed to load conversation', activeConversation: null, messages: [] })
      return null
    }
  },

  newChat: async () => {
    try { get().abortController?.abort() } catch {}
    set({ activeConversationId: null, activeConversation: null, messages: [], chatError: null, isStreaming: false, streamingMessageId: null, abortController: null, toolStatus: null })
  },

  createNewConversation: async (opts = {}) => {
    try {
      const settings = useConfigStore.getState().settings
      const res = await createConversation({
        title: opts.title || '',
        system_prompt: opts.system_prompt ?? (settings?.system_prompt || ''),
      })
      const conv = res?.conversation || res
      await get().fetchConversations()
      await get().loadConversation(conv.id)
      return conv
    } catch (e) {
      set({ chatError: e.message || 'Failed to create conversation' })
      return null
    }
  },

  renameConversation: async (id, title) => {
    try {
      const res = await apiUpdateConversation(id, { title })
      const conv = res?.conversation || res
      set((s) => ({
        conversations: s.conversations.map(c => c.id === id ? { ...c, title: conv?.title || title } : c),
        activeConversation: s.activeConversationId === id ? { ...(s.activeConversation || {}), ...conv } : s.activeConversation,
      }))
      return true
    } catch (e) {
      set({ chatError: e.message || 'Failed to rename conversation' })
      return false
    }
  },

  deleteConversation: async (id) => {
    const { activeConversationId } = get()
    try {
      await apiDeleteConversation(id)
      set((s) => ({ conversations: s.conversations.filter(c => c.id !== id) }))
      if (activeConversationId === id) {
        await get().newChat()
      }
      return true
    } catch (e) {
      set({ chatError: e.message || 'Failed to delete conversation' })
      return false
    }
  },

  stopStreaming: () => {
    const { abortController } = get()
    try { abortController?.abort() } catch {}
    set({ isStreaming: false, streamingMessageId: null, abortController: null, toolStatus: null })
  },

  _persistMessages: async (convId, messages) => {
    if (!convId) return
    try {
      await saveConversationMessages(convId, { messages: messages.map(m => ({ role: m.role, content: m.content, id: m.id, created_at: m.created_at, model: m.model, provider: m.provider })) })
      await get().fetchConversations()
    } catch {}
  },

  sendMessage: async (text, opts = {}) => {
    const content = (text || '').trim()
    if (!content) return
    const state = get()
    if (state.isStreaming) return

    const cfg = useConfigStore.getState()
    const settings = cfg.settings || {}
    const selectedModel = opts.model || settings.model || cfg.config?.active?.model
    const selectedProvider = opts.provider || settings.provider || cfg.config?.active?.provider

    let convId = state.activeConversationId
    let activeConv = state.activeConversation
    if (!convId) {
      const created = await get().createNewConversation()
      if (!created) return
      convId = created.id
      activeConv = get().activeConversation || created
    }

    const baseMessages = opts.baseMessages || get().messages
    const userMsg = { id: uid(), role: 'user', content, created_at: new Date().toISOString() }
    const assistantId = uid()
    const assistantMsg = { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString(), model: selectedModel, provider: selectedProvider }

    const messagesForUI = [...baseMessages, userMsg, assistantMsg]
    set({ messages: messagesForUI, chatError: null, toolStatus: null })

    const payloadMessages = [...baseMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
    const conversationSystemPrompt = (activeConv?.system_prompt || settings.system_prompt || '')
    const payload = {
      messages: payloadMessages,
      conversation_id: convId,
      model: selectedModel,
      provider: selectedProvider,
      system_prompt: conversationSystemPrompt || undefined,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    }

    const controller = new AbortController()
    set({ isStreaming: true, streamingMessageId: assistantId, abortController: controller })

    let streamedAny = false
    let finalText = ''

    const applyAssistant = (updater) => set((s) => ({
      messages: s.messages.map(m => m.id === assistantId ? updater(m) : m)
    }))

    try {
      await streamChatMessage(payload, {
        signal: controller.signal,
        onMeta: (data) => {
          if (data?.model) applyAssistant(m => ({ ...m, model: data.model }))
          if (data?.provider) applyAssistant(m => ({ ...m, provider: data.provider }))
        },
        onDelta: (data) => {
          const delta = data?.content || ''
          if (!delta) return
          streamedAny = true
          finalText += delta
          applyAssistant(m => ({ ...m, content: (m.content || '') + delta }))
        },
        onTool: (data) => {
          set({ toolStatus: data })
        },
        onDone: (data) => {
          finalText = (data?.content ?? finalText) || ''
          applyAssistant(m => ({ ...m, content: finalText }))
        },
        onError: (data) => {
          throw new Error(data?.message || 'Streaming error')
        },
      })
    } catch (err) {
      if (err?.name === 'AbortError') {
        // keep partial content
        set({ isStreaming: false, streamingMessageId: null, abortController: null, toolStatus: null })
        await get()._persistMessages(convId, get().messages.filter(m => !(m.role === 'assistant' && m.id === assistantId && !m.content)))
        await get().fetchConversations()
        return
      }

      // Fallback to non-streaming if stream failed before producing content
      if (!streamedAny) {
        try {
          const res = await sendChat(payload, { signal: controller.signal })
          const reply = res?.reply || ''
          finalText = reply
          applyAssistant(m => ({ ...m, content: reply, error: false }))
        } catch (e2) {
          const msg = e2?.message || err?.message || 'Failed to get response'
          applyAssistant(m => ({ ...m, content: m.content || msg, error: true }))
          set({ chatError: msg })
        }
      } else {
        set({ chatError: err?.message || 'Stream interrupted' })
      }
    } finally {
      set({ isStreaming: false, streamingMessageId: null, abortController: null, toolStatus: null })
      const latest = get().messages
      // If assistant ended empty and errored, keep as is; otherwise persist
      await get()._persistMessages(convId, latest)
      await get().fetchConversations()
      // refresh active conversation meta
      try {
        const res = await getConversation(convId)
        set({ activeConversation: res?.conversation || res })
      } catch {}
    }
  },

  regenerateLast: async () => {
    const { messages, isStreaming } = get()
    if (isStreaming || !messages.length) return
    // Find last assistant message and regenerate from the user message before it
    let lastAssistantIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') { lastAssistantIdx = i; break }
    }
    let cutIdx = lastAssistantIdx
    if (lastAssistantIdx === -1) {
      // maybe last is user, just resend
      const lastUserIdx = [...messages].map(m => m.role).lastIndexOf('user')
      if (lastUserIdx === -1) return
      const text = messages[lastUserIdx].content
      const base = messages.slice(0, lastUserIdx)
      await get().sendMessage(text, { baseMessages: base })
      return
    }
    // get preceding user
    let userIdx = -1
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { userIdx = i; break }
    }
    if (userIdx === -1) return
    const text = messages[userIdx].content
    const base = messages.slice(0, userIdx)
    set({ messages: base })
    await get().sendMessage(text, { baseMessages: base })
  },

  editMessageAndResend: async (messageId, newText) => {
    const { messages, isStreaming } = get()
    if (isStreaming) return
    const idx = messages.findIndex(m => m.id === messageId)
    if (idx === -1) return
    const msg = messages[idx]
    if (msg.role !== 'user') return
    const base = messages.slice(0, idx)
    set({ messages: base })
    await get().sendMessage(newText, { baseMessages: base })
  },
}))

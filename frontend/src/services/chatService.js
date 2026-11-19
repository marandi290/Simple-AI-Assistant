import { apiRequest, streamChat } from './api'

export function getConfig() {
  return apiRequest('/api/config')
}

export function getHealth() {
  return apiRequest('/api/health')
}

export function sendChat(payload, { signal } = {}) {
  return apiRequest('/api/chat', { method: 'POST', body: payload, signal })
}

export function streamChatMessage(payload, handlers) {
  return streamChat(payload, handlers)
}

export function getConversations(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return apiRequest(`/api/conversations${q}`)
}

export function createConversation(payload = {}) {
  return apiRequest('/api/conversations', { method: 'POST', body: payload })
}

export function getConversation(id) {
  return apiRequest(`/api/conversations/${id}`)
}

export function updateConversation(id, payload) {
  return apiRequest(`/api/conversations/${id}`, { method: 'PATCH', body: payload })
}

export function deleteConversation(id) {
  return apiRequest(`/api/conversations/${id}`, { method: 'DELETE' })
}

export function saveConversationMessages(id, payload) {
  return apiRequest(`/api/conversations/${id}/messages`, { method: 'PUT', body: payload })
}

export function getSettings() {
  return apiRequest('/api/settings')
}

export function updateSettings(payload) {
  return apiRequest('/api/settings', { method: 'PATCH', body: payload })
}

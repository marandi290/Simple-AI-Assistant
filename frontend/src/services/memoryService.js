import { apiRequest } from './api'

export function listMemories(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return apiRequest(`/api/memories${q}`)
}

export function createMemory(payload) {
  return apiRequest('/api/memories', { method: 'POST', body: payload })
}

export function updateMemory(id, payload) {
  return apiRequest(`/api/memories/${id}`, { method: 'PATCH', body: payload })
}

export function deleteMemory(id) {
  return apiRequest(`/api/memories/${id}`, { method: 'DELETE' })
}

export function toggleMemories(enabled) {
  return apiRequest('/api/memories/toggle', { method: 'POST', body: { enabled } })
}

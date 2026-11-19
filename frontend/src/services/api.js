const ENV_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_BASE_KEY = 'ai-ui-backend-url'

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(API_BASE_KEY)
    if (saved !== null) return saved.replace(/\/$/, '')
  }
  return ENV_API_BASE
}

export function setApiBase(url) {
  if (typeof window !== 'undefined') {
    const val = (url || '').trim().replace(/\/$/, '')
    localStorage.setItem(API_BASE_KEY, val)
  }
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getApiBase()}${p}`
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, signal } = options
  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const contentType = res.headers.get('content-type') || ''
  let data = null
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null)
  } else {
    const text = await res.text().catch(() => '')
    data = text ? { raw: text } : null
  }

  if (!res.ok) {
    const message = data?.detail || data?.error?.message || data?.message || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function streamChat(payload, { onMeta, onDelta, onTool, onDone, onError, signal } = {}) {
  const res = await fetch(buildUrl('/api/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      detail = data?.detail || data?.message || detail
    } catch {}
    throw new Error(detail)
  }

  if (!res.body) throw new Error('Streaming is not supported by this browser/environment.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false

  const dispatch = (event, data) => {
    if (event === 'meta') onMeta?.(data)
    else if (event === 'delta') onDelta?.(data)
    else if (event === 'tool') onTool?.(data)
    else if (event === 'done') { finished = true; onDone?.(data) }
    else if (event === 'error') { finished = true; onError?.(data) }
  }

  const processBuffer = () => {
    // SSE events separated by blank line
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      if (!rawEvent.trim()) continue
      let event = 'message'
      const dataLines = []
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      const dataStr = dataLines.join('\n')
      if (!dataStr) continue
      let data
      try { data = JSON.parse(dataStr) } catch { data = { raw: dataStr } }
      dispatch(event, data)
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      processBuffer()
      if (finished) break
    }
    buffer += decoder.decode().replace(/\r\n/g, '\n')
    processBuffer()
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw err
    }
    throw err
  } finally {
    try { reader.releaseLock() } catch {}
  }

  return { finished }
}

export { getApiBase as API_BASE, buildUrl }

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, RefreshCw, Save, Server, SlidersHorizontal, Brain, MessageSquareCode, XCircle, ExternalLink } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { useConfigStore } from '../store/configStore'
import Button from '../components/Common/Button'
import Badge from '../components/Common/Badge'
import { getApiBase, setApiBase } from '../services/api'
import { toggleMemories, listMemories } from '../services/memoryService'

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-border bg-bg-secondary p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-tertiary text-text-secondary"><Icon size={17} /></div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">{label}</label>
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore()
  const config = useConfigStore((s) => s.config)
  const settings = useConfigStore((s) => s.settings)
  const health = useConfigStore((s) => s.health)
  const loadConfig = useConfigStore((s) => s.load)
  const saveSettings = useConfigStore((s) => s.saveSettings)

  const [form, setForm] = useState({
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 1024,
    provider: '',
    model: '',
  })
  const [backendUrl, setBackendUrl] = useState(getApiBase())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [memoryBusy, setMemoryBusy] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        system_prompt: settings.system_prompt ?? config?.defaults?.system_prompt ?? '',
        temperature: settings.temperature ?? config?.defaults?.temperature ?? 0.7,
        max_tokens: settings.max_tokens ?? config?.defaults?.max_tokens ?? 1024,
        provider: settings.provider ?? config?.active?.provider ?? '',
        model: settings.model ?? config?.active?.model ?? '',
      })
    }
  }, [settings, config])

  useEffect(() => {
    listMemories().then((res) => setMemoryEnabled(res?.enabled !== false)).catch(() => {})
  }, [])

  const providers = config?.providers || []
  const models = config?.models || []
  const filteredModels = useMemo(() => {
    if (!form.provider) return models
    const ms = models.filter(m => !m.provider || m.provider === form.provider)
    return ms.length ? ms : models
  }, [models, form.provider])

  const onSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    const payload = {
      system_prompt: form.system_prompt,
      temperature: Number(form.temperature),
      max_tokens: Number(form.max_tokens),
      provider: form.provider,
      model: form.model,
    }
    const res = await saveSettings(payload)
    setSaving(false)
    setSaveMsg(res.ok ? { type: 'success', text: 'Settings saved.' } : { type: 'error', text: res.error || 'Failed to save settings.' })
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const onSaveConnection = async () => {
    setApiBase(backendUrl)
    await loadConfig()
    setSaveMsg({ type: 'success', text: 'Backend URL updated. Connection refreshed.' })
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const onMemoryToggle = async () => {
    setMemoryBusy(true)
    try {
      const next = !memoryEnabled
      setMemoryEnabled(next)
      await toggleMemories(next)
    } catch {}
    setMemoryBusy(false)
  }

  const connected = !!(health?.status === 'ok' || config?.backend?.connected)

  return (
    <div className="h-full overflow-y-auto bg-bg-primary">
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-6 md:py-8 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
            <p className="text-sm text-text-secondary mt-1">Configure your assistant, models, memory, and connection.</p>
          </div>
          <Button variant="secondary" onClick={() => loadConfig()}><RefreshCw size={15} /> Refresh</Button>
        </div>

        {saveMsg && (
          <div className={cn('rounded-lg border px-4 py-3 text-sm', saveMsg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300')}>
            {saveMsg.text}
          </div>
        )}

        <Section icon={SlidersHorizontal} title="General" description="Interface preferences stored locally in your browser.">
          <Field label="Theme" htmlFor="theme-select" hint="Saved as UI preference">
            <select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full sm:w-64 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Field>
          <p className="text-xs text-text-muted">Theme and sidebar state are stored locally. Conversations, memories, and model settings are persisted via the backend.</p>
        </Section>

        <Section icon={Server} title="Models" description="Provider and model configuration. Values are saved to backend settings when supported.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider" htmlFor="provider-select">
              <select id="provider-select" value={form.provider} onChange={(e) => setForm(f => ({ ...f, provider: e.target.value, model: (models.find(m => m.provider === e.target.value)?.id || f.model) }))} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
                {providers.length === 0 && <option value={form.provider || ''}>{form.provider || 'Default'}</option>}
                {providers.map((p) => <option key={p.id || p.name} value={p.id || p.name}>{p.name || p.id}</option>)}
              </select>
            </Field>
            <Field label="Model" htmlFor="model-select">
              <select id="model-select" value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
                {filteredModels.length === 0 && <option value={form.model || ''}>{form.model || 'Default model'}</option>}
                {filteredModels.map((m) => <option key={m.id || m.name} value={m.id || m.name}>{m.name || m.id}</option>)}
              </select>
            </Field>
            <Field label="Temperature" htmlFor="temp-input" hint="0–2">
              <input id="temp-input" type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => setForm(f => ({ ...f, temperature: e.target.value }))} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </Field>
            <Field label="Max output tokens" htmlFor="max-tokens-input">
              <input id="max-tokens-input" type="number" min="1" step="1" value={form.max_tokens} onChange={(e) => setForm(f => ({ ...f, max_tokens: e.target.value }))} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </Field>
          </div>
          <div className="flex justify-end"><Button variant="primary" onClick={onSave} disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save model settings'}</Button></div>
        </Section>

        <Section icon={Brain} title="Memory" description="Control memory usage and manage saved memories.">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-bg-primary/40 p-4">
            <div>
              <div className="text-sm font-medium text-text-primary">Enable memory</div>
              <div className="text-sm text-text-secondary mt-0.5">When enabled, saved memories may be included in chat context.</div>
            </div>
            <button onClick={onMemoryToggle} disabled={memoryBusy} className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', memoryEnabled ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-bg-tertiary text-text-secondary border-border')}>{memoryEnabled ? 'Enabled' : 'Disabled'}</button>
          </div>
          <Link to="/memory" className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover">Open memory manager <ExternalLink size={14} /></Link>
        </Section>

        <Section icon={MessageSquareCode} title="System Instructions" description="Default system prompt used for conversations (can be overridden per conversation).">
          <Field label="System prompt" htmlFor="system-prompt">
            <textarea id="system-prompt" value={form.system_prompt} onChange={(e) => setForm(f => ({ ...f, system_prompt: e.target.value }))} rows={6} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y font-mono leading-relaxed" />
          </Field>
          <div className="flex justify-end"><Button variant="primary" onClick={onSave} disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save instructions'}</Button></div>
        </Section>

        <Section icon={Server} title="Connection" description="Backend connectivity and API endpoint configuration.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border-subtle bg-bg-primary/40 p-4">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Backend status</div>
              <div className="flex items-center gap-2">
                {connected ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                <span className="text-sm text-text-primary">{connected ? 'Connected' : 'Unavailable'}</span>
                <Badge tone={connected ? 'success' : 'danger'}>{connected ? 'OK' : 'Error'}</Badge>
              </div>
              <div className="mt-2 text-xs text-text-muted">Active model: {config?.active?.model || settings?.model || 'Unknown'}</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-primary/40 p-4">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Active provider</div>
              <div className="text-sm text-text-primary font-medium">{config?.active?.provider || settings?.provider || 'Not configured'}</div>
              <div className="mt-2 text-xs text-text-muted">Streaming: {config?.features?.streaming ? 'Supported (SSE)' : 'Unknown'}</div>
            </div>
          </div>
          <Field label="Backend API URL" htmlFor="backend-url" hint="Leave empty for same-origin/proxy">
            <div className="flex flex-col sm:flex-row gap-2">
              <input id="backend-url" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} placeholder="http://localhost:8000" className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <Button variant="secondary" onClick={onSaveConnection}>Apply & refresh</Button>
            </div>
          </Field>
          {config?.notes && (
            <div className="text-xs text-text-muted space-y-1">
              {config.notes.persistence && <p>Persistence: {config.notes.persistence}</p>}
              {config.notes.memory && <p>Memory: {config.notes.memory}</p>}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function cn(...classes) { return classes.filter(Boolean).join(' ') }

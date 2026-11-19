import { useMemo, useState } from 'react'
import { ChevronDown, Cpu } from 'lucide-react'
import { useConfigStore } from '../../store/configStore'
import { cn } from '../../utils/cn'

export default function ModelSelector({ compact = false, className }) {
  const config = useConfigStore((s) => s.config)
  const settings = useConfigStore((s) => s.settings)
  const saveSettings = useConfigStore((s) => s.saveSettings)
  const [saving, setSaving] = useState(false)

  const providers = config?.providers || []
  const models = config?.models || []
  const activeProvider = settings?.provider || config?.active?.provider || ''
  const activeModel = settings?.model || config?.active?.model || ''

  const filteredModels = useMemo(() => {
    if (!activeProvider) return models
    const ms = models.filter(m => !m.provider || m.provider === activeProvider)
    return ms.length ? ms : models
  }, [models, activeProvider])

  const onProviderChange = async (e) => {
    const provider = e.target.value
    setSaving(true)
    const providerModels = models.filter(m => !m.provider || m.provider === provider)
    const nextModel = providerModels[0]?.id || activeModel
    await saveSettings({ provider, model: nextModel })
    setSaving(false)
  }

  const onModelChange = async (e) => {
    const model = e.target.value
    setSaving(true)
    await saveSettings({ model })
    setSaving(false)
  }

  if (!config && !settings) {
    return <div className={cn('text-xs text-text-muted', className)}>Loading model...</div>
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className="inline-flex items-center gap-1.5 text-xs text-text-muted mr-1">
        <Cpu size={14} />
        {!compact && <span>Model</span>}
      </div>
      <label className="relative">
        <span className="sr-only">Provider</span>
        <select
          value={activeProvider}
          onChange={onProviderChange}
          disabled={saving || providers.length === 0}
          className="appearance-none rounded-md border border-border bg-bg-tertiary/70 pl-2.5 pr-7 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
        >
          {providers.length === 0 && <option value={activeProvider || 'default'}>{activeProvider || 'Default'}</option>}
          {providers.map((p) => (
            <option key={p.id || p.name} value={p.id || p.name}>{p.name || p.id}</option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted" />
      </label>
      <label className="relative">
        <span className="sr-only">Model</span>
        <select
          value={activeModel}
          onChange={onModelChange}
          disabled={saving || filteredModels.length === 0}
          className={cn('appearance-none rounded-md border border-border bg-bg-tertiary/70 pl-2.5 pr-7 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50', compact ? 'max-w-[180px]' : 'max-w-[260px]')}
        >
          {filteredModels.length === 0 && <option value={activeModel || ''}>{activeModel || 'Default model'}</option>}
          {filteredModels.map((m) => (
            <option key={m.id || m.name} value={m.id || m.name}>{m.name || m.id}</option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted" />
      </label>
      {saving && <span className="text-xs text-text-muted">Saving...</span>}
    </div>
  )
}

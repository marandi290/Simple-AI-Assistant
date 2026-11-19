import { create } from 'zustand'
import { getConfig, getSettings, updateSettings as apiUpdateSettings, getHealth } from '../services/chatService'

export const useConfigStore = create((set, get) => ({
  config: null,
  settings: null,
  health: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const [configRes, settingsRes, healthRes] = await Promise.allSettled([
        getConfig(),
        getSettings(),
        getHealth(),
      ])
      const config = configRes.status === 'fulfilled' ? configRes.value : null
      const settings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.settings || settingsRes.value) : null
      const health = healthRes.status === 'fulfilled' ? healthRes.value : null
      const errors = [configRes, settingsRes].filter(r => r.status === 'rejected').map(r => r.reason?.message).filter(Boolean)
      set({ config, settings, health, loading: false, error: errors[0] || null })
      return { config, settings, health }
    } catch (e) {
      set({ loading: false, error: e.message || 'Failed to load configuration' })
      return null
    }
  },

  refreshConfig: async () => {
    try {
      const [configRes, healthRes] = await Promise.allSettled([getConfig(), getHealth()])
      set((s) => ({
        config: configRes.status === 'fulfilled' ? configRes.value : s.config,
        health: healthRes.status === 'fulfilled' ? healthRes.value : s.health,
      }))
    } catch {}
  },

  saveSettings: async (patch) => {
    try {
      const res = await apiUpdateSettings(patch)
      const settings = res?.settings || res
      set({ settings })
      // refresh config defaults/active if relevant
      try { await get().refreshConfig() } catch {}
      return { ok: true, settings }
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to update settings' }
    }
  },

  getActiveModel: () => {
    const { config, settings } = get()
    return settings?.model || config?.active?.model || ''
  },
  getActiveProvider: () => {
    const { config, settings } = get()
    return settings?.provider || config?.active?.provider || ''
  },
  getModels: () => {
    const { config } = get()
    const models = config?.models || []
    if (Array.isArray(models)) return models
    return []
  },
  getProviders: () => {
    const { config } = get()
    const providers = config?.providers || []
    if (Array.isArray(providers)) return providers
    return []
  },
}))

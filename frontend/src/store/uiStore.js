import { create } from 'zustand'

const THEME_KEY = 'ai-ui-theme'
const SIDEBAR_KEY = 'ai-ui-sidebar-collapsed'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'dark'
}

function getInitialSidebar() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SIDEBAR_KEY) === 'true'
}

export const useUIStore = create((set) => ({
  theme: getInitialTheme(),
  sidebarCollapsed: getInitialSidebar(),
  mobileSidebarOpen: false,

  setTheme: (theme) => {
    const next = theme === 'light' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    set({ theme: next })
  },
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    return { theme: next }
  }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem(SIDEBAR_KEY, String(!!collapsed))
    set({ sidebarCollapsed: !!collapsed })
  },
  toggleSidebar: () => set((s) => {
    const next = !s.sidebarCollapsed
    localStorage.setItem(SIDEBAR_KEY, String(next))
    return { sidebarCollapsed: next }
  }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: !!open }),
}))

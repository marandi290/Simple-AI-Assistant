import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/Common/AppLayout'
import ChatPage from './pages/ChatPage'
import MemoryPage from './pages/MemoryPage'
import SettingsPage from './pages/SettingsPage'
import { useUIStore } from './store/uiStore'
import { useConfigStore } from './store/configStore'
import { useChatStore } from './store/chatStore'

export default function App() {
  const theme = useUIStore((s) => s.theme)
  const loadConfig = useConfigStore((s) => s.load)
  const fetchConversations = useChatStore((s) => s.fetchConversations)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    loadConfig()
    fetchConversations()
  }, [loadConfig, fetchConversations])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/memory" element={<MemoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

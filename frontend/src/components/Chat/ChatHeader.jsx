import { Menu, PanelLeft, Wifi, WifiOff } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useConfigStore } from '../../store/configStore'
import { useChatStore } from '../../store/chatStore'
import ModelSelector from '../ModelSelector/ModelSelector'
import IconButton from '../Common/IconButton'
import Badge from '../Common/Badge'

export default function ChatHeader() {
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const config = useConfigStore((s) => s.config)
  const health = useConfigStore((s) => s.health)
  const activeConversation = useChatStore((s) => s.activeConversation)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const toolStatus = useChatStore((s) => s.toolStatus)

  const connected = !!(health?.status === 'ok' || config?.backend?.connected)
  const title = activeConversation?.title || 'New chat'

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-bg-secondary/50 px-3 md:px-5 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="md:hidden">
          <IconButton label="Open menu" onClick={() => setMobileSidebarOpen(true)}>
            <Menu size={18} />
          </IconButton>
        </div>
        <div className="hidden md:block">
          <IconButton label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleSidebar}>
            <PanelLeft size={18} />
          </IconButton>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">{title}</h2>
            {isStreaming && <Badge tone="warning">Generating</Badge>}
            {toolStatus?.status === 'running' && <Badge>Using tool: {toolStatus.name}</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
            {connected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-red-400" />}
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
            {config?.active?.provider && <span className="hidden sm:inline">· {config.active.provider}</span>}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <ModelSelector compact />
      </div>
    </header>
  )
}

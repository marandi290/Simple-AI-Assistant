import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import { useUIStore } from '../../store/uiStore'
import { cn } from '../../utils/cn'

export default function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen)

  return (
    <div className="h-full min-h-screen bg-bg-primary text-text-primary">
      <div className="flex h-screen overflow-hidden">
        <div className={cn('hidden md:block shrink-0 transition-all duration-200', sidebarCollapsed ? 'w-[72px]' : 'w-[300px]')}>
          <Sidebar />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
            <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] shadow-panel">
              <Sidebar mobile />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 h-full overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  Bot, Brain, ChevronLeft, ChevronRight, MessageSquarePlus, PanelLeftClose, PanelLeftOpen,
  Pencil, Plus, Search, Settings, Trash2, UserCircle2, X
} from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useUIStore } from '../../store/uiStore'
import { useConfigStore } from '../../store/configStore'
import { cn } from '../../utils/cn'
import { groupConversationsByDate } from '../../utils/date'
import IconButton from '../Common/IconButton'
import Modal from '../Common/Modal'
import Button from '../Common/Button'

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary/70 hover:text-text-primary',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ mobile = false }) {
  const navigate = useNavigate()
  const { id: activeIdParam } = useParams()
  const {
    conversations, conversationsLoading, fetchConversations, createNewConversation,
    renameConversation, deleteConversation, activeConversationId, searchQuery, setSearchQuery,
  } = useChatStore()
  const { sidebarCollapsed, toggleSidebar, setMobileSidebarOpen } = useUIStore()
  const config = useConfigStore((s) => s.config)
  const collapsed = mobile ? false : sidebarCollapsed
  const activeId = activeConversationId || activeIdParam

  const [renameTarget, setRenameTarget] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const grouped = useMemo(() => groupConversationsByDate(conversations), [conversations])

  const onNewChat = async () => {
    setMobileSidebarOpen(false)
    await createNewConversation()
    navigate('/')
  }

  const onSelect = (id) => {
    setMobileSidebarOpen(false)
    navigate(`/chat/${id}`)
  }

  const onSearchChange = async (e) => {
    const v = e.target.value
    setSearchQuery(v)
    await fetchConversations(v)
  }

  const submitRename = async () => {
    if (!renameTarget) return
    setBusy(true)
    await renameConversation(renameTarget.id, renameValue.trim() || renameTarget.title)
    setBusy(false)
    setRenameTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    const ok = await deleteConversation(deleteTarget.id)
    setBusy(false)
    setDeleteTarget(null)
    if (ok && String(activeId) === String(deleteTarget.id)) navigate('/')
  }

  return (
    <aside className="flex h-full flex-col border-r border-border bg-bg-secondary/80 backdrop-blur-sm">
      <div className={cn('flex items-center gap-2 border-b border-border-subtle p-3', collapsed ? 'justify-center' : 'justify-between')}>
        <div className={cn('flex items-center gap-2 min-w-0', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/20">
            <Bot size={18} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text-primary">{import.meta.env.VITE_APP_NAME || 'Simple AI Assistant'}</div>
              <div className="truncate text-xs text-text-muted">Personal workspace</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {mobile ? (
            <IconButton label="Close sidebar" onClick={() => setMobileSidebarOpen(false)}><X size={16} /></IconButton>
          ) : (
            <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleSidebar}>
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </IconButton>
          )}
        </div>
      </div>

      <div className="p-2 space-y-2">
        <button
          onClick={onNewChat}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-border bg-bg-tertiary/60 px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title="New chat"
        >
          <MessageSquarePlus size={16} className="text-accent" />
          {!collapsed && <span className="font-medium">New Chat</span>}
        </button>

        {!collapsed && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search conversations"
              className="w-full rounded-lg border border-border-subtle bg-bg-primary/60 py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversationsLoading && !collapsed && (
          <div className="px-2 py-3 text-xs text-text-muted">Loading conversations...</div>
        )}
        {!conversationsLoading && conversations.length === 0 && !collapsed && (
          <div className="px-2 py-3 text-xs text-text-muted">No conversations yet.</div>
        )}
        {grouped.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{group.label}</div>}
            <div className="space-y-1">
              {group.items.map((c) => {
                const active = String(activeId) === String(c.id)
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'group flex items-center gap-1 rounded-lg border border-transparent',
                      active ? 'bg-bg-tertiary border-border-subtle' : 'hover:bg-bg-tertiary/60'
                    )}
                  >
                    <button
                      onClick={() => onSelect(c.id)}
                      className={cn('flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left', collapsed && 'justify-center')}
                      title={c.title || 'New Chat'}
                    >
                      <div className={cn('h-2 w-2 rounded-full shrink-0', active ? 'bg-accent' : 'bg-border')} />
                      {!collapsed && (
                        <div className="min-w-0">
                          <div className="truncate text-sm text-text-primary">{c.title || 'New Chat'}</div>
                          {c.preview && <div className="truncate text-xs text-text-muted">{c.preview}</div>}
                        </div>
                      )}
                    </button>
                    {!collapsed && (
                      <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <IconButton label="Rename conversation" onClick={() => { setRenameTarget(c); setRenameValue(c.title || '') }}>
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton label="Delete conversation" onClick={() => setDeleteTarget(c)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border-subtle p-2 space-y-1">
        <NavItem to="/memory" icon={Brain} label="Memory" collapsed={collapsed} onClick={() => setMobileSidebarOpen(false)} />
        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onClick={() => setMobileSidebarOpen(false)} />
        <div className={cn('mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary', collapsed && 'justify-center px-2')} title={collapsed ? 'Profile' : undefined}>
          <UserCircle2 size={18} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-text-primary">Local User</div>
              <div className="truncate text-xs text-text-muted">{config?.active?.provider || 'Assistant'}</div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!renameTarget}
        title="Rename conversation"
        onClose={() => !busy && setRenameTarget(null)}
        actions={<>
          <Button variant="ghost" onClick={() => setRenameTarget(null)} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submitRename} disabled={busy}>Save</Button>
        </>}
      >
        <label className="block text-sm text-text-secondary mb-1" htmlFor="rename-input">Title</label>
        <input
          id="rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') submitRename() }}
        />
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Delete conversation"
        onClose={() => !busy && setDeleteTarget(null)}
        actions={<>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={busy}>Delete</Button>
        </>}
      >
        <p className="text-sm text-text-secondary">Delete <span className="text-text-primary font-medium">"{deleteTarget?.title || 'this conversation'}"</span>? This cannot be undone.</p>
      </Modal>
    </aside>
  )
}

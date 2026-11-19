import { useEffect, useMemo, useState } from 'react'
import { Brain, Plus, RefreshCw, Search, Save, Trash2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import IconButton from '../components/Common/IconButton'
import Badge from '../components/Common/Badge'
import { listMemories, createMemory, updateMemory, deleteMemory, toggleMemories } from '../services/memoryService'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/date'

export default function MemoryPage() {
  const [memories, setMemories] = useState([])
  const [enabled, setEnabled] = useState(true)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', enabled: true })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async (q = search) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listMemories(q)
      setMemories(res?.memories || [])
      setEnabled(res?.enabled !== false)
    } catch (e) {
      setError(e.message || 'Failed to load memories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, []) // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => load(search), 250)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  const openNew = () => {
    setEditing(null)
    setForm({ title: '', content: '', enabled: true })
    setEditorOpen(true)
  }

  const openEdit = (m) => {
    setEditing(m)
    setForm({ title: m.title || '', content: m.content || '', enabled: m.enabled !== false })
    setEditorOpen(true)
  }

  const save = async () => {
    if (!form.content.trim()) return
    setSaving(true)
    try {
      if (editing) await updateMemory(editing.id, form)
      else await createMemory(form)
      setEditorOpen(false)
      await load()
    } catch (e) {
      setError(e.message || 'Failed to save memory')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteMemory(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setError(e.message || 'Failed to delete memory')
    } finally {
      setSaving(false)
    }
  }

  const onToggleAll = async () => {
    try {
      const next = !enabled
      setEnabled(next)
      await toggleMemories(next)
    } catch (e) {
      setError(e.message || 'Failed to update memory setting')
      setEnabled((v) => !v)
    }
  }

  const onToggleOne = async (m) => {
    try {
      const updated = await updateMemory(m.id, { enabled: !m.enabled })
      setMemories((list) => list.map(x => x.id === m.id ? (updated?.memory || { ...x, enabled: !x.enabled }) : x))
    } catch (e) {
      setError(e.message || 'Failed to update memory')
    }
  }

  const count = useMemo(() => memories.length, [memories])

  return (
    <div className="h-full overflow-y-auto bg-bg-primary">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center"><Brain size={16} /></div>
              <h1 className="text-xl font-semibold text-text-primary">Memory</h1>
            </div>
            <p className="text-sm text-text-secondary">Manage saved memories used to personalize assistant responses. Memory is separate from conversation history.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => load()} title="Refresh"><RefreshCw size={15} /> Refresh</Button>
            <Button variant="primary" onClick={openNew}><Plus size={15} /> Add memory</Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button className="text-xs underline" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_auto] mb-5">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="w-full rounded-lg border border-border bg-bg-secondary pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={onToggleAll}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors min-w-[220px]',
              enabled ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-border bg-bg-secondary text-text-secondary'
            )}
          >
            <span className="font-medium">Memory {enabled ? 'enabled' : 'disabled'}</span>
            {enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
          <span>{count} {count === 1 ? 'memory' : 'memories'}</span>
          {!enabled && <span>Memories are saved but not injected into chat context while disabled.</span>}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center text-sm text-text-muted">Loading memories...</div>
        ) : memories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bg-secondary/40 p-10 text-center">
            <Brain size={28} className="mx-auto mb-3 text-text-muted" />
            <h3 className="text-sm font-medium text-text-primary">No memories found</h3>
            <p className="mt-1 text-sm text-text-secondary">Add memories to help the assistant retain preferences and important context.</p>
            <Button variant="primary" className="mt-4" onClick={openNew}><Plus size={15} /> Add memory</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {memories.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-bg-secondary p-4 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-text-primary truncate">{m.title || 'Untitled memory'}</h3>
                      <Badge tone={m.enabled !== false ? 'success' : 'default'}>{m.enabled !== false ? 'Active' : 'Disabled'}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <div className="mt-3 text-xs text-text-muted">Updated {formatDate(m.updated_at || m.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton label={m.enabled !== false ? 'Disable memory' : 'Enable memory'} onClick={() => onToggleOne(m)}>
                      {m.enabled !== false ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                    </IconButton>
                    <IconButton label="Edit memory" onClick={() => openEdit(m)}><Pencil size={15} /></IconButton>
                    <IconButton label="Delete memory" onClick={() => setDeleteTarget(m)}><Trash2 size={15} /></IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={editorOpen}
        title={editing ? 'Edit memory' : 'Add memory'}
        onClose={() => !saving && setEditorOpen(false)}
        actions={<>
          <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || !form.content.trim()}><Save size={15} /> {saving ? 'Saving...' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1" htmlFor="mem-title">Title</label>
            <input id="mem-title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. Preferred coding style" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1" htmlFor="mem-content">Content <span className="text-red-400">*</span></label>
            <textarea id="mem-content" value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y" placeholder="What should the assistant remember?" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm(f => ({ ...f, enabled: e.target.checked }))} className="rounded border-border bg-bg-primary" />
            Enabled
          </label>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Delete memory"
        onClose={() => !saving && setDeleteTarget(null)}
        actions={<>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>
        </>}
      >
        <p className="text-sm text-text-secondary">Delete memory <span className="text-text-primary font-medium">"{deleteTarget?.title || 'Untitled memory'}"</span>?</p>
      </Modal>
    </div>
  )
}

import { cn } from '../../utils/cn'

export default function Badge({ children, className, tone = 'default' }) {
  const tones = {
    default: 'bg-bg-tertiary text-text-secondary border-border-subtle',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone] || tones.default, className)}>
      {children}
    </span>
  )
}

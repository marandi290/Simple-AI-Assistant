import { cn } from '../../utils/cn'

export default function IconButton({ className, label, children, variant = 'ghost', ...props }) {
  const variants = {
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
    subtle: 'text-text-secondary hover:text-text-primary bg-bg-tertiary/60 hover:bg-bg-tertiary border border-border-subtle',
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        variants[variant] || variants.ghost,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

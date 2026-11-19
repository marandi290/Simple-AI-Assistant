import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-accent hover:bg-accent-hover text-white border-transparent',
  secondary: 'bg-bg-tertiary hover:bg-bg-elevated text-text-primary border-border',
  ghost: 'bg-transparent hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border-transparent',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20',
}

export default function Button({ className, variant = 'secondary', size = 'md', ...props }) {
  const sizes = {
    sm: 'h-8 px-3 text-sm rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    icon: 'h-9 w-9 p-0 rounded-lg',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        variants[variant] || variants.secondary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  )
}

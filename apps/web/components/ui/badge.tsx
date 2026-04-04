import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'covered'
  | 'conditional'
  | 'preferred'
  | 'nonpreferred'
  | 'not_covered'
  | 'unclear'
  | 'cyan'
  | 'violet'
  | 'outline'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:     'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  covered:     'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  conditional: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  preferred:   'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  nonpreferred:'bg-orange-500/15 text-orange-400 ring-orange-500/30',
  not_covered: 'bg-red-500/15 text-red-400 ring-red-500/30',
  unclear:     'bg-gray-500/15 text-gray-400 ring-gray-500/30',
  cyan:        'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
  violet:      'bg-violet-500/15 text-violet-400 ring-violet-500/30',
  outline:     'bg-transparent text-slate-400 ring-navy-600',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

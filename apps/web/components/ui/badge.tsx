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
  default:     'bg-slate-100 text-slate-700 ring-slate-200',
  covered:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  conditional: 'bg-amber-50 text-amber-700 ring-amber-200',
  preferred:   'bg-cyan-50 text-cyan-700 ring-cyan-200',
  nonpreferred:'bg-orange-50 text-orange-700 ring-orange-200',
  not_covered: 'bg-rose-50 text-rose-700 ring-rose-200',
  unclear:     'bg-slate-100 text-slate-600 ring-slate-200',
  cyan:        'bg-cyan-50 text-cyan-700 ring-cyan-200',
  violet:      'bg-violet-50 text-violet-700 ring-violet-200',
  outline:     'bg-white text-slate-700 ring-slate-200',
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

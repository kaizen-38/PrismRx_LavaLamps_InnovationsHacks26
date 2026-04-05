import { cn } from '@/lib/utils'

const WIDTH_CLASS = {
  default: 'max-w-[1280px]',
  narrow: 'max-w-[1080px]',
  wide: 'max-w-[1360px]',
} as const

export function WorkspacePage({
  children,
  width = 'default',
  className,
}: {
  children: React.ReactNode
  width?: keyof typeof WIDTH_CLASS
  className?: string
}) {
  return (
    <div className="workspace-page">
      <div className={cn('workspace-page__inner', WIDTH_CLASS[width], className)}>{children}</div>
    </div>
  )
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  icon,
  aside,
  className,
}: {
  eyebrow?: string
  title: string
  description: React.ReactNode
  icon?: React.ReactNode
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('workspace-header-block', className)}>
      <div className="workspace-header-block__copy">
        {eyebrow ? <p className="workspace-eyebrow">{eyebrow}</p> : null}
        <div className="workspace-title-row">
          {icon ? <span className="workspace-title-icon">{icon}</span> : null}
          <div>
            <h1 className="workspace-title">{title}</h1>
            <p className="workspace-description">{description}</p>
          </div>
        </div>
      </div>
      {aside ? <div className="workspace-header-block__aside">{aside}</div> : null}
    </div>
  )
}

export function WorkspaceMetricCard({
  label,
  value,
  tone = 'default',
  meta,
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'violet'
  meta?: React.ReactNode
}) {
  return (
    <div className="workspace-metric-card">
      <p className="workspace-metric-card__label">{label}</p>
      <p className={cn('workspace-metric-card__value', `workspace-metric-card__value--${tone}`)}>{value}</p>
      {meta ? <div className="workspace-metric-card__meta">{meta}</div> : null}
    </div>
  )
}

import { cn, frictionLevel, FRICTION_LEVEL_COLOR, FRICTION_LEVEL_LABEL } from '@/lib/utils'
import type { FrictionFactors } from '@/lib/types'

interface FrictionBadgeProps {
  score: number
  factors?: FrictionFactors
  size?: 'sm' | 'md'
  showFactors?: boolean
  className?: string
}

const FACTOR_LABELS: Record<keyof FrictionFactors, string> = {
  prior_failure_count:    'Prior failures',
  specialist_gate:        'Specialist req.',
  lab_biomarker_gate:     'Lab/biomarker req.',
  site_of_care_restriction: 'Site restriction',
  renewal_complexity:     'Complex renewal',
}

export function FrictionBadge({
  score,
  factors,
  size = 'sm',
  showFactors = false,
  className,
}: FrictionBadgeProps) {
  const level = frictionLevel(score)
  const colorClass = FRICTION_LEVEL_COLOR[level]

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      {/* Score chip */}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md font-mono font-semibold ring-1 ring-inset',
          size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
          colorClass,
          level === 'low'    && 'ring-emerald-500/30',
          level === 'medium' && 'ring-amber-500/30',
          level === 'high'   && 'ring-red-500/30',
        )}
        title={`Access Friction Score: ${score}/100 — ${FRICTION_LEVEL_LABEL[level]}`}
      >
        {/* Mini bar */}
        <span className="relative flex-shrink-0 w-2.5 h-2.5">
          <FrictionGlyph score={score} level={level} />
        </span>
        {score}
      </span>

      {/* Factor breakdown — shown in drawer / expanded views */}
      {showFactors && factors && (
        <FrictionFactorList factors={factors} />
      )}
    </div>
  )
}

// ── Mini glyph (3-bar meter) ──────────────────────────────────────────────────

function FrictionGlyph({ score, level }: { score: number; level: 'low' | 'medium' | 'high' }) {
  const COLORS = {
    low:    '#10b981',
    medium: '#f59e0b',
    high:   '#ef4444',
  }
  const color = COLORS[level]
  const bars = [
    score > 0,
    score > 33,
    score > 66,
  ]

  return (
    <svg viewBox="0 0 10 10" fill="none" className="w-full h-full">
      {bars.map((active, i) => (
        <rect
          key={i}
          x={i * 4}
          y={active ? 0 : 5}
          width={2.5}
          height={active ? 10 : 5}
          rx={0.5}
          fill={active ? color : '#1e2d4d'}
        />
      ))}
    </svg>
  )
}

// ── Factor list ───────────────────────────────────────────────────────────────

export function FrictionFactorList({ factors }: { factors: FrictionFactors }) {
  const activeFactors: string[] = []

  if (factors.prior_failure_count > 0) {
    activeFactors.push(
      factors.prior_failure_count === 1
        ? 'Prior failure: 1 required'
        : `Prior failures: ${factors.prior_failure_count} required`,
    )
  }
  if (factors.specialist_gate)            activeFactors.push(FACTOR_LABELS.specialist_gate)
  if (factors.lab_biomarker_gate)         activeFactors.push(FACTOR_LABELS.lab_biomarker_gate)
  if (factors.site_of_care_restriction)   activeFactors.push(FACTOR_LABELS.site_of_care_restriction)
  if (factors.renewal_complexity)         activeFactors.push(FACTOR_LABELS.renewal_complexity)

  if (activeFactors.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">No significant friction factors.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {activeFactors.map((f) => (
        <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  )
}

// ── Friction score bar (used in drawer) ───────────────────────────────────────

export function FrictionScoreBar({ score }: { score: number }) {
  const level = frictionLevel(score)
  const TRACK_COLOR = {
    low:    'bg-emerald-500',
    medium: 'bg-amber-500',
    high:   'bg-red-500',
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-navy-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', TRACK_COLOR[level])}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={cn(
        'font-mono text-sm font-bold w-8 text-right',
        level === 'low'    && 'text-emerald-400',
        level === 'medium' && 'text-amber-400',
        level === 'high'   && 'text-red-400',
      )}>
        {score}
      </span>
    </div>
  )
}

import { cn, frictionLevel, FRICTION_LEVEL_LABEL } from '@/lib/utils'
import type { FrictionFactors } from '@/lib/types'

interface FrictionBadgeProps {
  score: number
  factors?: FrictionFactors
  size?: 'sm' | 'md'
  showFactors?: boolean
  className?: string
}

const FACTOR_LABELS: Record<keyof FrictionFactors, string> = {
  prior_failure_count:      'Prior failures',
  specialist_gate:          'Specialist req.',
  lab_biomarker_gate:       'Lab/biomarker req.',
  site_of_care_restriction: 'Site restriction',
  renewal_complexity:       'Complex renewal',
}

// Paperlight-native semantic colors (no dark bg required)
const LEVEL_STYLE = {
  low:    { color: '#0F766E', bg: '#EAF8F4', ring: '#0F766E30' },
  medium: { color: '#B45309', bg: '#FFF6E8', ring: '#B4530930' },
  high:   { color: '#C2410C', bg: '#FFF1EB', ring: '#C2410C30' },
}

export function FrictionBadge({ score, factors, size = 'sm', showFactors = false, className }: FrictionBadgeProps) {
  const level = frictionLevel(score)
  const s = LEVEL_STYLE[level]

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: size === 'sm' ? '2px 6px' : '4px 8px',
          borderRadius: 6,
          fontSize: size === 'sm' ? 11 : 13,
          fontWeight: 700,
          fontFamily: 'IBM Plex Mono, monospace',
          color: s.color,
          background: s.bg,
          outline: `1px solid ${s.ring}`,
        }}
        title={`Access Friction Score: ${score}/100 — ${FRICTION_LEVEL_LABEL[level]}`}
      >
        <span className="relative flex-shrink-0 w-2.5 h-2.5">
          <FrictionGlyph score={score} level={level} />
        </span>
        {score}
      </span>

      {showFactors && factors && <FrictionFactorList factors={factors} />}
    </div>
  )
}

// ── Glyph ─────────────────────────────────────────────────────────────────────

function FrictionGlyph({ score, level }: { score: number; level: 'low' | 'medium' | 'high' }) {
  const color = LEVEL_STYLE[level].color
  const bars = [score > 0, score > 33, score > 66]

  return (
    <svg viewBox="0 0 10 10" fill="none" className="w-full h-full">
      {bars.map((active, i) => (
        <rect
          key={i}
          x={i * 4} y={active ? 0 : 5}
          width={2.5} height={active ? 10 : 5}
          rx={0.5}
          fill={active ? color : '#CBD5E1'}
        />
      ))}
    </svg>
  )
}

// ── Factor list ───────────────────────────────────────────────────────────────

export function FrictionFactorList({ factors }: { factors: FrictionFactors }) {
  const activeFactors: string[] = []

  if (factors.prior_failure_count > 0)
    activeFactors.push(factors.prior_failure_count === 1 ? 'Prior failure: 1 required' : `Prior failures: ${factors.prior_failure_count} required`)
  if (factors.specialist_gate)            activeFactors.push(FACTOR_LABELS.specialist_gate)
  if (factors.lab_biomarker_gate)         activeFactors.push(FACTOR_LABELS.lab_biomarker_gate)
  if (factors.site_of_care_restriction)   activeFactors.push(FACTOR_LABELS.site_of_care_restriction)
  if (factors.renewal_complexity)         activeFactors.push(FACTOR_LABELS.renewal_complexity)

  if (activeFactors.length === 0) {
    return <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No significant friction factors.</p>
  }

  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {activeFactors.map((f) => (
        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
          {f}
        </li>
      ))}
    </ul>
  )
}

// ── Score bar (used in drawer) ─────────────────────────────────────────────────

export function FrictionScoreBar({ score }: { score: number }) {
  const level = frictionLevel(score)
  const barColor = LEVEL_STYLE[level].color

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          flex: 1, height: 6, borderRadius: 9999,
          background: '#E7EDF5', overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%', borderRadius: 9999,
            background: barColor,
            width: `${Math.min(score, 100)}%`,
            transition: 'width 500ms ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 14, fontWeight: 700,
          color: barColor, width: 32, textAlign: 'right',
        }}
      >
        {score}
      </span>
    </div>
  )
}

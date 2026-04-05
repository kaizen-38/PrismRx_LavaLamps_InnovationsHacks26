'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Change Radar component
// Renders a single PolicyDiff: header metrics, change-by-change diff rows,
// and optional side-by-side or timeline view toggle.
// Used on /radar page and embeddable anywhere a diff is needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { PolicyDiff, PolicyChange, ChangeDirection, ChangeImpact } from '@/lib/types'

interface ChangeRadarProps {
  diff: PolicyDiff
  /** If true, show compact single-line rows instead of expanded diff blocks */
  compact?: boolean
}

export default function ChangeRadar({ diff, compact = false }: ChangeRadarProps) {
  const [filter, setFilter] = useState<ChangeDirection | 'all'>('all')

  const visibleChanges =
    filter === 'all'
      ? diff.changes
      : diff.changes.filter((c) => c.change_type === filter)

  const tightenedCount = diff.changes.filter((c) => c.change_type === 'tightened').length
  const loosenedCount  = diff.changes.filter((c) => c.change_type === 'loosened').length
  const addedCount     = diff.changes.filter((c) => c.change_type === 'added').length
  const removedCount   = diff.changes.filter((c) => c.change_type === 'removed').length

  return (
    <div className="workspace-panel overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className={`border-b px-5 py-4 ${directionHeaderBg(diff.overall_direction)}`} style={{ borderColor: 'var(--line-soft)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold" style={{ color: 'var(--ink-strong)' }}>
                {diff.drug_display_name}
                <span className="font-normal" style={{ color: 'var(--ink-faint)' }}> · </span>
                {diff.payer_name}
              </h3>
              <DirectionBadge direction={diff.overall_direction} />
            </div>
            <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--ink-muted)' }}>
              {diff.version_before} → {diff.version_after}
              <span className="mx-1.5">·</span>
              {diff.date_before} → {diff.date_after}
            </p>
          </div>

          {/* Friction delta */}
          <FrictionDeltaWidget
            before={diff.friction_before}
            after={diff.friction_after}
            delta={diff.friction_delta}
          />
        </div>

        {/* Change type pill counts */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <FilterPill
            label="All"
            count={diff.changes.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color="slate"
          />
          {tightenedCount > 0 && (
            <FilterPill
              label="Tightened"
              count={tightenedCount}
              active={filter === 'tightened'}
              onClick={() => setFilter('tightened')}
              color="red"
            />
          )}
          {loosenedCount > 0 && (
            <FilterPill
              label="Loosened"
              count={loosenedCount}
              active={filter === 'loosened'}
              onClick={() => setFilter('loosened')}
              color="green"
            />
          )}
          {addedCount > 0 && (
            <FilterPill
              label="Added"
              count={addedCount}
              active={filter === 'added'}
              onClick={() => setFilter('added')}
              color="blue"
            />
          )}
          {removedCount > 0 && (
            <FilterPill
              label="Removed"
              count={removedCount}
              active={filter === 'removed'}
              onClick={() => setFilter('removed')}
              color="amber"
            />
          )}
        </div>
      </div>

      {/* ── Changes ───────────────────────────────────────────────────────── */}
      <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
        {visibleChanges.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
            No changes match this filter.
          </p>
        ) : (
          visibleChanges.map((change, i) =>
            compact ? (
              <CompactChangeRow key={i} change={change} />
            ) : (
              <ExpandedChangeRow key={i} change={change} />
            ),
          )
        )}
      </div>
    </div>
  )
}

// ── ExpandedChangeRow ─────────────────────────────────────────────────────────

function ExpandedChangeRow({ change }: { change: PolicyChange }) {
  const [showCitations, setShowCitations] = useState(false)
  const cfg = changeConfig(change.change_type)

  return (
    <div className={`px-5 py-4 ${cfg.rowBg}`}>
      {/* Field label + impact */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <DirectionChip type={change.change_type} />
        <span className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>{change.field_label}</span>
        <ImpactBadge impact={change.impact} />
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border px-3 py-2" style={{ background: 'var(--bg-soft)', borderColor: 'rgba(239, 68, 68, 0.15)' }}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-700">Before</p>
          <p className="leading-relaxed" style={{ color: 'var(--ink-body)' }}>{change.before}</p>
        </div>
        <div className="rounded-lg border px-3 py-2" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(16, 185, 129, 0.18)' }}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">After</p>
          <p className="leading-relaxed" style={{ color: 'var(--ink-strong)' }}>{change.after}</p>
        </div>
      </div>

      {/* Citations toggle */}
      {(change.citation_before || change.citation_after) && (
        <button
          type="button"
          onClick={() => setShowCitations((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs transition-colors hover:text-slate-900"
          style={{ color: 'var(--ink-muted)' }}
        >
          <ChevronIcon open={showCitations} />
          {showCitations ? 'Hide' : 'Show'} source citations
        </button>
      )}

      {showCitations && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[change.citation_before, change.citation_after].map((cite, idx) =>
            cite ? (
              <div
                key={idx}
                className="space-y-1 rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: 'var(--line-soft)', background: 'var(--bg-soft)' }}
              >
                <p className="truncate font-semibold text-cyan-700">{cite.source_label}</p>
                <p className="font-mono" style={{ color: 'var(--ink-muted)' }}>
                  {cite.page !== null && `p.${cite.page}`}
                  {cite.section && ` · §${cite.section}`}
                </p>
                <blockquote className="border-l-2 border-cyan-600 pl-2 italic leading-relaxed" style={{ color: 'var(--ink-body)' }}>
                  "{cite.quote}"
                </blockquote>
              </div>
            ) : (
              <div key={idx} className="rounded-lg border border-dashed px-3 py-2 text-xs italic" style={{ borderColor: 'var(--line-mid)', color: 'var(--ink-muted)' }}>
                {idx === 0 ? 'No prior citation' : 'No new citation'}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}

// ── CompactChangeRow ──────────────────────────────────────────────────────────

function CompactChangeRow({ change }: { change: PolicyChange }) {
  return (
    <div className="px-5 py-2.5 flex items-center gap-3">
      <DirectionChip type={change.change_type} />
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--ink-body)' }}>{change.field_label}</span>
      <ImpactBadge impact={change.impact} />
    </div>
  )
}

// ── FrictionDeltaWidget ───────────────────────────────────────────────────────

function FrictionDeltaWidget({
  before,
  after,
  delta,
}: {
  before: number
  after: number
  delta: number
}) {
  const tightened = delta > 0
  const unchanged = delta === 0

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-2 font-mono text-sm">
        <span style={{ color: 'var(--ink-muted)' }}>{before}</span>
        <span style={{ color: 'var(--ink-faint)' }}>→</span>
        <span
          className={
            unchanged ? 'text-slate-600' : tightened ? 'font-bold text-rose-700' : 'font-bold text-emerald-700'
          }
        >
          {after}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            unchanged
              ? 'bg-slate-100 text-slate-600'
              : tightened
              ? 'bg-rose-50 text-rose-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>friction score</p>
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────────────────────

const PILL_COLORS = {
  red:   { active: 'bg-rose-50 border-rose-200 text-rose-700', inactive: 'bg-white border-slate-200 text-slate-600' },
  green: { active: 'bg-emerald-50 border-emerald-200 text-emerald-700', inactive: 'bg-white border-slate-200 text-slate-600' },
  blue:  { active: 'bg-cyan-50 border-cyan-200 text-cyan-700', inactive: 'bg-white border-slate-200 text-slate-600' },
  amber: { active: 'bg-amber-50 border-amber-200 text-amber-700', inactive: 'bg-white border-slate-200 text-slate-600' },
  slate: { active: 'bg-slate-100 border-slate-200 text-slate-700', inactive: 'bg-white border-slate-200 text-slate-600' },
} as const

function FilterPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color: keyof typeof PILL_COLORS
}) {
  const cls = PILL_COLORS[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
        active ? cls.active : cls.inactive
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  )
}

// ── DirectionBadge (large) ────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: PolicyDiff['overall_direction'] }) {
  const map = {
    tightened: 'bg-rose-50 border-rose-200 text-rose-700',
    loosened:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    unchanged: 'bg-slate-100 border-slate-200 text-slate-600',
  }
  const label = {
    tightened: '↑ Tightened',
    loosened:  '↓ Loosened',
    unchanged: '= Unchanged',
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${map[direction]}`}>
      {label[direction]}
    </span>
  )
}

// ── DirectionChip (inline row) ────────────────────────────────────────────────

function DirectionChip({ type }: { type: ChangeDirection }) {
  const map: Record<ChangeDirection, string> = {
    tightened: 'bg-rose-50 text-rose-700',
    loosened:  'bg-emerald-50 text-emerald-700',
    unchanged: 'bg-slate-100 text-slate-600',
    added:     'bg-cyan-50 text-cyan-700',
    removed:   'bg-amber-50 text-amber-700',
  }
  const symbol: Record<ChangeDirection, string> = {
    tightened: '↑',
    loosened:  '↓',
    unchanged: '=',
    added:     '+',
    removed:   '−',
  }
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${map[type]}`}>
      {symbol[type]} {type}
    </span>
  )
}

// ── ImpactBadge ───────────────────────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: ChangeImpact }) {
  const map: Record<ChangeImpact, string> = {
    high:   'text-rose-700 border-rose-200',
    medium: 'text-amber-700 border-amber-200',
    low:    'text-slate-600 border-slate-200',
  }
  return (
    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${map[impact]}`}>
      {impact}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function directionHeaderBg(direction: PolicyDiff['overall_direction']) {
  return direction === 'tightened'
    ? 'bg-rose-50'
    : direction === 'loosened'
    ? 'bg-emerald-50'
    : ''
}

function changeConfig(type: ChangeDirection) {
  return {
    tightened: { rowBg: 'bg-rose-50/70' },
    loosened:  { rowBg: 'bg-emerald-50/70' },
    unchanged: { rowBg: '' },
    added:     { rowBg: 'bg-cyan-50/70' },
    removed:   { rowBg: 'bg-amber-50/70' },
  }[type]
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

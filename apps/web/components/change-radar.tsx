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
    <div className="rounded-xl border border-navy-700 bg-navy-900 overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className={`px-5 py-4 border-b border-navy-700 ${directionHeaderBg(diff.overall_direction)}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-100 text-base">
                {diff.drug_display_name}
                <span className="text-slate-500 font-normal"> · </span>
                {diff.payer_name}
              </h3>
              <DirectionBadge direction={diff.overall_direction} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
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
      <div className="divide-y divide-navy-700/50">
        {visibleChanges.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600 text-center">
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
        <span className="text-sm font-semibold text-slate-200">{change.field_label}</span>
        <ImpactBadge impact={change.impact} />
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-navy-800 border border-red-900/30 px-3 py-2">
          <p className="text-red-400/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Before</p>
          <p className="text-slate-400 leading-relaxed">{change.before}</p>
        </div>
        <div className="rounded-lg bg-navy-800 border border-emerald-900/30 px-3 py-2">
          <p className="text-emerald-400/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">After</p>
          <p className="text-slate-200 leading-relaxed">{change.after}</p>
        </div>
      </div>

      {/* Citations toggle */}
      {(change.citation_before || change.citation_after) && (
        <button
          type="button"
          onClick={() => setShowCitations((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
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
                className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-xs space-y-1"
              >
                <p className="text-cyan-400 font-semibold truncate">{cite.source_label}</p>
                <p className="text-slate-500 font-mono">
                  {cite.page !== null && `p.${cite.page}`}
                  {cite.section && ` · §${cite.section}`}
                </p>
                <blockquote className="text-slate-400 italic border-l-2 border-cyan-700 pl-2 leading-relaxed">
                  "{cite.quote}"
                </blockquote>
              </div>
            ) : (
              <div key={idx} className="rounded-lg border border-dashed border-navy-700 px-3 py-2 text-xs text-slate-600 italic">
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
      <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">{change.field_label}</span>
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
        <span className="text-slate-500">{before}</span>
        <span className="text-slate-600">→</span>
        <span
          className={
            unchanged ? 'text-slate-400' : tightened ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'
          }
        >
          {after}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            unchanged
              ? 'bg-slate-800 text-slate-500'
              : tightened
              ? 'bg-red-900/40 text-red-400'
              : 'bg-emerald-900/40 text-emerald-400'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      </div>
      <p className="text-[10px] text-slate-600 uppercase tracking-wider">friction score</p>
    </div>
  )
}

// ── FilterPill ────────────────────────────────────────────────────────────────

const PILL_COLORS = {
  red:   { active: 'bg-red-900/50 border-red-700 text-red-300',   inactive: 'bg-navy-800 border-navy-600 text-slate-400' },
  green: { active: 'bg-emerald-900/40 border-emerald-700 text-emerald-300', inactive: 'bg-navy-800 border-navy-600 text-slate-400' },
  blue:  { active: 'bg-blue-900/40 border-blue-700 text-blue-300', inactive: 'bg-navy-800 border-navy-600 text-slate-400' },
  amber: { active: 'bg-amber-900/30 border-amber-700 text-amber-300', inactive: 'bg-navy-800 border-navy-600 text-slate-400' },
  slate: { active: 'bg-navy-700 border-navy-500 text-slate-200',   inactive: 'bg-navy-800 border-navy-600 text-slate-500' },
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
      {label} <span className="opacity-60">{count}</span>
    </button>
  )
}

// ── DirectionBadge (large) ────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: PolicyDiff['overall_direction'] }) {
  const map = {
    tightened: 'bg-red-900/40 border-red-700 text-red-400',
    loosened:  'bg-emerald-900/30 border-emerald-700 text-emerald-400',
    unchanged: 'bg-navy-700 border-navy-500 text-slate-400',
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
    tightened: 'bg-red-900/40 text-red-400',
    loosened:  'bg-emerald-900/30 text-emerald-400',
    unchanged: 'bg-navy-700 text-slate-400',
    added:     'bg-blue-900/30 text-blue-400',
    removed:   'bg-amber-900/30 text-amber-400',
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
    high:   'text-red-400 border-red-800/50',
    medium: 'text-amber-400 border-amber-800/40',
    low:    'text-slate-500 border-navy-600',
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
    ? 'bg-red-950/10'
    : direction === 'loosened'
    ? 'bg-emerald-950/10'
    : ''
}

function changeConfig(type: ChangeDirection) {
  return {
    tightened: { rowBg: 'bg-red-950/5' },
    loosened:  { rowBg: 'bg-emerald-950/5' },
    unchanged: { rowBg: '' },
    added:     { rowBg: 'bg-blue-950/5' },
    removed:   { rowBg: 'bg-amber-950/5' },
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

'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Info } from 'lucide-react'
import { FrictionBadge } from './friction-badge'
import { PolicyDrawer } from './policy-drawer'
import {
  cn,
  COVERAGE_STATUS_LABEL,
  COVERAGE_STATUS_COLOR,
  COVERAGE_STATUS_DOT,
  formatDateShort,
} from '@/lib/utils'
import type { CoverageMatrixData, MatrixCell, PolicyDNA } from '@/lib/types'

interface CoverageMatrixProps {
  data: CoverageMatrixData
  onCellClick?: (policyId: string) => Promise<PolicyDNA | null>
  className?: string
}

// ── Animation ─────────────────────────────────────────────────────────────────

const cellVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   (i: number) => ({
    opacity: 1,
    scale:   1,
    transition: { delay: i * 0.025, duration: 0.2 },
  }),
}

// ── Coverage Matrix ───────────────────────────────────────────────────────────

export function CoverageMatrix({ data, onCellClick, className }: CoverageMatrixProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDNA | null>(null)
  const [loadingCell, setLoadingCell] = useState<string | null>(null)

  const handleCellClick = useCallback(
    async (cell: MatrixCell, _drugKey: string, _payerId: string) => {
      if (!cell.policy_id) return
      if (!onCellClick) return

      setLoadingCell(cell.policy_id)
      try {
        const policy = await onCellClick(cell.policy_id)
        if (policy) setSelectedPolicy(policy)
      } finally {
        setLoadingCell(null)
      }
    },
    [onCellClick],
  )

  return (
    <>
      <div className={cn('rounded-2xl border border-navy-700 overflow-hidden', className)}>
        {/* Scrollable table wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            {/* ── Column headers ── */}
            <thead>
              <tr className="bg-navy-900 border-b border-navy-700">
                {/* Drug column header */}
                <th className="sticky left-0 z-10 bg-navy-900 px-5 py-4 text-left min-w-[180px]">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Drug Family
                  </span>
                </th>

                {/* Payer column headers */}
                {data.payer_ids.map((payerId) => (
                  <th key={payerId} className="px-4 py-4 text-center min-w-[140px]">
                    <span className="text-xs font-semibold text-slate-400">
                      {data.payer_labels[payerId]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Rows ── */}
            <tbody>
              {data.rows.map((row, rowIdx) => (
                <tr
                  key={row.drug_key}
                  className="border-b border-navy-800 last:border-0 group/row"
                >
                  {/* Drug name cell */}
                  <td className="sticky left-0 z-10 bg-navy-950 group-hover/row:bg-navy-900 transition-colors px-5 py-4">
                    <div>
                      <div className="font-semibold text-sm text-slate-200">
                        {row.drug_display_name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs font-mono text-slate-600">{row.reference_product}</span>
                        {row.biosimilars.length > 0 && (
                          <span className="text-xs text-slate-700">
                            +{row.biosimilars.length} bio
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Payer cells */}
                  {data.payer_ids.map((payerId, colIdx) => {
                    const cell = row.cells[payerId]
                    const cellIndex = rowIdx * data.payer_ids.length + colIdx
                    const isLoading = loadingCell === cell?.policy_id
                    const isClickable = !!cell?.policy_id && !!onCellClick

                    return (
                      <td
                        key={payerId}
                        className={cn(
                          'px-3 py-3 text-center transition-colors',
                          isClickable && 'cursor-pointer hover:bg-navy-800/60',
                          isLoading && 'opacity-60',
                        )}
                        onClick={() => cell && handleCellClick(cell, row.drug_key, payerId)}
                        title={
                          isClickable
                            ? `${row.drug_display_name} · ${data.payer_labels[payerId]} — click for details`
                            : undefined
                        }
                      >
                        <motion.div
                          custom={cellIndex}
                          variants={cellVariants}
                          initial="hidden"
                          animate="show"
                          className="flex flex-col items-center gap-1.5"
                        >
                          {cell ? (
                            <MatrixCellContent cell={cell} isLoading={isLoading} />
                          ) : (
                            <span className="text-xs text-slate-700 italic">—</span>
                          )}
                        </motion.div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Legend ── */}
        <MatrixLegend />
      </div>

      {/* Policy detail drawer */}
      <PolicyDrawer
        policy={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />
    </>
  )
}

// ── Matrix cell ───────────────────────────────────────────────────────────────

function MatrixCellContent({ cell, isLoading }: { cell: MatrixCell; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-20 h-5 rounded shimmer" />
        <div className="w-10 h-4 rounded shimmer" />
      </div>
    )
  }

  return (
    <>
      {/* Coverage status badge */}
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset',
          COVERAGE_STATUS_COLOR[cell.coverage_status],
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', COVERAGE_STATUS_DOT[cell.coverage_status])} />
        {COVERAGE_STATUS_LABEL[cell.coverage_status]}
      </span>

      {/* Friction score chip */}
      <FrictionBadge score={cell.friction_score} size="sm" />

      {/* PA flag */}
      {cell.pa_required && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-500/80">
          <AlertCircle className="w-2.5 h-2.5" />
          PA
        </span>
      )}

      {/* Effective date — subtle */}
      {cell.effective_date && (
        <span className="text-[10px] font-mono text-slate-700">
          {formatDateShort(cell.effective_date)}
        </span>
      )}
    </>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function MatrixLegend() {
  const STATUSES = [
    'covered', 'conditional', 'preferred', 'nonpreferred', 'not_covered', 'unclear',
  ] as const

  return (
    <div className="px-5 py-4 border-t border-navy-700 bg-navy-900/50">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Info className="w-3 h-3" />
          <span>Coverage status</span>
        </div>
        {STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', COVERAGE_STATUS_DOT[s])} />
            <span className="text-xs text-slate-500">{COVERAGE_STATUS_LABEL[s]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <AlertCircle className="w-3 h-3 text-amber-500/80" />
          <span className="text-xs text-slate-500">PA = Prior Authorization required</span>
        </div>
      </div>
    </div>
  )
}

// ── Filter bar (exported separately for the matrix page) ─────────────────────

interface MatrixFilterBarProps {
  payers: string[]
  payerLabels: Record<string, string>
  drugKeys: string[]
  drugLabels: Record<string, string>
  selectedPayer: string | null
  selectedDrug: string | null
  onPayerChange: (payer: string | null) => void
  onDrugChange: (drug: string | null) => void
}

export function MatrixFilterBar({
  payers,
  payerLabels,
  drugKeys,
  drugLabels,
  selectedPayer,
  selectedDrug,
  onPayerChange,
  onDrugChange,
}: MatrixFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Payer filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Payer</span>
        <div className="flex gap-1">
          <FilterChip
            label="All"
            active={selectedPayer === null}
            onClick={() => onPayerChange(null)}
          />
          {payers.map((p) => (
            <FilterChip
              key={p}
              label={payerLabels[p] ?? p}
              active={selectedPayer === p}
              onClick={() => onPayerChange(p === selectedPayer ? null : p)}
            />
          ))}
        </div>
      </div>

      <div className="w-px h-4 bg-navy-700" />

      {/* Drug filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Drug</span>
        <div className="flex gap-1 flex-wrap">
          <FilterChip
            label="All"
            active={selectedDrug === null}
            onClick={() => onDrugChange(null)}
          />
          {drugKeys.map((d) => (
            <FilterChip
              key={d}
              label={drugLabels[d] ?? d}
              active={selectedDrug === d}
              onClick={() => onDrugChange(d === selectedDrug ? null : d)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150',
        active
          ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-inset ring-cyan-500/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-navy-800',
      )}
    >
      {label}
    </button>
  )
}

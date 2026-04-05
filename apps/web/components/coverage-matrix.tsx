'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
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

// ── Payer logo registry ───────────────────────────────────────────────────────

const PAYER_LOGOS: Record<string, string> = {
  unitedhealthcare: 'https://logo.clearbit.com/uhc.com',
  uhc:              'https://logo.clearbit.com/uhc.com',
  cigna:            'https://logo.clearbit.com/cigna.com',
  aetna:            'https://logo.clearbit.com/aetna.com',
  anthem:           'https://logo.clearbit.com/anthem.com',
  bsca:             'https://logo.clearbit.com/blueshieldca.com',
  'blue shield ca': 'https://logo.clearbit.com/blueshieldca.com',
}

const PAYER_COLORS: Record<string, string> = {
  unitedhealthcare: '#0060A9',
  uhc:              '#0060A9',
  cigna:            '#006B9F',
  aetna:            '#7D2248',
  anthem:           '#003087',
  bsca:             '#005EB8',
}

function PayerLogo({ payerId, label, size = 24 }: { payerId: string; label: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const src = PAYER_LOGOS[payerId.toLowerCase()]
  const color = PAYER_COLORS[payerId.toLowerCase()] ?? '#64748B'
  const initials = label.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (!src || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: size * 0.38, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={label}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', flexShrink: 0 }}
      unoptimized
    />
  )
}

interface CoverageMatrixProps {
  data: CoverageMatrixData
  onCellClick?: (policyId: string) => Promise<PolicyDNA | null>
  className?: string
}

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
      if (!cell.policy_id || !onCellClick) return
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
      <div
        className={cn('overflow-hidden', className)}
        style={{
          background: '#FFFFFF',
          border: '1px solid #E7EDF5',
          borderRadius: 20,
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">

            {/* ── Column headers ── */}
            <thead>
              <tr style={{ background: '#F3F6FB', borderBottom: '1px solid #E7EDF5' }}>
                {/* Drug column header */}
                <th
                  className="sticky left-0 z-10 px-6 py-4 text-left min-w-[200px]"
                  style={{ background: '#F3F6FB' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Drug Family
                  </span>
                </th>

                {/* Payer column headers */}
                {data.payer_ids.map((payerId) => (
                  <th key={payerId} className="px-4 py-4 text-center min-w-[160px]">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <PayerLogo payerId={payerId} label={data.payer_labels[payerId]} size={32} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                        {data.payer_labels[payerId]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Rows ── */}
            <tbody>
              {data.rows.map((row, rowIdx) => (
                <tr
                  key={row.drug_key}
                  style={{ borderBottom: '1px solid #F3F6FB' }}
                  className="group/row last:border-0"
                >
                  {/* Drug name cell */}
                  <td
                    className="sticky left-0 z-10 px-6 py-4 transition-colors"
                    style={{ background: '#FFFFFF' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F6F8FB')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                      {row.drug_display_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, ui-monospace, monospace', color: '#94A3B8' }}>
                        {row.reference_product}
                      </span>
                      {row.biosimilars.length > 0 && (
                        <span style={{ fontSize: 11, color: '#CBD5E1' }}>
                          +{row.biosimilars.length} bio
                        </span>
                      )}
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
                        className="px-3 py-4 text-center transition-colors"
                        style={{
                          cursor: isClickable ? 'pointer' : 'default',
                          opacity: isLoading ? 0.6 : 1,
                          borderLeft: '1px solid #F3F6FB',
                        }}
                        onClick={() => cell && handleCellClick(cell, row.drug_key, payerId)}
                        onMouseEnter={e => { if (isClickable) (e.currentTarget as HTMLElement).style.background = '#F6F8FB' }}
                        onMouseLeave={e => { if (isClickable) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        title={isClickable ? `${row.drug_display_name} · ${data.payer_labels[payerId]} — click for details` : undefined}
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
                            <span style={{ fontSize: 12, color: '#CBD5E1', fontStyle: 'italic' }}>—</span>
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

      <PolicyDrawer
        policy={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />
    </>
  )
}

// ── Matrix cell content ───────────────────────────────────────────────────────

function MatrixCellContent({ cell, isLoading }: { cell: MatrixCell; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-20 h-5 rounded shimmer" />
        <div className="w-10 h-4 rounded shimmer" />
      </div>
    )
  }

  // Paperlight semantic chip colors
  const statusStyle: Record<string, { color: string; bg: string }> = {
    covered:     { color: '#0F766E', bg: '#EAF8F4' },
    preferred:   { color: '#2B50FF', bg: '#ECF1FF' },
    conditional: { color: '#B45309', bg: '#FFF6E8' },
    nonpreferred:{ color: '#C2410C', bg: '#FFF1EB' },
    not_covered: { color: '#BE123C', bg: '#FFF0F4' },
    unclear:     { color: '#64748B', bg: '#F3F6FB' },
  }
  const s = statusStyle[cell.coverage_status] ?? statusStyle.unclear

  return (
    <>
      {/* Coverage status badge */}
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 9999,
          fontSize: 11, fontWeight: 600,
          color: s.color, background: s.bg,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        {COVERAGE_STATUS_LABEL[cell.coverage_status]}
      </span>

      {/* Friction score */}
      <FrictionBadge score={cell.friction_score} size="sm" />

      {/* PA flag */}
      {cell.pa_required && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#B45309' }}>
          <AlertCircle className="w-2.5 h-2.5" />
          PA
        </span>
      )}

      {/* Effective date */}
      {cell.effective_date && (
        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#94A3B8' }}>
          {formatDateShort(cell.effective_date)}
        </span>
      )}
    </>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function MatrixLegend() {
  const STATUSES = ['covered', 'conditional', 'preferred', 'nonpreferred', 'not_covered', 'unclear'] as const

  const dotColors: Record<string, string> = {
    covered: '#0F766E', preferred: '#2B50FF', conditional: '#B45309',
    nonpreferred: '#C2410C', not_covered: '#BE123C', unclear: '#94A3B8',
  }

  return (
    <div
      style={{
        padding: '12px 24px',
        borderTop: '1px solid #E7EDF5',
        background: '#F3F6FB',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B' }}>
        <Info className="w-3 h-3" />
        <span>Coverage status</span>
      </div>
      {STATUSES.map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColors[s], flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#64748B' }}>{COVERAGE_STATUS_LABEL[s]}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
        <AlertCircle className="w-3 h-3" style={{ color: '#B45309' }} />
        <span style={{ fontSize: 11, color: '#64748B' }}>PA = Prior Authorization required</span>
      </div>
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

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
  payers, payerLabels, drugKeys, drugLabels,
  selectedPayer, selectedDrug, onPayerChange, onDrugChange,
}: MatrixFilterBarProps) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
      background: '#FFFFFF',
      border: '1px solid #E7EDF5',
      borderRadius: 14,
      padding: '10px 14px',
      boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
    }}>
      {/* Payer filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, color: '#94A3B8', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          flexShrink: 0,
        }}>Payer</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <FilterChip label="All" active={selectedPayer === null} onClick={() => onPayerChange(null)} />
          {payers.map((p) => (
            <FilterChip
              key={p} label={payerLabels[p] ?? p}
              active={selectedPayer === p}
              onClick={() => onPayerChange(p === selectedPayer ? null : p)}
              logo={<PayerLogo payerId={p} label={payerLabels[p] ?? p} size={16} />}
            />
          ))}
        </div>
      </div>

      <div style={{ width: 1, height: 20, background: '#E7EDF5', flexShrink: 0 }} />

      {/* Drug filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, color: '#94A3B8', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          flexShrink: 0,
        }}>Drug</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <FilterChip label="All" active={selectedDrug === null} onClick={() => onDrugChange(null)} />
          {drugKeys.map((d) => (
            <FilterChip
              key={d} label={drugLabels[d] ?? d}
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
  label, active, onClick, logo,
}: {
  label: string; active: boolean; onClick: () => void; logo?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: logo ? '4px 10px 4px 6px' : '5px 13px',
        borderRadius: 9999,
        fontSize: 12, fontWeight: 500,
        cursor: 'pointer', transition: 'all 150ms',
        color:      active ? '#2B50FF' : '#475569',
        background: active ? '#ECF1FF' : '#FFFFFF',
        border:     active ? '1px solid #2B50FF40' : '1px solid #D1D9E6',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#111827'; (e.currentTarget as HTMLElement).style.borderColor = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = '#F6F8FB' }}}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.borderColor = '#D1D9E6'; (e.currentTarget as HTMLElement).style.background = '#FFFFFF' }}}
    >
      {logo}
      {label}
    </button>
  )
}

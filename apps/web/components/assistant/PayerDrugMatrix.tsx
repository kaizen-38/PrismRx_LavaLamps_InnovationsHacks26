'use client'

import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { PayerDrugMatrixProps } from '@/lib/assistant-types'
import { COVERAGE_STATUS_LABEL } from '@/lib/utils'
import type { CoverageStatus } from '@/lib/types'

const STATUS_COLOR: Record<CoverageStatus, string> = {
  covered: '#0F766E',
  conditional: '#B45309',
  preferred: '#2B50FF',
  nonpreferred: '#7C3AED',
  not_covered: '#C2410C',
  unclear: '#94A3B8',
}

const LIVE_STATUS = { color: '#1D4ED8', label: 'Live excerpt', bg: '#EFF6FF' }

export function PayerDrugMatrix({ drugDisplay, rows, matrixSource = 'indexed' }: PayerDrugMatrixProps) {
  const [openPayer, setOpenPayer] = useState<string | null>(null)
  const isLiveMatrix = matrixSource === 'live_web'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 20,
        border: '1px solid var(--line-soft)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          padding: '1.1rem 1.35rem',
          borderBottom: '1px solid var(--line-soft)',
          background: isLiveMatrix ? 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 100%)' : 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: isLiveMatrix ? '#4F46E518' : '#1D4ED818',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LayoutGrid style={{ width: 20, height: 20, color: isLiveMatrix ? '#4F46E5' : '#1D4ED8' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: isLiveMatrix ? '#4F46E5' : '#1D4ED8' }}>
            {isLiveMatrix ? 'Live web comparison matrix' : 'Payer comparison matrix'}
          </p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-strong)', marginTop: 2 }}>
            {drugDisplay}
            <span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: 13 }}>
              {isLiveMatrix ? ` · live excerpts (${rows.length} payers)` : ` · indexed payers (${rows.length})`}
            </span>
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--line-soft)' }}>
              {(isLiveMatrix
                ? ['Payer', 'Source / status', 'PA', 'Step', 'Friction', 'Effective', 'Source ref', 'Citations']
                : ['Payer', 'Coverage', 'PA', 'Step therapy', 'Friction', 'Effective', 'Policy ID', 'Citations']
              ).map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--ink-faint)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowLive = isLiveMatrix || row.rowSource === 'live_web'
              const c = rowLive ? LIVE_STATUS.color : (STATUS_COLOR[row.coverageStatus] ?? '#94A3B8')
              const label = rowLive ? LIVE_STATUS.label : (COVERAGE_STATUS_LABEL[row.coverageStatus] ?? row.coverageStatus)
              const expanded = openPayer === row.payerId
              const nEv = row.evidence.length
              return (
                <Fragment key={row.payerId}>
                  <tr style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)' }}>
                      {row.payerDisplay}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: c,
                          background: (rowLive ? LIVE_STATUS.bg : c + '14'),
                          padding: '0.2rem 0.5rem',
                          borderRadius: 9999,
                          border: `1px solid ${c}28`,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                        {label}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: 12, color: 'var(--ink-body)' }}>
                      {rowLive ? '—' : row.paRequired ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: 12, color: 'var(--ink-body)' }}>
                      {rowLive ? '—' : row.stepTherapyRequired ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: 12, fontFamily: 'monospace', color: 'var(--ink-muted)' }}>
                      {rowLive ? '—' : row.frictionScore}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: 12, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                      {row.effectiveDate || '—'}
                    </td>
                    <td
                      style={{
                        padding: '0.65rem 0.85rem',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--ink-muted)',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={row.policyId}
                    >
                      {rowLive && row.policyId.startsWith('http') ? (
                        <a href={row.policyId} target="_blank" rel="noopener noreferrer" style={{ color: '#2B50FF', fontSize: 11 }}>
                          link
                        </a>
                      ) : (
                        row.policyId
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {nEv > 0 ? (
                        <button
                          type="button"
                          onClick={() => setOpenPayer(expanded ? null : row.payerId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#2B50FF',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {expanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                          {nEv} quote{nEv !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                  </tr>
                  {expanded && nEv > 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, background: 'var(--bg-soft)' }}>
                        <div style={{ padding: '0.85rem 1.1rem 1.1rem', borderTop: '1px solid var(--line-soft)' }}>
                          <p style={{ margin: '0 0 0.65rem', fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)' }}>
                            Source citations — {row.payerDisplay} · {drugDisplay}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {row.evidence.map((ev) => (
                              <div
                                key={ev.id}
                                style={{
                                  padding: '0.65rem 0.75rem',
                                  borderRadius: 10,
                                  border: '1px solid var(--line-soft)',
                                  background: 'var(--bg-surface)',
                                }}
                              >
                                {ev.section ? (
                                  <p style={{ margin: '0 0 0.35rem', fontSize: 10, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
                                    {ev.section}
                                    {ev.page != null ? ` · p. ${ev.page}` : ''}
                                  </p>
                                ) : null}
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-body)', lineHeight: 1.55, fontStyle: 'italic' }}>
                                  &ldquo;{ev.quote}&rdquo;
                                </p>
                                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{ev.sourceLabel}</span>
                                  {ev.sourceUrl ? (
                                    <a
                                      href={ev.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: 11, color: '#2B50FF', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    >
                                      <ExternalLink style={{ width: 12, height: 12 }} />
                                      Open source
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ margin: 0, padding: '0.75rem 1.1rem', fontSize: 11, color: 'var(--ink-muted)', borderTop: '1px solid var(--line-soft)', lineHeight: 1.45 }}>
        {isLiveMatrix
          ? 'Rows are built from live web/PDF fetches per payer — not the static PrismRx index. PA/step/friction are not auto-extracted; read excerpts and citations. Verify everything on each payer\'s official policy.'
          : 'Matrix uses the same indexed policy snapshot as single-payer lookups. Expand “Citations” per payer for verbatim quotes and links. The chat summary highlights cross-payer differences (PA burden, step therapy, biosimilar rules).'}
      </p>
    </motion.div>
  )
}

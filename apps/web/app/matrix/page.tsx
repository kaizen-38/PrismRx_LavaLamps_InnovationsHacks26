'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Info, RefreshCw } from 'lucide-react'
import { CoverageMatrix, MatrixFilterBar } from '@/components/coverage-matrix'
import { WorkspacePage, WorkspaceHeader, WorkspaceMetricCard } from '@/components/layout/workspace-page'
import { fetchCoverageMatrix, fetchPolicy } from '@/lib/api-client'
import { DRUG_FAMILIES } from '@/lib/mock-data'
import type { CoverageMatrixData, PolicyDNA } from '@/lib/types'
import { fadeUp, stagger } from '@/lib/motion/presets'

const DRUG_LABELS: Record<string, string> = Object.fromEntries(
  DRUG_FAMILIES.map((d) => [d.key, d.display_name]),
)

export default function MatrixPage() {
  const [matrix, setMatrix]           = useState<CoverageMatrixData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [filterPayer,  setFilterPayer]  = useState<string | null>(null)
  const [filterDrug,   setFilterDrug]   = useState<string | null>(null)

  useEffect(() => {
    fetchCoverageMatrix().then((data) => {
      setMatrix(data)
      setLoading(false)
    })
  }, [])

  const filteredMatrix = useMemo<CoverageMatrixData | null>(() => {
    if (!matrix) return null
    let rows = matrix.rows
    let payer_ids = matrix.payer_ids
    if (filterDrug)  rows = rows.filter((r) => r.drug_key === filterDrug)
    if (filterPayer) {
      payer_ids = [filterPayer]
      rows = rows.map((r) => ({ ...r, cells: { [filterPayer]: r.cells[filterPayer] } }))
    }
    return { ...matrix, rows, payer_ids }
  }, [matrix, filterDrug, filterPayer])

  async function handleCellClick(policyId: string): Promise<PolicyDNA | null> {
    return fetchPolicy(policyId)
  }

  const totalCells   = matrix ? matrix.rows.length * matrix.payer_ids.length : 0
  const coveredCount = matrix
    ? matrix.rows.flatMap((r) => Object.values(r.cells)).filter(
        (c) => c.coverage_status === 'covered' || c.coverage_status === 'preferred',
      ).length
    : 0

  return (
    <WorkspacePage width="wide">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <WorkspaceHeader
            eyebrow="Policy Intelligence"
            title="Coverage Matrix"
            description="Plan-by-plan coverage posture for autoimmune and inflammatory infused biologics. Click any cell to inspect the policy dossier with source citations."
            aside={
              matrix ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <WorkspaceMetricCard label="Drug families" value={matrix.rows.length} />
                  <WorkspaceMetricCard label="Payers" value={matrix.payer_ids.length} />
                  <WorkspaceMetricCard label="Pairs" value={totalCells} />
                  <WorkspaceMetricCard
                    label="Covered"
                    value={totalCells > 0 ? `${Math.round((coveredCount / totalCells) * 100)}%` : '—'}
                    tone="accent"
                    meta={loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  />
                </div>
              ) : null
            }
          />
        </motion.div>

      {/* ── Filter bar ── */}
      {matrix && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-6 workspace-panel px-4 py-4 sm:px-5">
          <MatrixFilterBar
            payers={matrix.payer_ids}
            payerLabels={matrix.payer_labels}
            drugKeys={matrix.rows.map((r) => r.drug_key)}
            drugLabels={{ ...DRUG_LABELS, ...Object.fromEntries(matrix.rows.map(r => [r.drug_key, r.drug_display_name])) }}
            selectedPayer={filterPayer}
            selectedDrug={filterDrug}
            onPayerChange={setFilterPayer}
            onDrugChange={setFilterDrug}
          />
        </motion.div>
      )}

      {/* ── Matrix table ── */}
      {loading ? (
        <div
          className="workspace-panel p-16 text-center text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          <div className="shimmer w-24 h-4 rounded mx-auto mb-3" />
          <div className="shimmer w-40 h-3 rounded mx-auto" />
        </div>
      ) : filteredMatrix ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CoverageMatrix data={filteredMatrix} onCellClick={handleCellClick} />
        </motion.div>
      ) : null}

      {/* ── Data notice ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-5 flex items-start gap-2 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--border-strong)' }} />
        <p>
          Data sourced from public payer policy documents (UnitedHealthcare, Cigna, UPMC Health Plan).
          Effective dates reflect the most recent available version. No real patient data. Synthetic cases only.
        </p>
      </motion.div>
      </motion.div>
    </WorkspacePage>
  )
}

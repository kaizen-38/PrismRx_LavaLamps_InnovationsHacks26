'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, Info } from 'lucide-react'
import { CoverageMatrix, MatrixFilterBar } from '@/components/coverage-matrix'
import { fetchPolicy } from '@/lib/api-client'
import { buildMockMatrix, DRUG_FAMILIES } from '@/lib/mock-data'
import type { CoverageMatrixData, PolicyDNA } from '@/lib/types'

// ── Data loading (client-side mock) ──────────────────────────────────────────
// The matrix data is loaded synchronously from mock-data on the client so
// the page renders instantly without a network round-trip.
// When the backend is live, swap buildMockMatrix() for fetchCoverageMatrix().

const INITIAL_MATRIX = buildMockMatrix()

const DRUG_LABELS: Record<string, string> = Object.fromEntries(
  DRUG_FAMILIES.map((d) => [d.key, d.display_name]),
)

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MatrixPage() {
  const [matrix]       = useState<CoverageMatrixData>(INITIAL_MATRIX)
  const [filterPayer,  setFilterPayer]  = useState<string | null>(null)
  const [filterDrug,   setFilterDrug]   = useState<string | null>(null)

  // Apply filters to the matrix data
  const filteredMatrix = useMemo<CoverageMatrixData>(() => {
    let rows = matrix.rows
    let payer_ids = matrix.payer_ids

    if (filterDrug) {
      rows = rows.filter((r) => r.drug_key === filterDrug)
    }
    if (filterPayer) {
      payer_ids = [filterPayer]
      rows = rows.map((r) => ({
        ...r,
        cells: { [filterPayer]: r.cells[filterPayer] },
      }))
    }

    return { ...matrix, rows, payer_ids }
  }, [matrix, filterDrug, filterPayer])

  // Called when a cell is clicked — loads the full PolicyDNA for the drawer
  async function handleCellClick(policyId: string): Promise<PolicyDNA | null> {
    return fetchPolicy(policyId)
  }

  const totalCells    = matrix.rows.length * matrix.payer_ids.length
  const coveredCount  = matrix.rows.flatMap((r) => Object.values(r.cells)).filter(
    (c) => c.coverage_status === 'covered' || c.coverage_status === 'preferred',
  ).length

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-10">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid className="w-5 h-5 text-cyan-500" />
          <h1 className="text-2xl font-bold text-slate-100">Coverage Matrix</h1>
        </div>
        <p className="text-sm text-slate-500 max-w-2xl">
          Plan-by-plan coverage posture for autoimmune / inflammatory infused biologics.
          Each cell shows coverage status, access friction score, and prior authorization requirement.
          Click any cell to open the policy detail drawer with source citations.
        </p>

        {/* Summary stats */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <Stat value={matrix.rows.length} label="drug families" />
          <Stat value={matrix.payer_ids.length} label="payers" />
          <Stat value={totalCells} label="policy × payer pairs" />
          <Stat
            value={`${Math.round((coveredCount / totalCells) * 100)}%`}
            label="covered or preferred"
            highlight
          />
        </div>
      </motion.div>

      {/* ── Filter bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-5"
      >
        <MatrixFilterBar
          payers={matrix.payer_ids}
          payerLabels={matrix.payer_labels}
          drugKeys={matrix.rows.map((r) => r.drug_key)}
          drugLabels={DRUG_LABELS}
          selectedPayer={filterPayer}
          selectedDrug={filterDrug}
          onPayerChange={setFilterPayer}
          onDrugChange={setFilterDrug}
        />
      </motion.div>

      {/* ── Matrix table ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <CoverageMatrix
          data={filteredMatrix}
          onCellClick={handleCellClick}
        />
      </motion.div>

      {/* ── Data posture notice ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex items-start gap-2 text-xs text-slate-600"
      >
        <Info className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 mt-0.5" />
        <p>
          Data sourced from public payer policy documents (Aetna CPB, UHC Medical Drug Policies,
          Blue Shield CA, Anthem, Cigna). Effective dates reflect the most recent available version.
          No real patient data. Synthetic cases only.
          Policy data is current as of Q1 2025 for most payers.
        </p>
      </motion.div>

    </div>
  )
}

function Stat({
  value,
  label,
  highlight = false,
}: {
  value: string | number
  label: string
  highlight?: boolean
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className={highlight ? 'font-bold text-cyan-400' : 'font-semibold text-slate-300'}>
        {value}
      </span>
      <span>{label}</span>
    </span>
  )
}

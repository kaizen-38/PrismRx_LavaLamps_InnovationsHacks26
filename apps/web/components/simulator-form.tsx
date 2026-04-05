'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Policy Fit Simulator Form
// Collects patient/clinical scenario and emits a SimulationCase on submit.
// Deliberately scoped to TNF-α / biologic drug families to keep demo focused.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { SimulationCase, CareSetting } from '@/lib/types'
import { DRUG_FAMILIES } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface LabEntry {
  name: string
  value: string
}

const CARE_SETTINGS: { value: CareSetting; label: string }[] = [
  { value: 'infusion_center', label: 'Outpatient Infusion Center' },
  { value: 'office', label: 'Physician Office' },
  { value: 'hospital', label: 'Hospital Outpatient' },
  { value: 'home', label: 'Home Infusion' },
]

const COMMON_PRIOR_THERAPIES = [
  'Methotrexate',
  'Hydroxychloroquine',
  'Sulfasalazine',
  'Leflunomide',
  'Azathioprine',
  'Mycophenolate',
  'Anti-TNF (prior)',
]

const COMMON_LABS = [
  'QuantiFERON / TB test',
  'Baseline LFTs',
  'CBC',
  'CRP',
  'ESR',
  'ANA',
  'Anti-CCP',
]

interface SimulatorFormProps {
  /** Pre-selected drug key from matrix click (optional) */
  initialDrugKey?: string
  onSubmit: (caseData: SimulationCase) => void
  loading?: boolean
}

export default function SimulatorForm({ initialDrugKey, onSubmit, loading }: SimulatorFormProps) {
  const [drugKey, setDrugKey] = useState(initialDrugKey ?? 'infliximab')
  const [diagnosis, setDiagnosis] = useState('Rheumatoid Arthritis')
  const [icd10, setIcd10] = useState('M05.79')
  const [specialty, setSpecialty] = useState('Rheumatology')
  const [careSetting, setCareSetting] = useState<CareSetting>('infusion_center')
  const [age, setAge] = useState(52)
  const [notes, setNotes] = useState('')

  // Prior therapies as checkboxes
  const [priorTherapies, setPriorTherapies] = useState<string[]>(['Methotrexate', 'Hydroxychloroquine'])

  // Labs as key/value pairs
  const [labs, setLabs] = useState<LabEntry[]>([
    { name: 'QuantiFERON / TB test', value: 'Negative' },
    { name: 'Baseline LFTs', value: 'Normal' },
  ])

  const togglePriorTherapy = (therapy: string) => {
    setPriorTherapies((prev) =>
      prev.includes(therapy) ? prev.filter((t) => t !== therapy) : [...prev, therapy],
    )
  }

  const addLab = () => setLabs((prev) => [...prev, { name: '', value: '' }])
  const removeLab = (i: number) => setLabs((prev) => prev.filter((_, idx) => idx !== i))
  const updateLab = (i: number, field: 'name' | 'value', val: string) => {
    setLabs((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const labsRecord: Record<string, string> = {}
    labs.forEach(({ name, value }) => {
      if (name.trim()) labsRecord[name.trim()] = value.trim()
    })
    onSubmit({
      diagnosis: diagnosis.trim(),
      icd10_code: icd10.trim(),
      drug_key: drugKey,
      prior_therapies: priorTherapies,
      specialty: specialty.trim(),
      care_setting: careSetting,
      age,
      labs: labsRecord,
      notes: notes.trim(),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="workspace-panel space-y-6 p-6"
    >
      {/* ── Drug ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Drug / Biologic" required>
          <select
            value={drugKey}
            onChange={(e) => setDrugKey(e.target.value)}
            className={inputCls}
          >
            {DRUG_FAMILIES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.display_name} ({d.reference_product})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Care Setting" required>
          <select
            value={careSetting}
            onChange={(e) => setCareSetting(e.target.value as CareSetting)}
            className={inputCls}
          >
            {CARE_SETTINGS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* ── Diagnosis ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Diagnosis" required>
          <input
            type="text"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Rheumatoid Arthritis"
            className={inputCls}
            required
          />
        </Field>

        <Field label="ICD-10 Code">
          <input
            type="text"
            value={icd10}
            onChange={(e) => setIcd10(e.target.value)}
            placeholder="e.g. M05.79"
            className={inputCls}
          />
        </Field>
      </div>

      {/* ── Clinical ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Prescriber Specialty" required>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="e.g. Rheumatology"
            className={inputCls}
            required
          />
        </Field>

        <Field label="Patient Age">
          <input
            type="number"
            value={age}
            min={1}
            max={120}
            onChange={(e) => setAge(Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      {/* ── Prior Therapies ── */}
      <div>
        <label className={labelCls}>
          Prior Therapies Failed
          <span className="ml-1 font-normal" style={{ color: 'var(--ink-faint)' }}>(select all that apply)</span>
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMMON_PRIOR_THERAPIES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => togglePriorTherapy(t)}
              className={cn('workspace-chip', priorTherapies.includes(t) && 'workspace-chip--active')}
            >
              {t}
            </button>
          ))}
        </div>
        {priorTherapies.length > 0 && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-muted)' }}>
            {priorTherapies.length} selected: {priorTherapies.join(', ')}
          </p>
        )}
      </div>

      {/* ── Labs ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>Labs / Biomarkers</label>
          <button
            type="button"
            onClick={addLab}
            className="text-xs transition-colors workspace-link"
          >
            + Add lab
          </button>
        </div>

        {/* Quick-add presets */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COMMON_LABS.filter((l) => !labs.find((e) => e.name === l)).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabs((prev) => [...prev, { name: l, value: '' }])}
              className="rounded border border-dashed px-2 py-0.5 text-xs transition-colors"
              style={{ borderColor: 'var(--line-mid)', color: 'var(--ink-muted)' }}
            >
              + {l}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {labs.map((lab, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={lab.name}
                onChange={(e) => updateLab(i, 'name', e.target.value)}
                placeholder="Lab name"
                className={`${inputCls} flex-1`}
              />
              <input
                type="text"
                value={lab.value}
                onChange={(e) => updateLab(i, 'value', e.target.value)}
                placeholder="Result"
                className={`${inputCls} w-28`}
              />
              <button
                type="button"
                onClick={() => removeLab(i)}
                className="px-1 text-sm transition-colors hover:text-rose-600"
                style={{ color: 'var(--ink-faint)' }}
                aria-label="Remove lab"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Notes ── */}
      <Field label="Clinical Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context, contraindications, patient history…"
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Simulating across payers…
          </span>
        ) : (
          'Run Simulation'
        )}
      </button>
    </form>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const inputCls =
  'workspace-field'

const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-cyan-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

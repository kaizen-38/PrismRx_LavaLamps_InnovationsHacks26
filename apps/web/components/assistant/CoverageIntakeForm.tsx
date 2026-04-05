'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import type { CoverageIntakeFormProps } from '@/lib/assistant-types'

const CARE_SETTINGS = ['Outpatient infusion center', 'Physician office', 'Home infusion', 'Hospital outpatient']

interface Props extends CoverageIntakeFormProps {
  onSubmit: (values: {
    payer: string; drug: string; diagnosis?: string
    icd10?: string; priorTherapies?: string; specialty?: string
    careSetting?: string; age?: string
  }) => void
  supportedPayers?: Array<{ id: string; displayName: string }>
  supportedDrugs?: Array<{ key: string; displayName: string }>
}

export function CoverageIntakeForm({ prefillPayer, prefillDrug, prefillDiagnosis, onSubmit, supportedPayers = [], supportedDrugs = [] }: Props) {
  const [payer, setPayer] = useState(prefillPayer ?? '')
  const [drug, setDrug] = useState(prefillDrug ?? '')
  const [diagnosis, setDiagnosis] = useState(prefillDiagnosis ?? '')
  const [icd10, setIcd10] = useState('')
  const [priorTherapies, setPriorTherapies] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [careSetting, setCareSetting] = useState('')
  const [age, setAge] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => { if (prefillPayer) setPayer(prefillPayer) }, [prefillPayer])
  useEffect(() => { if (prefillDrug) setDrug(prefillDrug) }, [prefillDrug])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!payer.trim() || !drug.trim()) return
    onSubmit({ payer, drug, diagnosis: diagnosis || undefined, icd10: icd10 || undefined, priorTherapies: priorTherapies || undefined, specialty: specialty || undefined, careSetting: careSetting || undefined, age: age || undefined })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem',
    border: '1px solid var(--line-mid)', borderRadius: 10,
    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-strong)',
    background: 'var(--bg-surface)', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 6,
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div>
          <label style={labelStyle}>Payer *</label>
          {supportedPayers.length > 0 ? (
            <select value={payer} onChange={e => setPayer(e.target.value)} style={inputStyle} required>
              <option value="">Select payer…</option>
              {supportedPayers.map(p => <option key={p.id} value={p.displayName}>{p.displayName}</option>)}
            </select>
          ) : (
            <input value={payer} onChange={e => setPayer(e.target.value)} placeholder="e.g. UnitedHealthcare" style={inputStyle} required />
          )}
        </div>
        <div>
          <label style={labelStyle}>Drug *</label>
          {supportedDrugs.length > 0 ? (
            <select value={drug} onChange={e => setDrug(e.target.value)} style={inputStyle} required>
              <option value="">Select drug…</option>
              {supportedDrugs.map(d => <option key={d.key} value={d.displayName}>{d.displayName}</option>)}
            </select>
          ) : (
            <input value={drug} onChange={e => setDrug(e.target.value)} placeholder="e.g. Infliximab / Remicade" style={inputStyle} required />
          )}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Diagnosis</label>
        <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Rheumatoid Arthritis" style={inputStyle} />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'var(--font-sans)' }}
      >
        {showAdvanced ? '− Hide optional fields' : '+ Optional: ICD-10, prior therapies, specialty, care setting, age'}
      </button>

      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', overflow: 'hidden' }}
        >
          <div>
            <label style={labelStyle}>ICD-10</label>
            <input value={icd10} onChange={e => setIcd10(e.target.value)} placeholder="e.g. M05.79" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Age</label>
            <input value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 42" style={inputStyle} type="number" min="0" max="120" />
          </div>
          <div>
            <label style={labelStyle}>Prior Therapies</label>
            <input value={priorTherapies} onChange={e => setPriorTherapies(e.target.value)} placeholder="e.g. methotrexate, leflunomide" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Specialty</label>
            <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Rheumatology" style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Care Setting</label>
            <select value={careSetting} onChange={e => setCareSetting(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {CARE_SETTINGS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </motion.div>
      )}

      <motion.button
        type="submit"
        whileHover={{ background: '#1D4ED8' }}
        whileTap={{ scale: 0.98 }}
        disabled={!payer.trim() || !drug.trim()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none',
          background: '#2B50FF', color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', opacity: (!payer.trim() || !drug.trim()) ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        <Send style={{ width: 14, height: 14 }} />
        Check indexed coverage
      </motion.button>
    </motion.form>
  )
}

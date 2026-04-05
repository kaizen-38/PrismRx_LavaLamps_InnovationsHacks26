'use client'

import { motion } from 'framer-motion'

/**
 * PolicyPrism — layered policy sheet stack with parallax depth.
 * Visual metaphor: structure emerging from chaotic policy documents.
 * NO blobs. NO generic shapes. Policy sheets only.
 */

// Policy cards data — clean, readable, no overflow
const CARDS = [
  {
    payer: 'UnitedHealthcare',
    drug: 'Infliximab',
    ref: 'CS-2024-INF-001',
    tag: 'Conditional',
    tagColor: '#B45309',
    tagBg: '#FFF6E8',
    accentColor: '#2B50FF',
    fields: [
      { label: 'Step Therapy', value: '2 DMARD failures req.' },
      { label: 'Prior Auth', value: 'Required' },
      { label: 'Site of Care', value: 'AIC only' },
    ],
    friction: 80,
    delay: 0,
  },
  {
    payer: 'Cigna',
    drug: 'Rituximab',
    ref: 'CP-2024-RIT-004',
    tag: 'Covered',
    tagColor: '#0F766E',
    tagBg: '#EAF8F4',
    accentColor: '#0F766E',
    fields: [
      { label: 'Coverage', value: 'Confirmed' },
      { label: 'PA Required', value: 'Yes' },
      { label: 'Specialist', value: 'Rheumatologist' },
    ],
    friction: 42,
    delay: 0.12,
  },
  {
    payer: 'Aetna',
    drug: 'Vedolizumab',
    ref: 'AE-2024-VED-007',
    tag: 'Preferred',
    tagColor: '#2B50FF',
    tagBg: '#ECF1FF',
    accentColor: '#C2410C',
    fields: [
      { label: 'Biosimilar', value: 'Preferred' },
      { label: 'MTX failure', value: '6-month req.' },
      { label: 'Documentation', value: 'Required' },
    ],
    friction: 55,
    delay: 0.24,
  },
]

export function PolicyPrism() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '8px 4px',
      }}
    >
      {CARDS.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: card.delay + 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E7EDF5',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(15,23,42,0.07)',
            overflow: 'hidden',
          }}
        >
          {/* Accent top bar */}
          <div style={{ height: 3, background: card.accentColor, borderRadius: '16px 16px 0 0' }} />

          <div style={{ padding: '14px 16px' }}>
            {/* Header row: payer + drug + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                  {card.payer}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: card.accentColor,
                    background: `${card.accentColor}12`,
                    padding: '1px 7px', borderRadius: 9999,
                  }}>
                    {card.drug}
                  </span>
                  <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
                    {card.ref}
                  </span>
                </div>
              </div>
              <span style={{
                flexShrink: 0,
                fontSize: 11, fontWeight: 600,
                padding: '3px 9px', borderRadius: 9999,
                color: card.tagColor, background: card.tagBg,
              }}>
                {card.tag}
              </span>
            </div>

            {/* Field rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {card.fields.map((f) => (
                <div key={f.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', borderRadius: 8,
                  background: '#F6F8FB',
                }}>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: '#111827', fontWeight: 600 }}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Friction score bar */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace', flexShrink: 0 }}>Friction</span>
              <div style={{ flex: 1, height: 4, borderRadius: 9999, background: '#E7EDF5', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 9999,
                  width: `${card.friction}%`,
                  background: card.friction >= 70 ? '#C2410C' : card.friction >= 45 ? '#B45309' : '#0F766E',
                }} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
                color: card.friction >= 70 ? '#C2410C' : card.friction >= 45 ? '#B45309' : '#0F766E',
              }}>{card.friction}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

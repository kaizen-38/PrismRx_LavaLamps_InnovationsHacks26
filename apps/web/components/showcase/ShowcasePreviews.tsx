'use client'

/**
 * ShowcasePreviews — live React code renders of PrismRx UI
 * No AI images. Actual PrismRx data, Paperlight colors, zero hallucination.
 */

// ── Matrix Mini Preview ────────────────────────────────────────────────────

const MATRIX_ROWS = [
  { drug: 'Infliximab',   payer: 'UnitedHealthcare', status: 'Conditional', friction: 78,  sc: '#B45309', sb: '#FFF6E8' },
  { drug: 'Infliximab',   payer: 'Cigna',            status: 'Conditional', friction: 100, sc: '#C2410C', sb: '#FFF1EB' },
  { drug: 'Rituximab',    payer: 'Cigna',            status: 'Covered',     friction: 31,  sc: '#0F766E', sb: '#EAF8F4' },
  { drug: 'Vedolizumab',  payer: 'UPMC',             status: 'Conditional', friction: 61,  sc: '#B45309', sb: '#FFF6E8' },
  { drug: 'Abatacept IV', payer: 'Cigna',            status: 'Preferred',   friction: 25,  sc: '#2B50FF', sb: '#ECF1FF' },
]

export function MatrixPreview() {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 8,
        overflowX: 'auto',
      }}
    >
      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.2fr 1fr 60px',
          padding: '8px 16px',
          background: '#F3F6FB',
          borderBottom: '1px solid #E7EDF5',
        }}
      >
        {['Drug', 'Payer', 'Status', 'Score'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {MATRIX_ROWS.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.2fr 1fr 60px',
            padding: '9px 16px',
            borderBottom: i < MATRIX_ROWS.length - 1 ? '1px solid #F3F6FB' : 'none',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{row.drug}</span>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace' }}>{row.payer}</span>
          <span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 10,
                fontWeight: 600,
                color: row.sc,
                background: row.sb,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: row.sc }} />
              {row.status}
            </span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: row.sc, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}>
            {row.friction}
          </span>
        </div>
      ))}

      {/* Legend */}
      <div
        style={{
          padding: '6px 16px',
          background: '#F3F6FB',
          borderTop: '1px solid #E7EDF5',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Covered',     color: '#0F766E' },
          { label: 'Conditional', color: '#B45309' },
          { label: 'Preferred',   color: '#2B50FF' },
          { label: 'Blocked',     color: '#C2410C' },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#64748B' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Simulator Mini Preview ─────────────────────────────────────────────────

const BLOCKERS = [
  { label: 'Step Therapy', detail: '2 DMARD failures required', color: '#C2410C', bg: '#FFF1EB' },
  { label: 'Prior Auth',   detail: 'Submit PA with clinical notes', color: '#B45309', bg: '#FFF6E8' },
  { label: 'Site of Care', detail: 'Infusion center only (no hospital)', color: '#B45309', bg: '#FFF6E8' },
]

export function SimulatorPreview() {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 8, overflow: 'hidden' }}>
      {/* Case summary bar */}
      <div
        style={{
          padding: '8px 16px',
          background: '#F3F6FB',
          borderBottom: '1px solid #E7EDF5',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          { l: 'Drug', v: 'Infliximab' },
          { l: 'Payer', v: 'UnitedHealthcare' },
          { l: 'Dx', v: 'RA (M05.9)' },
        ].map(({ l, v }) => (
          <span key={l} style={{ fontSize: 10, color: '#64748B' }}>
            <span style={{ fontWeight: 700, color: '#334155' }}>{l}</span> {v}
          </span>
        ))}
      </div>

      {/* Blockers section */}
      <div style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 9999,
              fontSize: 10, fontWeight: 700,
              color: '#C2410C', background: '#FFF1EB',
            }}
          >
            3 Blockers Found
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {BLOCKERS.map(b => (
            <div
              key={b.label}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '7px 10px',
                background: b.bg,
                borderRadius: 8,
                border: `1px solid ${b.color}20`,
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: b.color, marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.label}</div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{b.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fastest path */}
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: '#EAF8F4',
            borderRadius: 8,
            border: '1px solid #0F766E20',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#0F766E', marginBottom: 4 }}>
            ✓ Fastest Approvable Path
          </div>
          <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.5 }}>
            Submit PA · MTX + Leflunomide failure docs · Specify AIC site
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Radar Mini Preview ─────────────────────────────────────────────────────

const DIFFS = [
  {
    field: 'Step Therapy',
    type: 'tightened',
    before: '1 DMARD failure required',
    after: '2 DMARD failures, 3 months each',
    color: '#C2410C', bg: '#FFF1EB',
  },
  {
    field: 'Site of Care',
    type: 'tightened',
    before: 'Hospital or infusion center',
    after: 'Accredited infusion center only',
    color: '#C2410C', bg: '#FFF1EB',
  },
  {
    field: 'Reauthorization',
    type: 'unchanged',
    before: 'Annual clinical review',
    after: 'Annual clinical review',
    color: '#64748B', bg: '#F3F6FB',
  },
]

export function RadarPreview() {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '8px 16px',
          background: '#F3F6FB',
          borderBottom: '1px solid #E7EDF5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>
          UnitedHealthcare · Infliximab
        </span>
        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#94A3B8' }}>
          Oct 2023 → Jan 2024
        </span>
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DIFFS.map(d => (
          <div key={d.field} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${d.color}20` }}>
            <div
              style={{
                padding: '4px 10px',
                background: d.bg,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: d.color }}>{d.field}</span>
              <span
                style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px',
                  borderRadius: 9999, color: d.color, background: '#FFFFFF',
                  border: `1px solid ${d.color}30`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {d.type}
              </span>
            </div>
            {d.type !== 'unchanged' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '5px 10px', borderRight: '1px solid #E7EDF5' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#C2410C', marginBottom: 2 }}>BEFORE</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>{d.before}</div>
                </div>
                <div style={{ padding: '5px 10px' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#0F766E', marginBottom: 2 }}>AFTER</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>{d.after}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Building2, Stethoscope, Home, Hospital } from 'lucide-react'

interface Props {
  siteOfCare: string | null
}

const SITES = [
  { id: 'hospital_outpatient', label: 'Hospital outpatient', icon: Hospital },
  { id: 'physician_office', label: 'Physician office', icon: Stethoscope },
  { id: 'ambulatory', label: 'Ambulatory infusion', icon: Building2 },
  { id: 'home', label: 'Home infusion', icon: Home },
]

function detectSites(siteOfCare: string | null): Record<string, 'preferred' | 'restricted' | 'unknown'> {
  if (!siteOfCare) return Object.fromEntries(SITES.map(s => [s.id, 'unknown']))
  const lower = siteOfCare.toLowerCase()
  return {
    hospital_outpatient: lower.includes('hospital') ? (lower.includes('exception') || lower.includes('restrict') ? 'restricted' : 'preferred') : 'unknown',
    physician_office:    lower.includes('physician') || lower.includes('office') ? 'preferred' : 'unknown',
    ambulatory:          lower.includes('ambulatory') || lower.includes('infusion center') ? 'preferred' : 'unknown',
    home:                lower.includes('home') ? 'preferred' : 'unknown',
  }
}

const SITE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  preferred:  { bg: '#EAF8F4', color: '#0F766E', label: 'Covered' },
  restricted: { bg: '#FFF6E8', color: '#B45309', label: 'Restricted' },
  unknown:    { bg: 'var(--bg-soft)', color: 'var(--ink-faint)', label: 'Unknown' },
}

export function SiteOfCareWidget({ siteOfCare }: Props) {
  if (!siteOfCare) return null
  const statuses = detectSites(siteOfCare)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}
    >
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-soft)' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Site-of-Care Restrictions
        </p>
      </div>

      <div style={{ padding: '1rem 1.25rem 0.875rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        {SITES.map(site => {
          const status = statuses[site.id]
          const style = SITE_STYLE[status]
          const Icon = site.icon
          return (
            <div key={site.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', borderRadius: 10, background: style.bg, border: `1px solid ${style.color}20` }}>
              <Icon style={{ width: 13, height: 13, color: style.color, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: style.color }}>{style.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: style.color + 'cc' }}>{site.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '0 1.25rem 0.875rem' }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Per indexed policy: {siteOfCare}
        </p>
      </div>
    </motion.div>
  )
}

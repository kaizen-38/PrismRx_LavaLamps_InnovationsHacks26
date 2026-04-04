'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

/**
 * PolicyPrism — layered policy sheet stack with parallax depth.
 * Visual metaphor: structure emerging from chaotic policy documents.
 * NO blobs. NO generic shapes. Policy sheets only.
 */

const SHEETS = [
  {
    label: 'UHC · CS-2024-INF-001',
    fields: ['Step Therapy Required', 'Prior Auth: Yes', 'Site of Care: AIC only'],
    tag: 'Conditional',
    tagColor: '#B45309',
    tagBg: '#FFF6E8',
    tabColor: '#2B50FF',
    offset: { x: 60, y: 0, z: 0, rotate: 4 },
    delay: 0,
    w: 280,
  },
  {
    label: 'Cigna · CP-2024-RIT-004',
    fields: ['Coverage: Confirmed', 'PA Required', 'Specialist: Rheumatologist'],
    tag: 'Covered',
    tagColor: '#0F766E',
    tagBg: '#EAF8F4',
    tabColor: '#0F766E',
    offset: { x: -40, y: 20, z: -20, rotate: -5 },
    delay: 0.15,
    w: 260,
  },
  {
    label: 'Aetna · AE-2024-VED-007',
    fields: ['Preferred Biosimilar', 'Documentation req.', '6-month MTX failure'],
    tag: 'Conditional',
    tagColor: '#C2410C',
    tagBg: '#FFF1EB',
    tabColor: '#C2410C',
    offset: { x: 20, y: -30, z: -40, rotate: 2 },
    delay: 0.3,
    w: 250,
  },
]

const ANNOTATION_CHIPS = [
  { text: 'Site of Care',    dx: -130, dy: -40,  color: '#2B50FF', bg: '#ECF1FF' },
  { text: 'Prior Auth',      dx:  150, dy:  60,  color: '#B45309', bg: '#FFF6E8' },
  { text: 'Step Therapy',    dx: -80,  dy:  100, color: '#C2410C', bg: '#FFF1EB' },
  { text: 'Version Delta',   dx:  120, dy: -80,  color: '#0F766E', bg: '#EAF8F4' },
]

export function PolicyPrism() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const rotateY = useTransform(scrollYProgress, [0, 1], [0, 6])
  const floatY  = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Subtle hero gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 65% 40%, rgba(43,80,255,0.07) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      {/* Policy sheet stack */}
      <motion.div
        style={{ y: floatY, rotateY, perspective: 1000, transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {SHEETS.map((sheet, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: sheet.w,
              left: `calc(50% - ${sheet.w / 2}px + ${sheet.offset.x}px)`,
              top: `calc(50% - 90px + ${sheet.offset.y}px)`,
              rotate: sheet.offset.rotate,
              zIndex: SHEETS.length - i,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sheet.delay + 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="rounded-2xl p-5 paper-texture"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E7EDF5',
                boxShadow: '0 20px 50px rgba(15,23,42,0.09)',
              }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
            >
              {/* Tab marker */}
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 20,
                  width: 36, height: 3,
                  background: sheet.tabColor,
                  borderRadius: '0 0 4px 4px',
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: 10, fontFamily: 'var(--font-ibm-plex-mono, monospace)', color: '#94A3B8' }}>
                  {sheet.label}
                </span>
                <span
                  style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 9999,
                    color: sheet.tagColor, background: sheet.tagBg,
                  }}
                >
                  {sheet.tag}
                </span>
              </div>

              {/* Field rows */}
              {sheet.fields.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: 2, background: sheet.tabColor, opacity: 0.6, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#334155' }}>{f}</span>
                </div>
              ))}

              {/* Inline rule lines (decoration) */}
              <div style={{ marginTop: 12, borderTop: '1px solid #E7EDF5', paddingTop: 8, display: 'flex', gap: 4 }}>
                {[60, 80, 40].map((w, j) => (
                  <div key={j} style={{ height: 2, width: `${w}%`, background: '#E7EDF5', borderRadius: 1 }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        ))}

        {/* Floating annotation chips */}
        {ANNOTATION_CHIPS.map((chip, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `calc(50% + ${chip.dx}px)`, top: `calc(50% + ${chip.dy}px)` }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                color: chip.color,
                background: chip.bg,
                border: `1px solid ${chip.color}20`,
                boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
                fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
            >
              {chip.text}
            </motion.span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

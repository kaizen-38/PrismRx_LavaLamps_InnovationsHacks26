'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * HeroScene — CSS/canvas-based animated policy document backdrop.
 * Uses framer-motion floating elements instead of WebGL to avoid
 * react-three/fiber version compatibility issues.
 */

const SHEETS = [
  { w: 320, h: 220, x: '55%',  y: '18%',  rotate: 8,  color: '#5BE7FF', opacity: 0.07, delay: 0 },
  { w: 260, h: 180, x: '15%',  y: '25%',  rotate: -6, color: '#8F7CFF', opacity: 0.06, delay: 1.2 },
  { w: 360, h: 240, x: '70%',  y: '55%',  rotate: 4,  color: '#5BE7FF', opacity: 0.05, delay: 2.0 },
  { w: 200, h: 140, x: '35%',  y: '65%',  rotate: -9, color: '#FFCB7A', opacity: 0.04, delay: 0.8 },
  { w: 280, h: 190, x: '8%',   y: '60%',  rotate: 5,  color: '#62E7B7', opacity: 0.04, delay: 1.5 },
]

const LINES = [
  { x1: '5%',  y1: '35%', x2: '95%', y2: '35%', color: '#5BE7FF', opacity: 0.12 },
  { x1: '5%',  y1: '55%', x2: '95%', y2: '55%', color: '#8F7CFF', opacity: 0.08 },
  { x1: '20%', y1: '70%', x2: '80%', y2: '70%', color: '#FFCB7A', opacity: 0.06 },
]

const TAGS = [
  { label: 'Coverage',      x: '60%', y: '22%', delay: 0.4, color: '#5BE7FF' },
  { label: 'Step Therapy',  x: '12%', y: '30%', delay: 1.0, color: '#8F7CFF' },
  { label: 'Site of Care',  x: '72%', y: '58%', delay: 1.8, color: '#FFCB7A' },
  { label: 'Evidence',      x: '28%', y: '70%', delay: 0.6, color: '#62E7B7' },
  { label: 'Version Delta', x: '50%', y: '80%', delay: 2.2, color: '#5BE7FF' },
]

export function HeroScene() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Floating translucent policy sheets */}
      {SHEETS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-xl"
          style={{
            width: s.w,
            height: s.h,
            left: s.x,
            top: s.y,
            rotate: s.rotate,
            border: `1px solid ${s.color}30`,
            background: `linear-gradient(135deg, ${s.color}12 0%, transparent 60%)`,
            opacity: s.opacity * 8,
            boxShadow: `0 0 40px ${s.color}18, inset 0 1px 0 ${s.color}20`,
          }}
          animate={{
            y: [0, -12, 0],
            rotate: [s.rotate, s.rotate + 1.5, s.rotate],
          }}
          transition={{
            duration: 6 + i * 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: s.delay,
          }}
        >
          {/* Section divider lines inside the sheet */}
          <div
            className="absolute left-4 right-4"
            style={{
              top: '35%',
              height: '1px',
              background: `${s.color}30`,
            }}
          />
          <div
            className="absolute left-4 right-4"
            style={{
              top: '65%',
              height: '1px',
              background: `${s.color}20`,
            }}
          />
          {/* Annotation dots */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              right: 12,
              top: '35%',
              transform: 'translateY(-50%)',
              background: s.color,
              opacity: 0.5,
              boxShadow: `0 0 8px ${s.color}`,
            }}
          />
        </motion.div>
      ))}

      {/* SVG rule lines */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {LINES.map((l, i) => (
          <line
            key={i}
            x1={l.x1} y1={l.y1}
            x2={l.x2} y2={l.y2}
            stroke={l.color}
            strokeOpacity={l.opacity}
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Floating metadata tags */}
      {TAGS.map((tag, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: tag.x, top: tag.y }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: tag.delay + 0.8, duration: 0.6 }}
        >
          <motion.span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
            style={{
              color: tag.color,
              background: `${tag.color}10`,
              border: `1px solid ${tag.color}25`,
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.04em',
              boxShadow: `0 0 12px ${tag.color}15`,
            }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          >
            {tag.label}
          </motion.span>
        </motion.div>
      ))}

      {/* Central glow bloom */}
      <div
        className="absolute"
        style={{
          width: 600,
          height: 400,
          left: '50%',
          top: '40%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse at center, rgba(91,231,255,0.06) 0%, rgba(143,124,255,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

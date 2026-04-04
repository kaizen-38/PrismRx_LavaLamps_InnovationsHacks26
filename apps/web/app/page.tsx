'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  LayoutGrid, FlaskConical, Radio, FileText,
  ArrowRight, CheckCircle2, BookOpen, Shield, Zap,
} from 'lucide-react'
import { fadeUp, stagger, sectionEntry, hoverLift } from '@/lib/motion/presets'

import { HeroScene } from '@/components/3d/HeroScene'

// ── Data ──────────────────────────────────────────────────────────────────

const METRICS = [
  { value: '5',   label: 'Payers' },
  { value: '25+', label: 'Policy docs' },
  { value: '7',   label: 'Drug families' },
  { value: '50+', label: 'Citations' },
]

const PROBLEMS = [
  {
    icon: FileText,
    title: 'Policy sprawl',
    body: 'Payers publish coverage criteria across hundreds of inconsistent PDFs, portals, and HTML pages with no common structure.',
  },
  {
    icon: BookOpen,
    title: 'Criteria ambiguity',
    body: 'Step therapy, diagnosis requirements, and site-of-care rules are buried in legal prose — not structured fields.',
  },
  {
    icon: Zap,
    title: 'Manual slowness',
    body: 'Analysts spend hours per policy manually reading, comparing, and transcribing criteria that could be normalized automatically.',
  },
]

const FEATURES = [
  {
    href: '/matrix',
    icon: LayoutGrid,
    accent: '#5BE7FF',
    accentSoft: 'rgba(91,231,255,0.1)',
    title: 'Coverage Matrix',
    body: 'Compare coverage posture across all payers in a single decision table — with friction scores and PA flags per cell.',
    tag: 'Live',
  },
  {
    href: '/simulate',
    icon: FlaskConical,
    accent: '#8F7CFF',
    accentSoft: 'rgba(143,124,255,0.1)',
    title: 'Case Simulator',
    body: 'Enter a synthetic patient scenario and surface approval blockers, missing evidence, and the fastest approvable path.',
    tag: 'Synthetic only',
  },
  {
    href: '/radar',
    icon: Radio,
    accent: '#FFCB7A',
    accentSoft: 'rgba(255,203,122,0.08)',
    title: 'Change Radar',
    body: 'Track quarter-over-quarter policy drift. Know exactly what tightened, loosened, or changed — with semantic diff.',
    tag: 'Version diff',
  },
]

const STORY_STEPS = [
  { label: 'Raw policy PDF', color: '#7C8DA6', desc: 'Unstructured payer document — 40 pages of dense legal text' },
  { label: 'Extracted fields', color: '#5BE7FF', desc: 'Criteria parsed into structured schema with source citations' },
  { label: 'Normalized matrix', color: '#8F7CFF', desc: 'Drug × payer cross-reference with coverage status and friction' },
  { label: 'Case blockers', color: '#FF7D72', desc: 'Patient scenario matched against criteria — blockers surfaced' },
  { label: 'Version delta', color: '#FFCB7A', desc: 'Semantic diff shows exactly what changed between policy versions' },
]

const TRUST_ITEMS = [
  { icon: Shield, label: 'Public documents only', body: 'All policies sourced from publicly available payer websites.' },
  { icon: CheckCircle2, label: 'Synthetic cases only', body: 'No real patient data, no PHI, no insurance IDs.' },
  { icon: BookOpen, label: 'Every claim cited', body: 'Extracted criteria trace back to source page and section.' },
  { icon: FileText, label: 'HIPAA-aware posture', body: 'Architecture designed to be adaptable to regulated environments.' },
]

// ── Mini matrix preview data ───────────────────────────────────────────────

const PREVIEW_ROWS = [
  { payer: 'UnitedHealthcare', drug: 'Infliximab',  status: 'Conditional', friction: 72, color: '#FFC062' },
  { payer: 'Cigna',           drug: 'Rituximab',   status: 'Covered',     friction: 38, color: '#62E7B7' },
  { payer: 'UPMC Health Plan', drug: 'Vedolizumab', status: 'Conditional', friction: 61, color: '#FFC062' },
  { payer: 'UnitedHealthcare', drug: 'Tocilizumab', status: 'Not Covered', friction: 91, color: '#FF7D72' },
  { payer: 'Cigna',           drug: 'Abatacept IV', status: 'Preferred',   friction: 29, color: '#5BE7FF' },
]

function frictionColor(n: number) {
  if (n >= 70) return '#FF7D72'
  if (n >= 45) return '#FFC062'
  return '#62E7B7'
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ══ 1. HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-32 px-6">

        {/* Background decorations */}
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-grid-dark opacity-30 pointer-events-none" />

        {/* 3D scene (lazy-loaded) */}
        <HeroScene />

        {/* Hero content */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          {/* Overline badge */}
          <motion.div variants={fadeUp} className="mb-7">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                color: '#5BE7FF',
                background: 'rgba(91,231,255,0.08)',
                border: '1px solid rgba(91,231,255,0.2)',
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#5BE7FF] animate-pulse" />
              Innovation Hacks 2.0 · Anton RX Track
            </span>
          </motion.div>

          {/* Serif headline */}
          <motion.h1
            variants={fadeUp}
            className="font-serif-display mb-6 leading-[1.08]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Coverage is written{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>in fragments.</em>
            <br />
            <span className="text-gradient-prismrx">PrismRx turns it into signal.</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            variants={fadeUp}
            className="text-lg mx-auto mb-10 leading-relaxed max-w-2xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Policy intelligence for medical-benefit drugs. Compare coverage criteria across payers,
            inspect source evidence, simulate access barriers, and track policy drift — all grounded in citations.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Link href="/matrix">
              <motion.span
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(91,231,255,0.15) 0%, rgba(91,231,255,0.08) 100%)',
                  border: '1px solid rgba(91,231,255,0.3)',
                  color: '#5BE7FF',
                  boxShadow: '0 0 24px rgba(91,231,255,0.12)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 32px rgba(91,231,255,0.25)' }}
                whileTap={{ scale: 0.98 }}
              >
                Explore Coverage Matrix
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/simulate">
              <motion.span
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  background: 'rgba(23,35,53,0.6)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
                whileHover={{ color: '#E8EEF8', borderColor: 'rgba(164,183,211,0.3)' }}
                whileTap={{ scale: 0.98 }}
              >
                Run a Synthetic Case
              </motion.span>
            </Link>
          </motion.div>

          {/* Metric strip */}
          <motion.div
            variants={fadeUp}
            className="inline-flex divide-x rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(16,24,38,0.7)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            {METRICS.map((m) => (
              <div key={m.label} className="px-5 py-3 text-center" style={{ borderRight: '1px solid var(--border)' }}>
                <div
                  className="font-serif-display text-2xl font-medium"
                  style={{ color: '#FFCB7A', lineHeight: 1 }}
                >
                  {m.value}
                </div>
                <div className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-px h-10 mx-auto" style={{ background: 'linear-gradient(to bottom, var(--border), transparent)' }} />
        </motion.div>
      </section>

      {/* ══ 2. PROBLEM IN LAYERS ══════════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div className="text-center mb-16" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">The problem</motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl font-medium"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            >
              Medical-benefit drug policies are a mess.
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            {...sectionEntry}
            variants={stagger}
          >
            {PROBLEMS.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                {...hoverLift}
                className="card-doc p-7 flex flex-col gap-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(91,231,255,0.08)', border: '1px solid rgba(91,231,255,0.15)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#5BE7FF' }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                </div>
                <div
                  className="mt-auto pt-4 text-xs font-medium"
                  style={{
                    borderTop: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  doc_{i + 1}.pdf
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 3. SCROLLYTELLING ════════════════════════════════════════════════ */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-glow-violet-bottom pointer-events-none" />
        <div className="max-w-screen-xl mx-auto">
          <motion.div className="text-center mb-16 max-w-2xl mx-auto" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">How it works</motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl font-medium"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            >
              From scattered policy text to structured access intelligence.
            </motion.h2>
          </motion.div>

          {/* Step flow */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-5 gap-3"
            {...sectionEntry}
            variants={stagger}
          >
            {STORY_STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                variants={fadeUp}
                className="card-panel p-5 text-center flex flex-col items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-mono"
                  style={{
                    background: `${step.color}18`,
                    border: `1px solid ${step.color}40`,
                    color: step.color,
                  }}
                >
                  {i + 1}
                </div>
                <p className="text-xs font-semibold" style={{ color: step.color }}>{step.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                {i < STORY_STEPS.length - 1 && (
                  <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                    <ArrowRight className="w-3 h-3" style={{ color: 'var(--border-strong)' }} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 4. MINI MATRIX PREVIEW ════════════════════════════════════════════ */}
      <section className="py-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="overline mb-1">Live snapshot</p>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Coverage at a glance</h2>
            </div>
            <Link
              href="/matrix"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: '#5BE7FF' }}
            >
              Open full matrix <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div
            className="card-data overflow-hidden"
            {...sectionEntry}
            variants={fadeUp}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel-2)' }}>
                  {['Payer', 'Drug', 'Status', 'Friction'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest ${i === 3 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer transition-colors duration-100"
                    style={{ borderBottom: i < PREVIEW_ROWS.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onClick={() => window.location.href = '/matrix'}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3.5 font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{row.payer}</td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}>{row.drug}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ color: row.color, background: `${row.color}14`, border: `1px solid ${row.color}30` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.color }} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className="text-sm font-bold"
                        style={{ color: frictionColor(row.friction), fontFamily: '"IBM Plex Mono", monospace' }}
                      >
                        {row.friction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ══ 5. FEATURE GALLERY ════════════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div className="text-center mb-14" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">Product</motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl font-medium"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            >
              Three tools. One workspace.
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            {...sectionEntry}
            variants={stagger}
          >
            {FEATURES.map(({ href, icon: Icon, accent, accentSoft, title, body, tag }) => (
              <Link key={href} href={href} className="group block">
                <motion.div
                  variants={fadeUp}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="h-full card-doc p-7 flex flex-col gap-5"
                  style={{ '--accent': accent } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: accentSoft, border: `1px solid ${accent}30` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: accent }} />
                    </div>
                    <span
                      className="text-[10px] font-medium px-2 py-1 rounded-full"
                      style={{
                        color: accent,
                        background: accentSoft,
                        border: `1px solid ${accent}25`,
                        fontFamily: '"IBM Plex Mono", monospace',
                      }}
                    >
                      {tag}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
                  </div>

                  <div
                    className="flex items-center gap-2 text-sm font-medium transition-all opacity-60 group-hover:opacity-100"
                    style={{ color: accent }}
                  >
                    Open
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 6. TRUST BLOCK ════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(91,231,255,0.04) 0%, transparent 70%)' }}
        />
        <div className="max-w-screen-xl mx-auto">
          <motion.div className="text-center mb-14" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">Methodology</motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl font-medium"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            >
              Grounded in evidence. <br />
              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No guesswork, no hallucination.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            {...sectionEntry}
            variants={stagger}
          >
            {TRUST_ITEMS.map(({ icon: Icon, label, body }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="card-panel p-6 flex flex-col gap-4"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(98,231,183,0.1)', border: '1px solid rgba(98,231,183,0.2)' }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: '#62E7B7' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 7. FINAL CTA ══════════════════════════════════════════════════════ */}
      <section className="py-32 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          {...sectionEntry}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="overline mb-4">Ready?</motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-serif-display mb-6"
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Most tools tell you what the policy says.
            <br />
            <span className="text-gradient-prismrx">PrismRx tells you what it means.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-base mb-10" style={{ color: 'var(--text-secondary)' }}>
            Compare coverage. Inspect evidence. Spot policy drift. All in one workspace.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href="/matrix">
              <motion.span
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(91,231,255,0.18) 0%, rgba(143,124,255,0.12) 100%)',
                  border: '1px solid rgba(91,231,255,0.3)',
                  color: '#E8EEF8',
                  boxShadow: '0 0 32px rgba(91,231,255,0.1)',
                }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 48px rgba(91,231,255,0.2)' }}
                whileTap={{ scale: 0.98 }}
              >
                Start with the Matrix
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

    </div>
  )
}

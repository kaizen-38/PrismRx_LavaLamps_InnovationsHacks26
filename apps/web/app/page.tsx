'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2, Shield, FileText, Zap,
} from 'lucide-react'
import { PolicyPrism } from '@/components/3d/HeroScene'
import { MatrixPreview, SimulatorPreview, RadarPreview } from '@/components/showcase/ShowcasePreviews'
import {
  fadeUp, fadeIn, stagger, staggerSlow,
  sectionEntry, hoverLift, hoverButton, spring,
  EASE_STANDARD,
} from '@/lib/motion/presets'

// ── Data ──────────────────────────────────────────────────────────────────

const PAIN_CARDS = [
  {
    q: 'Which plans cover this drug?',
    a: 'Cross-payer coverage matrix with status, friction score, and effective date.',
    tag: 'Coverage Matrix',
    accent: '#2B50FF',
    bg: '#ECF1FF',
  },
  {
    q: 'What criteria block approval?',
    a: 'Step therapy, diagnosis gates, prior treatment requirements — all extracted from source policy text.',
    tag: 'Case Simulator',
    accent: '#C2410C',
    bg: '#FFF1EB',
  },
  {
    q: 'What changed this quarter?',
    a: 'Semantic diff between policy versions. Tightening, loosening, and new requirements shown with citations.',
    tag: 'Change Radar',
    accent: '#0F766E',
    bg: '#EAF8F4',
  },
]

const SHOWCASE_STEPS = [
  {
    step: '01',
    heading: 'Compare coverage across all payers',
    body: 'A single view of every payer\'s stance on a drug family — coverage status, prior auth flag, friction score, and effective date.',
    Preview: MatrixPreview,
    accent: '#2B50FF',
    href: '/matrix',
    cta: 'Open Coverage Matrix',
  },
  {
    step: '02',
    heading: 'Surface blockers before the PA request',
    body: 'Enter a patient scenario — drug, diagnosis, prior treatments, site of care — and instantly see what criteria are unmet and what the fastest approvable path looks like.',
    Preview: SimulatorPreview,
    accent: '#C2410C',
    href: '/simulate',
    cta: 'Try the Simulator',
  },
  {
    step: '03',
    heading: 'Know what changed — and why it matters',
    body: 'Quarter-over-quarter policy diffs with human-readable explanations. Every change linked back to its source page.',
    Preview: RadarPreview,
    accent: '#0F766E',
    href: '/radar',
    cta: 'See Change Radar',
  },
]

const TRUST_ITEMS = [
  { icon: Shield,       label: 'Public sources only',      body: 'Every policy pulled from publicly available payer portals. No proprietary data.' },
  { icon: CheckCircle2, label: 'Citations for every field', body: 'Each extracted criterion traces back to an exact page and section in the source document.' },
  { icon: FileText,     label: 'Synthetic cases only',     body: 'No real patient data, no PHI, no insurance identifiers are stored or processed.' },
  { icon: Zap,          label: 'End-to-end pipeline',      body: 'Ingestion → extraction → normalization → comparison → change detection in one system.' },
]

const PREVIEW_ROWS = [
  { payer: 'UnitedHealthcare', drug: 'Infliximab',   status: 'Conditional', friction: 78, sc: '#B45309', sb: '#FFF6E8' },
  { payer: 'Cigna',            drug: 'Rituximab',    status: 'Covered',     friction: 31, sc: '#0F766E', sb: '#EAF8F4' },
  { payer: 'UPMC Health Plan', drug: 'Vedolizumab',  status: 'Conditional', friction: 61, sc: '#B45309', sb: '#FFF6E8' },
  { payer: 'Aetna',            drug: 'Infliximab',   status: 'Conditional', friction: 82, sc: '#C2410C', sb: '#FFF1EB' },
  { payer: 'Cigna',            drug: 'Abatacept IV', status: 'Preferred',   friction: 25, sc: '#2B50FF', sb: '#ECF1FF' },
]

function frictionColor(n: number) {
  if (n >= 70) return '#C2410C'
  if (n >= 45) return '#B45309'
  return '#0F766E'
}

// ── Showcase step component ────────────────────────────────────────────────

function ShowcaseStep({ step, i }: { step: typeof SHOWCASE_STEPS[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], [-24, 24])
  const isEven = i % 2 === 0

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-20"
      style={{ borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none' }}
    >
      {/* Text — alternating sides */}
      <motion.div
        className={isEven ? 'order-1 lg:order-1' : 'order-1 lg:order-2'}
        {...sectionEntry}
        variants={stagger}
      >
        <motion.div variants={fadeUp}>
          <span
            className="inline-block mb-4 text-mono-meta font-mono"
            style={{ color: step.accent }}
          >
            {step.step}
          </span>
          <h3
            className="text-h2 font-sans mb-5"
            style={{ color: 'var(--ink-strong)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            {step.heading}
          </h3>
          <p
            className="text-body"
            style={{ color: 'var(--ink-body)', lineHeight: 1.7, maxWidth: '48ch', marginBottom: '2rem' }}
          >
            {step.body}
          </p>
          <Link href={step.href}>
            <motion.span
              className="btn-primary inline-flex items-center gap-2 cursor-pointer"
              style={{ background: step.accent }}
              {...hoverButton}
            >
              {step.cta}
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Image — parallax */}
      <motion.div
        className={`${isEven ? 'order-2 lg:order-2' : 'order-2 lg:order-1'} relative`}
        style={{ y: imgY }}
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_STANDARD, delay: 0.1 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Browser frame */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid var(--line-mid)',
            boxShadow: '0 32px 80px rgba(15,23,42,0.10)',
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--line-soft)' }}
          >
            <div className="flex gap-1.5">
              {['#FF5F5F','#FFBD2E','#28CA41'].map(c => (
                <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div
              className="flex-1 mx-3 rounded-md px-3 py-1 text-xs font-mono"
              style={{ background: 'var(--bg-surface)', color: 'var(--ink-muted)', border: '1px solid var(--line-soft)' }}
            >
              app.prismrx.io{step.href}
            </div>
          </div>
          {/* Live React preview — no AI images */}
          <div style={{ padding: '0.75rem', background: 'var(--bg-soft)' }}>
            <step.Preview />
          </div>
        </div>

        {/* Floating accent chip */}
        <motion.div
          className="absolute -bottom-4 -right-4"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm"
            style={{
              color: step.accent,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line-mid)',
              fontFamily: 'var(--font-ibm-plex-mono, monospace)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: step.accent }} />
            Step {step.step}
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-canvas)' }}>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-start justify-center overflow-hidden"
        style={{
          minHeight: '100svh',
          padding: '9rem 1.5rem 6rem',
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        {/* Policy Prism — positioned right side */}
        <PolicyPrism />

        {/* Hero content — left side */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-xl"
        >
          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mb-6"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 600,
              color: 'var(--ink-strong)',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
            }}
          >
            Drug coverage,
            <br />
            <span
              className="font-serif-accent"
              style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}
            >
              finally readable.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="text-body-l mb-10"
            style={{ color: 'var(--ink-body)', lineHeight: 1.65, maxWidth: '44ch' }}
          >
            PrismRx ingests public payer policies and turns them into structured, queryable coverage intelligence — with every claim cited back to the source.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-14">
            <Link href="/matrix">
              <motion.span
                className="btn-primary inline-flex items-center gap-2 cursor-pointer"
                {...hoverButton}
              >
                Explore Coverage Matrix
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/radar">
              <motion.span
                className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                {...hoverButton}
              >
                See What Changed
              </motion.span>
            </Link>
          </motion.div>

          {/* Stat strip */}
          <motion.div variants={fadeIn} className="flex flex-wrap gap-6">
            {[
              { v: '5 payers', l: 'indexed' },
              { v: '25+ policies', l: 'structured' },
              { v: '39×',   l: 'weekly prior auths / physician*' },
            ].map(({ v, l }) => (
              <div key={l}>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--ink-strong)',
                    letterSpacing: '-0.025em',
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-muted)',
                    marginTop: 2,
                    fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-px h-10 mx-auto"
            style={{ background: 'linear-gradient(to bottom, var(--line-mid), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ══ PAIN POINTS ════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div className="text-center mb-14" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">What users actually need</motion.p>
            <motion.h2
              variants={fadeUp}
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
                fontWeight: 600,
                color: 'var(--ink-strong)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              Three questions. One workspace.
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            {...sectionEntry}
            variants={stagger}
          >
            {PAIN_CARDS.map(({ q, a, tag, accent, bg }) => (
              <motion.div
                key={tag}
                variants={fadeUp}
                {...hoverLift}
                className="card-policy p-8 flex flex-col gap-5"
                style={{ paddingTop: '2.5rem' }}
              >
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-label font-semibold"
                  style={{ color: accent, background: bg }}
                >
                  {tag}
                </span>
                <h3
                  style={{
                    fontSize: '1.1875rem',
                    fontWeight: 600,
                    color: 'var(--ink-strong)',
                    letterSpacing: '-0.015em',
                    lineHeight: 1.3,
                  }}
                >
                  {q}
                </h3>
                <p style={{ fontSize: 15, color: 'var(--ink-body)', lineHeight: 1.65 }}>{a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PRODUCT SHOWCASE (Apple-style scrollytelling) ═══════════════════ */}
      <section style={{ background: 'var(--bg-canvas)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div className="text-center mb-6" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">How it works</motion.p>
            <motion.h2
              variants={fadeUp}
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
                fontWeight: 600,
                color: 'var(--ink-strong)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: '1rem',
              }}
            >
              From scattered policy text
              <br />
              <span
                className="font-serif-accent"
                style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}
              >
                to structured access intelligence.
              </span>
            </motion.h2>
          </motion.div>

          {/* Scroll-animated product steps */}
          {SHOWCASE_STEPS.map((step, i) => (
            <ShowcaseStep key={step.step} step={step} i={i} />
          ))}
        </div>
      </section>

      {/* ══ MATRIX LIVE PREVIEW ══════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            className="flex items-end justify-between mb-6 flex-wrap gap-4"
          >
            <div>
              <p className="overline mb-1">Live data</p>
              <h2
                style={{
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                  fontWeight: 600,
                  color: 'var(--ink-strong)',
                  letterSpacing: '-0.025em',
                }}
              >
                Coverage at a glance
              </h2>
            </div>
            <Link
              href="/matrix"
              className="inline-flex items-center gap-1 text-body-s font-medium"
              style={{ color: 'var(--accent-blue)' }}
            >
              Full matrix <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div
            className="card overflow-hidden"
            style={{ padding: 0, borderRadius: 20 }}
            {...sectionEntry}
            variants={fadeUp}
          >
            <table className="table-base w-full">
              <thead>
                <tr>
                  {['Payer', 'Drug', 'Status', 'Friction'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className="cursor-pointer"
                    onClick={() => (window.location.href = '/matrix')}
                  >
                    <td style={{ fontWeight: 500, color: 'var(--ink-strong)' }}>{row.payer}</td>
                    <td style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)', fontSize: 13, color: 'var(--ink-muted)' }}>
                      {row.drug}
                    </td>
                    <td>
                      <span
                        className="chip"
                        style={{ color: row.sc, background: row.sb }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.sc }} />
                        {row.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                          fontWeight: 500,
                          fontSize: 14,
                          color: frictionColor(row.friction),
                        }}
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

      {/* ══ TRUST ════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-canvas)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div className="text-center mb-14 mx-auto" style={{ maxWidth: '48ch' }} {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">Methodology</motion.p>
            <motion.h2
              variants={fadeUp}
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: 600,
                color: 'var(--ink-strong)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              Every claim cites its source.
            </motion.h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            {...sectionEntry}
            variants={staggerSlow}
          >
            {TRUST_ITEMS.map(({ icon: Icon, label, body }) => (
              <motion.div key={label} variants={fadeUp} className="card p-6 flex flex-col gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-blue-soft)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-strong)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65 }}>{body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ CLOSING EDITORIAL BAND ═══════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '8rem 1.5rem', textAlign: 'center' }}>
        <motion.div
          style={{ maxWidth: 760, margin: '0 auto' }}
          {...sectionEntry}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            className="font-serif-accent"
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
              fontStyle: 'italic',
              color: 'var(--ink-strong)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: '1.5rem',
            }}
          >
            Policies should be readable.<br />
            Access should not depend on guesswork.
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-body-l"
            style={{ color: 'var(--ink-muted)', marginBottom: '2.5rem', maxWidth: '44ch', margin: '0 auto 2.5rem' }}
          >
            Compare coverage. Inspect criteria. Trace evidence. Spot policy drift. All in one workspace.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href="/matrix">
              <motion.span
                className="btn-primary inline-flex items-center gap-2 cursor-pointer"
                style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}
                {...hoverButton}
              >
                Start with the Matrix
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/simulate">
              <motion.span
                className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}
                {...hoverButton}
              >
                Try the Simulator
              </motion.span>
            </Link>
          </motion.div>
          <motion.p
            variants={fadeIn}
            style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: '3rem', fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            * AMA 2025 Prior Authorization report
          </motion.p>
        </motion.div>
      </section>

    </div>
  )
}

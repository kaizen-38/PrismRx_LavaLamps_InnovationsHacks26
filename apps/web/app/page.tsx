'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Shield, FileText, Zap, Clock, Users, AlertTriangle } from 'lucide-react'
import { PolicyPrism } from '@/components/3d/HeroScene'
import {
  fadeUp, fadeIn, stagger, staggerSlow,
  hoverLift, hoverButton, spring,
  EASE_STANDARD,
} from '@/lib/motion/presets'

// ── Viewport preset — fire as soon as any pixel enters view ───────────────
const viewport = { once: true, amount: 0 as const }

// ── Data ──────────────────────────────────────────────────────────────────

const PAYERS = ['UnitedHealthcare', 'Cigna', 'Aetna', 'UPMC', 'Blue Shield']

const PAIN_POINTS = [
  {
    icon: Clock,
    stat: '39×',
    label: 'prior auth requests per physician annually',
    source: 'AMA 2025',
  },
  {
    icon: AlertTriangle,
    stat: '94%',
    label: 'of PA delays stem from incomplete or misread criteria',
    source: 'AHIP 2024',
  },
  {
    icon: Users,
    stat: '17 hrs',
    label: 'avg. time per week staff spend on manual PA research',
    source: 'MGMA 2024',
  },
]

const WORKFLOW_STEPS = [
  {
    n: '01',
    title: 'Ingest public payer PDFs',
    body: 'PrismRx fetches clinical policy bulletins directly from payer portals — Aetna, UHC, Cigna, UPMC, and more.',
    accent: '#2B50FF',
  },
  {
    n: '02',
    title: 'Extract & normalize with AI',
    body: 'An LLM pipeline parses every document and maps criteria into a structured PolicyDNA schema: PA flags, step therapy, diagnosis gates, lab requirements.',
    accent: '#7C3AED',
  },
  {
    n: '03',
    title: 'Query, compare, simulate',
    body: 'Compare coverage across payers, run synthetic approval scenarios, and track policy drift — all backed by exact page and section citations.',
    accent: '#0F766E',
  },
]

const FEATURES = [
  {
    step: '01',
    tag: 'Coverage Matrix',
    heading: 'Who covers what — at a glance',
    body: 'A cross-payer coverage grid for any drug family. Instantly see which payers cover, which require step therapy, and where friction is highest. Every cell is backed by a source citation.',
    image: '/showcase/matrix.png',
    accent: '#2B50FF',
    href: '/matrix',
    cta: 'Open Coverage Matrix',
  },
  {
    step: '02',
    tag: 'Case Simulator',
    heading: 'Surface blockers before the PA request',
    body: 'Enter a synthetic patient scenario — drug, diagnosis, prior treatments, care setting — and instantly see unmet criteria, friction scores, and the fastest approvable path across all payers.',
    image: '/showcase/simulator.png',
    accent: '#7C3AED',
    href: '/simulate',
    cta: 'Try the Simulator',
  },
  {
    step: '03',
    tag: 'Change Radar',
    heading: 'Know what changed — and why it matters',
    body: 'Quarter-over-quarter policy diffs with human-readable explanations. Each tightening or loosening is flagged with severity, friction delta, and a direct link to the source policy version.',
    image: '/showcase/radar.png',
    accent: '#0F766E',
    href: '/changes',
    cta: 'See Change Radar',
  },
]

const TRUST_ITEMS = [
  {
    icon: Shield,
    label: 'No PHI. Ever.',
    body: 'PrismRx runs exclusively on publicly available payer policy documents and synthetic cases. Protected Health Information is never ingested, stored, or processed.',
  },
  {
    icon: CheckCircle2,
    label: 'Every claim cites its source',
    body: 'Each extracted criterion traces back to an exact page and section reference in the source document — so you can verify every fact independently.',
  },
  {
    icon: FileText,
    label: 'Public documents only',
    body: 'All policy data comes directly from payer portals. No proprietary feeds, no scraped databases. If a payer publishes it, PrismRx indexes it.',
  },
  {
    icon: Zap,
    label: 'End-to-end pipeline',
    body: 'Ingestion → extraction → normalization → comparison → change detection. One system. No manual copy-paste from PDF to spreadsheet.',
  },
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

// ── Feature showcase (alternating left/right) ──────────────────────────────

function FeatureShowcase({ f, i }: { f: typeof FEATURES[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], [-20, 20])
  const isEven = i % 2 === 0

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-20"
      style={{ borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none' }}
    >
      {/* Text */}
      <motion.div
        className={isEven ? 'order-1 lg:order-1' : 'order-1 lg:order-2'}
        initial="hidden" whileInView="show" viewport={viewport}
        variants={stagger}
      >
        <motion.div variants={fadeUp}>
          <span
            className="inline-block mb-3 text-xs font-semibold rounded-full px-2.5 py-1"
            style={{ color: f.accent, background: `${f.accent}14` }}
          >
            {f.tag}
          </span>
          <h3
            className="mb-4"
            style={{
              fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
              fontWeight: 600,
              color: 'var(--ink-strong)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            {f.heading}
          </h3>
          <p
            style={{
              fontSize: 16,
              color: 'var(--ink-body)',
              lineHeight: 1.7,
              maxWidth: '46ch',
              marginBottom: '1.75rem',
            }}
          >
            {f.body}
          </p>
          <Link href={f.href}>
            <motion.span
              className="inline-flex items-center gap-2 cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: f.accent }}
              {...hoverButton}
            >
              {f.cta}
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Screenshot in browser frame */}
      <motion.div
        className={`${isEven ? 'order-2 lg:order-2' : 'order-2 lg:order-1'} relative`}
        style={{ y: imgY }}
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_STANDARD, delay: 0.1 }}
        viewport={viewport}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--line-mid)', boxShadow: '0 32px 80px rgba(15,23,42,0.10)' }}
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
              app.prismrx.io{f.href}
            </div>
          </div>
          <Image
            src={f.image}
            alt={f.heading}
            width={640}
            height={420}
            className="w-full object-cover"
            style={{ display: 'block' }}
          />
        </div>

        {/* Step chip */}
        <motion.div
          className="absolute -bottom-4 -right-4"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm"
            style={{
              color: f.accent,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line-mid)',
              fontFamily: 'var(--font-ibm-plex-mono, monospace)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.accent }} />
            Step {f.step}
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
        <PolicyPrism />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-xl"
        >
          {/* Payer trust strip */}
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-8 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>Policies indexed from</span>
            {PAYERS.map(p => (
              <span
                key={p}
                className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ color: 'var(--ink-muted)', background: 'var(--bg-soft)', border: '1px solid var(--line-soft)' }}
              >
                {p}
              </span>
            ))}
          </motion.div>

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
            Prior auth research
            <br />
            <span
              className="font-serif"
              style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}
            >
              automated.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            style={{ fontSize: 18, color: 'var(--ink-body)', lineHeight: 1.65, maxWidth: '46ch', marginBottom: '2.5rem' }}
          >
            PrismRx turns complex payer policy PDFs into structured coverage intelligence — compare plans, surface approval blockers, and track policy drift. Every claim cited back to the source.
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
            <Link href="/simulate">
              <motion.span
                className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                {...hoverButton}
              >
                Run a Synthetic Case
              </motion.span>
            </Link>
          </motion.div>

          {/* Business pain stats — no weak payer count */}
          <motion.div variants={fadeIn} className="flex flex-wrap gap-8">
            {[
              { v: '39×', l: 'prior auths per physician / year' },
              { v: '17 hrs', l: 'weekly per staff on PA research' },
              { v: '100%', l: 'facts cited to source' },
            ].map(({ v, l }) => (
              <div key={l}>
                <div style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.025em' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2, fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{l}</div>
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
          <div className="w-px h-10 mx-auto" style={{ background: 'linear-gradient(to bottom, var(--line-mid), transparent)' }} />
        </motion.div>
      </section>

      {/* ══ THE PROBLEM ════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div
            className="text-center mb-12"
            initial="hidden" whileInView="show" viewport={viewport}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--ink-muted)' }}
            >
              The problem
            </motion.p>
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
              PA criteria live in 40-page PDFs.
              <br />
              <span className="font-serif" style={{ fontStyle: 'italic', color: 'var(--accent-coral)' }}>Nobody reads every page.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            initial="hidden" whileInView="show" viewport={viewport}
            variants={stagger}
          >
            {PAIN_POINTS.map(({ icon: Icon, stat, label, source }) => (
              <motion.div
                key={stat}
                variants={fadeUp}
                className="rounded-2xl p-7 flex flex-col gap-3"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line-mid)',
                  boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: 'var(--accent-coral)' }} />
                <div
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                    fontWeight: 700,
                    color: 'var(--ink-strong)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {stat}
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink-body)', lineHeight: 1.55 }}>{label}</p>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{source}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-canvas)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div
            className="text-center mb-14"
            initial="hidden" whileInView="show" viewport={viewport}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--ink-muted)' }}
            >
              How it works
            </motion.p>
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
              From scattered policy text
              <br />
              <span className="font-serif" style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}>to structured access intelligence.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-0"
            initial="hidden" whileInView="show" viewport={viewport}
            variants={stagger}
            style={{ border: '1px solid var(--line-mid)', borderRadius: 20, overflow: 'hidden' }}
          >
            {WORKFLOW_STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeUp}
                className="p-8 flex flex-col gap-4"
                style={{
                  background: 'var(--bg-surface)',
                  borderRight: i < 2 ? '1px solid var(--line-soft)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: s.accent }}
                  >
                    {s.n}
                  </span>
                  <div className="h-px flex-1" style={{ background: 'var(--line-soft)' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.015em' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-body)', lineHeight: 1.65 }}>{s.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURE SHOWCASE ═══════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div
            className="text-center mb-6"
            initial="hidden" whileInView="show" viewport={viewport}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--ink-muted)' }}
            >
              The product
            </motion.p>
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
              Three questions. One workspace.
            </motion.h2>
          </motion.div>

          {FEATURES.map((f, i) => (
            <FeatureShowcase key={f.step} f={f} i={i} />
          ))}
        </div>
      </section>

      {/* ══ LIVE PREVIEW ═══════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-canvas)', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--ink-muted)' }}>Live data</p>
              <h2 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.025em' }}>
                Coverage at a glance
              </h2>
            </div>
            <Link
              href="/matrix"
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: 'var(--accent-blue)' }}
            >
              Full matrix <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div
            className="overflow-hidden"
            style={{ borderRadius: 20, border: '1px solid var(--line-mid)', background: 'var(--bg-surface)' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_STANDARD }}
            viewport={viewport}
          >
            <table className="table-base w-full">
              <thead>
                <tr>
                  {['Payer', 'Drug', 'Status', 'Friction Score'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS.map((row, i) => (
                  <tr key={i} className="cursor-pointer" onClick={() => (window.location.href = '/matrix')}>
                    <td style={{ fontWeight: 500, color: 'var(--ink-strong)' }}>{row.payer}</td>
                    <td style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)', fontSize: 13, color: 'var(--ink-muted)' }}>{row.drug}</td>
                    <td>
                      <span className="chip" style={{ color: row.sc, background: row.sb }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.sc }} />
                        {row.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)', fontWeight: 600, fontSize: 14, color: frictionColor(row.friction) }}>
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

      {/* ══ TRUST / COMPLIANCE ═════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div
            className="text-center mb-14 mx-auto"
            style={{ maxWidth: '52ch' }}
            initial="hidden" whileInView="show" viewport={viewport}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--ink-muted)' }}
            >
              Built for healthcare
            </motion.p>
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
              <br />
              <span className="font-serif" style={{ fontStyle: 'italic', color: 'var(--accent-teal)' }}>No hallucinations. No PHI.</span>
            </motion.h2>
          </motion.div>

          {/* Compliance banner */}
          <motion.div
            className="rounded-2xl mb-8 px-6 py-5 flex flex-wrap items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, rgba(15,118,110,0.06), rgba(43,80,255,0.05))',
              border: '1px solid rgba(15,118,110,0.2)',
            }}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={viewport}
          >
            <div className="flex flex-wrap gap-4">
              {['Public documents only', 'Synthetic cases only', 'No PHI processed or stored', 'Designed for regulated environments'].map(t => (
                <span key={t} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent-teal)' }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
            <Link href="/about" className="text-sm font-medium shrink-0" style={{ color: 'var(--accent-blue)' }}>
              Full compliance posture →
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            initial="hidden" whileInView="show" viewport={viewport}
            variants={staggerSlow}
          >
            {TRUST_ITEMS.map(({ icon: Icon, label, body }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                {...hoverLift}
                className="p-6 flex flex-col gap-4 rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-mid)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-blue-s)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-strong)', marginBottom: 6, letterSpacing: '-0.01em' }}>{label}</p>
                  <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65 }}>{body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-canvas)', padding: '8rem 1.5rem', textAlign: 'center' }}>
        <motion.div
          style={{ maxWidth: 700, margin: '0 auto' }}
          initial="hidden" whileInView="show" viewport={viewport}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            className="font-serif"
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
            style={{ fontSize: 17, color: 'var(--ink-muted)', marginBottom: '2.5rem', maxWidth: '44ch', margin: '0 auto 2.5rem' }}
          >
            Compare coverage. Inspect criteria. Trace evidence. Spot policy drift. All in one workspace.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-8">
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

          <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-6 pt-4" style={{ borderTop: '1px solid var(--line-soft)' }}>
            {[
              { label: 'Built at Innovation Hacks 2026', href: '/about' },
              { label: 'Anton RX Track · LavaLamps', href: '/about' },
              { label: 'View source methodology', href: '/sources' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-xs font-mono transition-colors"
                style={{ color: 'var(--ink-faint)' }}
              >
                {label}
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </section>

    </div>
  )
}

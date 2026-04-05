'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2, Shield, FileText, Zap,
  Sparkles, MessageSquare, Search, Brain,
} from 'lucide-react'
import { PolicyPrism } from '@/components/3d/HeroScene'
import {
  fadeUp, fadeIn, stagger, staggerSlow,
  sectionEntry, hoverLift, hoverButton,
  EASE_STANDARD,
} from '@/lib/motion/presets'

// ── Data ──────────────────────────────────────────────────────────────────

const PAIN_CARDS = [
  {
    q: 'Does this payer cover my drug?',
    a: 'Ask the workspace in plain English. The agent pulls indexed policy, resolves payer and drug, and returns a structured coverage verdict with citations.',
    tag: 'Coverage',
    accent: '#2B50FF',
    bg: '#ECF1FF',
    icon: Search,
  },
  {
    q: 'What criteria will block my PA?',
    a: 'The agent extracts step therapy requirements, diagnosis gates, and prior treatment failures — directly from source policy text, not summaries.',
    tag: 'Prior Auth',
    accent: '#C2410C',
    bg: '#FFF1EB',
    icon: Brain,
  },
  {
    q: 'Is there a lower-friction path?',
    a: 'Ask which payer has the most lenient criteria for this drug. The agent scores access burden and surfaces the clearest approval path.',
    tag: 'Access Path',
    accent: '#0F766E',
    bg: '#EAF8F4',
    icon: MessageSquare,
  },
]

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'You ask in plain English',
    body: 'Type or speak any coverage question — payer, drug, diagnosis, prior therapies — in any format.',
    accent: '#2B50FF',
  },
  {
    n: '02',
    title: 'The agent reasons over policy',
    body: 'A LangGraph agentic pipeline routes your query, crawls or searches indexed policy documents, and extracts structured criteria.',
    accent: '#7C3AED',
  },
  {
    n: '03',
    title: 'Structured intelligence — cited',
    body: 'Coverage verdict, blocker list, evidence citations, and next-best-action — all traceable to the exact policy page.',
    accent: '#0F766E',
  },
]

const TRUST_ITEMS = [
  { icon: Shield, label: 'Public sources only', body: 'Every policy pulled from publicly available payer portals. No proprietary data.' },
  { icon: CheckCircle2, label: 'Citations for every field', body: 'Each extracted criterion traces back to an exact page and section in the source document.' },
  { icon: FileText, label: 'Synthetic cases only', body: 'No real patient data, no PHI, no insurance identifiers are stored or processed.' },
  { icon: Zap, label: 'End-to-end agentic pipeline', body: 'LangGraph routing → live web crawl → Claude extraction → structured widget output in one system.' },
]

// ── Workspace preview (live React, no AI images) ──────────────────────────

function WorkspacePreview() {
  const msgs = [
    { role: 'user', text: 'Does UnitedHealthcare cover Rituximab for RA?' },
    { role: 'ai', text: 'Per the indexed policy snapshot, UnitedHealthcare covers Rituximab for Rheumatoid Arthritis with prior authorization required. Step therapy failure of one conventional DMARD must be documented.' },
  ]
  return (
    <div style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg, rgba(43,80,255,0.06) 0%, transparent 60%)', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ width: 20, height: 20, borderRadius: 7, background: 'linear-gradient(135deg,#2B50FF,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles style={{ width: 11, height: 11, color: '#fff' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-strong)' }}>PrismRx Copilot</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#2B50FF', background: 'rgba(43,80,255,0.09)', padding: '2px 8px', borderRadius: 9999 }}>Indexed corpus</span>
      </div>
      {/* Messages */}
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', padding: '0 0.5rem' }}>
          <div style={{
            maxWidth: '85%',
            padding: '0.55rem 0.8rem',
            borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: m.role === 'user' ? 'linear-gradient(135deg,#3d62ff,#2B50FF)' : 'var(--bg-surface)',
            border: m.role === 'ai' ? '1px solid var(--line-soft)' : 'none',
            fontSize: 11.5, lineHeight: 1.55,
            color: m.role === 'user' ? '#fff' : 'var(--ink-body)',
            boxShadow: m.role === 'user' ? '0 6px 18px rgba(43,80,255,0.22)' : 'var(--shadow-xs)',
          }}>
            {m.text}
          </div>
        </div>
      ))}
      {/* Widget stub */}
      <div style={{ margin: '4px 8px 2px', padding: '0.6rem 0.85rem', background: 'var(--bg-soft)', borderRadius: 12, border: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F766E', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#0F766E' }}>Covered</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-muted)' }}>PA Required · Step therapy</span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-canvas)' }}>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight: '100svh',
          padding: '7rem 1.5rem 4rem',
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
        }}
        className="hero-grid"
      >
        {/* Hero content — left column */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ position: 'relative', zIndex: 10 }}
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0.35rem 0.75rem', borderRadius: 9999,
              background: 'rgba(43,80,255,0.09)', border: '1px solid rgba(43,80,255,0.2)',
              fontSize: 12, fontWeight: 600, color: '#2B50FF',
            }}>
              <Sparkles style={{ width: 12, height: 12 }} />
              Agentic AI · LangGraph + Claude
            </span>
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
            Drug coverage,
            <br />
            <span
              className="font-serif-accent"
              style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}
            >
              ask anything.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="text-body-l mb-10"
            style={{ color: 'var(--ink-body)', lineHeight: 1.65, maxWidth: '44ch' }}
          >
            PrismRx's agentic copilot understands your question, pulls the right indexed payer policy, extracts PA criteria and blockers, and returns a structured, cited answer — in seconds.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-14">
            <Link href="/workspace">
              <motion.span
                className="btn-primary inline-flex items-center gap-2 cursor-pointer"
                {...hoverButton}
                style={{ padding: '0.875rem 1.75rem', fontSize: '1rem' }}
              >
                <Sparkles style={{ width: 16, height: 16 }} />
                Open the workspace
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/matrix">
              <motion.span
                className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                {...hoverButton}
              >
                Coverage matrix
              </motion.span>
            </Link>
          </motion.div>

          {/* Stat strip */}
          <motion.div variants={fadeIn} className="flex flex-wrap gap-6">
            {[
              { v: '5 payers', l: 'indexed' },
              { v: 'LangGraph', l: 'agentic routing' },
              { v: '39×', l: 'weekly prior auths / physician*' },
            ].map(({ v, l }) => (
              <div key={l}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.025em' }}>
                  {v}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                  {l}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* PolicyPrism — right column */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '1rem' }}
        >
          <PolicyPrism />
        </motion.div>
      </section>

      {/* ══ PAIN POINTS ════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div className="text-center mb-14" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">What users actually ask</motion.p>
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
              Three questions. One agent.
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            {...sectionEntry}
            variants={stagger}
          >
            {PAIN_CARDS.map(({ q, a, tag, accent, bg, icon: Icon }) => (
              <motion.div
                key={tag}
                variants={fadeUp}
                {...hoverLift}
                className="card-policy p-8 flex flex-col gap-5"
                style={{ paddingTop: '2.5rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label font-semibold"
                    style={{ color: accent, background: bg }}
                  >
                    <Icon style={{ width: 11, height: 11 }} />
                    {tag}
                  </span>
                </div>
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

      {/* ══ WORKSPACE DEMO SECTION ═══════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-canvas)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <motion.div {...sectionEntry} variants={stagger}>
              <motion.span variants={fadeUp} style={{ display: 'inline-block', marginBottom: '1rem', fontSize: 13, fontWeight: 600, color: '#2B50FF', fontFamily: 'var(--font-ibm-plex-mono,monospace)' }}>
                01 — The AI Workspace
              </motion.span>
              <motion.h3 variants={fadeUp} style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.25rem' }}>
                Conversational coverage intelligence
              </motion.h3>
              <motion.p variants={fadeUp} style={{ fontSize: 15, color: 'var(--ink-body)', lineHeight: 1.7, maxWidth: '48ch', marginBottom: '1.5rem' }}>
                The workspace is a two-pane agentic interface. Left: a chat stream where you ask coverage questions in natural language. Right: a live intelligence deck — structured widgets for coverage verdict, PA blockers, step therapy requirements, evidence citations, and more.
              </motion.p>
              <motion.ul variants={fadeUp} style={{ margin: '0 0 2rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'LangGraph routes your query to the right policy tool',
                  'Live web crawl + indexed corpus retrieval',
                  'Claude extracts structured criteria and blockers',
                  'Every answer cites the exact policy page',
                  'Voice input — speak your question naturally',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--ink-body)' }}>
                    <CheckCircle2 style={{ width: 15, height: 15, color: '#2B50FF', flexShrink: 0, marginTop: 2 }} />
                    {item}
                  </li>
                ))}
              </motion.ul>
              <Link href="/workspace">
                <motion.span
                  className="btn-primary inline-flex items-center gap-2 cursor-pointer"
                  style={{ background: '#2B50FF' }}
                  {...hoverButton}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  Try the workspace
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </motion.div>

            {/* Workspace preview */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_STANDARD, delay: 0.1 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid var(--line-mid)',
                  boxShadow: '0 32px 80px rgba(15,23,42,0.10)',
                }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="flex gap-1.5">
                    {['#FF5F5F', '#FFBD2E', '#28CA41'].map(c => (
                      <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex-1 mx-3 rounded-md px-3 py-1 text-xs font-mono" style={{ background: 'var(--bg-surface)', color: 'var(--ink-muted)', border: '1px solid var(--line-soft)' }}>
                    app.prismrx.io/workspace
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-soft)' }}>
                  <WorkspacePreview />
                </div>
              </div>
              {/* Floating chip */}
              <motion.div
                className="absolute -bottom-4 -right-4"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm"
                  style={{ color: '#2B50FF', background: 'var(--bg-surface)', border: '1px solid var(--line-mid)', fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                  <Sparkles style={{ width: 10, height: 10 }} />
                  Agentic · cited
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--bg-page)', padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <motion.div className="text-center mb-14" {...sectionEntry} variants={stagger}>
            <motion.p variants={fadeUp} className="overline mb-3">Under the hood</motion.p>
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
              From question
              <br />
              <span className="font-serif-accent" style={{ fontStyle: 'italic', color: 'var(--accent-blue)' }}>
                to structured policy intelligence.
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            {...sectionEntry}
            variants={stagger}
          >
            {HOW_IT_WORKS.map(({ n, title, body, accent }) => (
              <motion.div
                key={n}
                variants={fadeUp}
                {...hoverLift}
                className="card p-7 flex flex-col gap-4"
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{n}</span>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.01em', lineHeight: 1.3, margin: 0 }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65, margin: 0 }}>{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ TRUST / METHODOLOGY ══════════════════════════════════════════════ */}
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-blue-soft)' }}>
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
            Ask the policy.<br />
            Get a cited answer.
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-body-l"
            style={{ color: 'var(--ink-muted)', marginBottom: '2.5rem', maxWidth: '44ch', margin: '0 auto 2.5rem' }}
          >
            The PrismRx workspace is an agentic copilot for medical benefit drug access — built for the 39 prior authorizations your physicians handle every week.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href="/workspace">
              <motion.span
                className="btn-primary inline-flex items-center gap-2 cursor-pointer"
                style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}
                {...hoverButton}
              >
                <Sparkles style={{ width: 16, height: 16 }} />
                Open the workspace
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/matrix">
              <motion.span
                className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}
                {...hoverButton}
              >
                Coverage matrix
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

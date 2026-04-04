'use client'

import { motion } from 'framer-motion'
import {
  LayoutGrid,
  FlaskConical,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

const TableCellsIcon = LayoutGrid
const BeakerIcon = FlaskConical
const ChartBarSquareIcon = BarChart3
const ArrowRightIcon = ArrowRight
const CheckCircleIcon = CheckCircle2
import Link from 'next/link'

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Payers tracked',    value: '5' },
  { label: 'Policy documents',  value: '25+' },
  { label: 'Drug families',     value: '5' },
  { label: 'Evidence citations', value: '50+' },
]

const FEATURES = [
  'Normalized Policy DNA objects — not raw PDFs',
  'Source citations with page & section references',
  'Friction score per drug × payer combination',
  'Semantic version diffs — tightened vs. loosened',
  'Synthetic case simulation — no PHI',
  'Role-based access (Auth0) + voice brief (ElevenLabs)',
]

const TESTIMONIAL_ROWS = [
  { payer: 'Aetna',             drug: 'Infliximab',   status: 'Conditional', friction: 72 },
  { payer: 'Blue Shield CA',    drug: 'Infliximab',   status: 'Preferred',   friction: 48 },
  { payer: 'Cigna',             drug: 'Infliximab',   status: 'Non-Preferred',friction: 82 },
  { payer: 'UnitedHealthcare',  drug: 'Vedolizumab',  status: 'Covered',     friction: 32 },
  { payer: 'Blue Shield CA',    drug: 'Tocilizumab',  status: 'Not Covered', friction: 91 },
]

const STATUS_COLORS: Record<string, string> = {
  'Covered':      'text-emerald-400',
  'Preferred':    'text-blue-400',
  'Conditional':  'text-amber-400',
  'Non-Preferred':'text-orange-400',
  'Not Covered':  'text-red-400',
}

// ── Components ────────────────────────────────────────────────────────────────

function CTACard({
  href,
  icon: Icon,
  title,
  description,
  accent,
  loadingCopy,
  requiredRole,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  accent: 'cyan' | 'violet' | 'blue'
  loadingCopy: string
  requiredRole?: string
}) {
  const ACCENTS = {
    cyan:   { border: 'hover:border-cyan-500/50', glow: 'hover:shadow-glow-cyan', icon: 'text-cyan-400 bg-cyan-500/10', tag: 'text-cyan-400' },
    violet: { border: 'hover:border-violet-500/50', glow: 'hover:shadow-glow-violet', icon: 'text-violet-400 bg-violet-500/10', tag: 'text-violet-400' },
    blue:   { border: 'hover:border-blue-500/50', glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]', icon: 'text-blue-400 bg-blue-500/10', tag: 'text-blue-400' },
  }
  const a = ACCENTS[accent]

  return (
    <Link href={href} className="group block">
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.18 }}
        className={`
          relative h-full flex flex-col gap-5 p-7 rounded-2xl
          bg-navy-900 border border-navy-700
          ${a.border} ${a.glow}
          transition-all duration-200
        `}
      >
        {/* Role badge */}
        {requiredRole && (
          <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full border border-navy-600 bg-navy-800/80 px-2 py-0.5 text-[10px] text-slate-500">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            {requiredRole}
          </div>
        )}

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.icon}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-mono ${a.tag}`}>{loadingCopy}</span>
          <ArrowRightIcon className={`w-4 h-4 ${a.tag} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150`} />
        </div>
      </motion.div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background grid + glow */}
      <div className="absolute inset-0 bg-grid-navy opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-glow-cyan pointer-events-none" />
      <div className="absolute inset-0 bg-glow-violet pointer-events-none" />

      <div className="relative mx-auto max-w-screen-xl px-6 pt-20 pb-32">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-xs font-medium text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Innovation Hacks 2026 · Anton RX Track
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
          >
            Coverage intelligence
            <br />
            <span className="text-gradient-prismrx">for medical benefit drugs</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-xl text-slate-400 leading-relaxed mb-4"
          >
            PrismRx turns fragmented payer policies into a{' '}
            <span className="text-slate-200">searchable, comparable, and explainable</span>{' '}
            workspace. Compare coverage posture across payers, simulate access barriers,
            and track semantic policy drift — all grounded in source citations.
          </motion.p>

          <motion.p variants={fadeUp} className="text-sm font-mono text-slate-600">
            Public payer documents · Synthetic cases only · No PHI · HIPAA-aware architecture
          </motion.p>
        </motion.div>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-20 rounded-2xl overflow-hidden border border-navy-700 bg-navy-700"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-navy-900 px-6 py-5 text-center">
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Three core CTAs ───────────────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20"
        >
          <CTACard
            href="/matrix"
            icon={TableCellsIcon}
            title="Compare a drug"
            description="Instantly see which plans cover your drug, under what conditions, and with what administrative burden — across all payers in a single view."
            accent="cyan"
            loadingCopy="Decomposing payer language..."
          />
          <CTACard
            href="/simulate"
            icon={BeakerIcon}
            title="Run a case"
            description="Enter a synthetic patient scenario and surface approval blockers, missing evidence, and the fastest likely approvable path per payer."
            accent="violet"
            loadingCopy="Resolving biosimilar relationships..."
            requiredRole="Coordinator"
          />
          <CTACard
            href="/radar"
            icon={ChartBarSquareIcon}
            title="See what changed"
            description="Track quarter-over-quarter policy drift. Understand whether access criteria tightened or loosened and which synthetic patient archetypes are now blocked."
            accent="blue"
            loadingCopy="Computing policy drift..."
            requiredRole="Analyst"
          />
        </motion.div>

        {/* ── Mini matrix preview ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mb-20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              Live coverage snapshot
            </h2>
            <Link
              href="/matrix"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              Open full matrix <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-navy-700 bg-navy-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Payer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Drug</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Friction</th>
                </tr>
              </thead>
              <tbody>
                {TESTIMONIAL_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-navy-800 hover:bg-navy-800/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = '/matrix'}
                  >
                    <td className="px-4 py-3 text-slate-300 font-medium">{row.payer}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.drug}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${STATUS_COLORS[row.status] ?? 'text-slate-400'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-mono text-xs font-bold ${
                          row.friction >= 70 ? 'text-red-400' :
                          row.friction >= 45 ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}
                      >
                        {row.friction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Feature list ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
            What&apos;s under the hood
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-400">
                <CheckCircleIcon className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </motion.div>

      </div>
    </div>
  )
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CoverageStatus, ChangeDirection, ChangeImpact } from './types'

// ── Tailwind class merging ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Coverage status helpers ───────────────────────────────────────────────────

export const COVERAGE_STATUS_LABEL: Record<CoverageStatus, string> = {
  covered:      'Covered',
  conditional:  'Conditional',
  preferred:    'Preferred',
  nonpreferred: 'Non-Preferred',
  not_covered:  'Not Covered',
  unclear:      'Unclear',
}

export const COVERAGE_STATUS_COLOR: Record<CoverageStatus, string> = {
  covered:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  conditional:  'bg-amber-50 text-amber-700 ring-amber-200',
  preferred:    'bg-cyan-50 text-cyan-700 ring-cyan-200',
  nonpreferred: 'bg-orange-50 text-orange-700 ring-orange-200',
  not_covered:  'bg-rose-50 text-rose-700 ring-rose-200',
  unclear:      'bg-slate-100 text-slate-600 ring-slate-200',
}

export const COVERAGE_STATUS_DOT: Record<CoverageStatus, string> = {
  covered:      'bg-emerald-500',
  conditional:  'bg-amber-500',
  preferred:    'bg-cyan-500',
  nonpreferred: 'bg-orange-500',
  not_covered:  'bg-rose-500',
  unclear:      'bg-slate-400',
}

// ── Friction score helpers ────────────────────────────────────────────────────

export function frictionLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 35) return 'low'
  if (score <= 65) return 'medium'
  return 'high'
}

export const FRICTION_LEVEL_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
}

export const FRICTION_LEVEL_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low:    'text-emerald-700 bg-emerald-50',
  medium: 'text-amber-700 bg-amber-50',
  high:   'text-rose-700 bg-rose-50',
}

// ── Change direction helpers ──────────────────────────────────────────────────

export const CHANGE_DIRECTION_LABEL: Record<ChangeDirection, string> = {
  tightened: 'Tightened',
  loosened:  'Loosened',
  unchanged: 'Unchanged',
  added:     'Added',
  removed:   'Removed',
}

export const CHANGE_DIRECTION_COLOR: Record<ChangeDirection, string> = {
  tightened: 'text-rose-700 bg-rose-50',
  loosened:  'text-emerald-700 bg-emerald-50',
  unchanged: 'text-slate-600 bg-slate-100',
  added:     'text-cyan-700 bg-cyan-50',
  removed:   'text-amber-700 bg-amber-50',
}

export const CHANGE_IMPACT_COLOR: Record<ChangeImpact, string> = {
  high:   'text-rose-700',
  medium: 'text-amber-700',
  low:    'text-slate-600',
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateShort(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })
}

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
  covered:      'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  conditional:  'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  preferred:    'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  nonpreferred: 'bg-orange-500/15 text-orange-400 ring-orange-500/30',
  not_covered:  'bg-red-500/15 text-red-400 ring-red-500/30',
  unclear:      'bg-gray-500/15 text-gray-400 ring-gray-500/30',
}

export const COVERAGE_STATUS_DOT: Record<CoverageStatus, string> = {
  covered:      'bg-emerald-400',
  conditional:  'bg-amber-400',
  preferred:    'bg-blue-400',
  nonpreferred: 'bg-orange-400',
  not_covered:  'bg-red-400',
  unclear:      'bg-gray-400',
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
  low:    'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  high:   'text-red-400 bg-red-500/10',
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
  tightened: 'text-red-400 bg-red-500/10',
  loosened:  'text-emerald-400 bg-emerald-500/10',
  unchanged: 'text-gray-400 bg-gray-500/10',
  added:     'text-blue-400 bg-blue-500/10',
  removed:   'text-orange-400 bg-orange-500/10',
}

export const CHANGE_IMPACT_COLOR: Record<ChangeImpact, string> = {
  high:   'text-red-400',
  medium: 'text-amber-400',
  low:    'text-gray-400',
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

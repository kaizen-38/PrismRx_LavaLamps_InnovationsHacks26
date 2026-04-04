/**
 * Midnight Archive — motion preset library.
 * Import these variants instead of defining inline per component.
 */

import type { Variants, Transition } from 'framer-motion'

// ── Timing presets ─────────────────────────────────────────────────────────

export const timings = {
  ui:      { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
  smooth:  { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
  reveal:  { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  slow:    { duration: 0.8,  ease: [0.16, 1, 0.3, 1] },
  ambient: { duration: 6.0, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' as const },
} satisfies Record<string, Transition>

// ── Single variants ────────────────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: timings.smooth },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: timings.smooth },
}

export const clipReveal: Variants = {
  hidden: { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
  show:   { clipPath: 'inset(0 0% 0 0)',   opacity: 1, transition: timings.reveal },
}

export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   { opacity: 1, scale: 1, transition: timings.smooth },
}

// ── Stagger containers ─────────────────────────────────────────────────────

export const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1,  delayChildren: 0.05 } },
}

export const staggerFast: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.0  } },
}

export const staggerSlow: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.15, delayChildren: 0.1  } },
}

// ── Hover states ───────────────────────────────────────────────────────────

export const hoverLift = {
  whileHover: { y: -4, transition: timings.ui },
  whileTap:   { y: -2, scale: 0.99, transition: timings.ui },
}

export const hoverGlow = {
  whileHover: { scale: 1.02, transition: timings.ui },
}

// ── Section entry ──────────────────────────────────────────────────────────

export const sectionEntry = {
  initial:   'hidden',
  whileInView: 'show',
  viewport:  { once: true, amount: 0.2 },
}

// ── Drawer slide ───────────────────────────────────────────────────────────

export const drawerSlide: Variants = {
  hidden: { x: '100%', opacity: 0 },
  show:   { x: 0, opacity: 1, transition: { ...timings.reveal } },
  exit:   { x: '100%', opacity: 0, transition: timings.ui },
}

// ── Collapse accordion ─────────────────────────────────────────────────────

export const collapse: Variants = {
  hidden: { height: 0, opacity: 0 },
  show:   { height: 'auto', opacity: 1, transition: timings.smooth },
  exit:   { height: 0, opacity: 0, transition: timings.ui },
}

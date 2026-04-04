/**
 * PrismRx motion presets — Paperlight Archive
 * Reference: apple.com calm confidence · gocommotion editorial timing
 * Principle: elegant, not flashy. scroll reveals meaning, not showoff.
 */
import type { Variants, Transition } from 'framer-motion'

// ── Easing curves ──────────────────────────────────────────────────────────
export const EASE_STANDARD: [number,number,number,number] = [0.22, 1, 0.36, 1]
export const EASE_SOFT:     [number,number,number,number] = [0.25, 0.1, 0.25, 1]
export const EASE_EXIT:     [number,number,number,number] = [0.4, 0, 1, 1]

// ── Spring tokens ──────────────────────────────────────────────────────────

export const spring = {
  /** Gentle reveal — section, card entrance */
  gentle: { type: 'spring', stiffness: 110, damping: 22, mass: 0.9 } as Transition,

  /** Card lift — product card hover trigger */
  card:   { type: 'spring', stiffness: 160, damping: 20, mass: 0.75 } as Transition,

  /** Hover — button, pill, nav item */
  hover:  { type: 'spring', stiffness: 220, damping: 18, mass: 0.6 } as Transition,

  /** Modal / drawer slide */
  modal:  { type: 'spring', stiffness: 140, damping: 22, mass: 0.9 } as Transition,

  /** Parallax layer — slow, smooth */
  parallax: { type: 'spring', stiffness: 60, damping: 20, mass: 1.5 } as Transition,
}

// ── Animation timing ───────────────────────────────────────────────────────
export const DURATION = {
  section:   0.7,
  card:      0.45,
  nav:       0.35,
  hero_stagger: 0.08,
  parallax:  0.9,
}

// ── Entrance variants ──────────────────────────────────────────────────────

/** Standard scroll reveal: fade + 28px rise + optional blur */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  show:   {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: DURATION.section, ease: EASE_STANDARD },
  },
}

/** Simple fade — for overlays, backgrounds */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: DURATION.card, ease: EASE_SOFT } },
}

/** Card entrance with subtle scale */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  show:   {
    opacity: 1, scale: 1, y: 0,
    transition: spring.card,
  },
}

/** Hero element slide from left */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  show:   { opacity: 1, x: 0, transition: { duration: DURATION.card, ease: EASE_STANDARD } },
}

// ── Stagger containers ─────────────────────────────────────────────────────

/** Hero stagger — 80ms between children (more editorial than fast) */
export const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: DURATION.hero_stagger, delayChildren: 0 } },
}

export const staggerFast: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.05, delayChildren: 0 } },
}

export const staggerSlow: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

// ── Scroll-triggered section entry ─────────────────────────────────────────

export const sectionEntry = {
  initial:     'hidden',
  whileInView: 'show',
  viewport:    { once: true, amount: 0.15 },
}

// ── Hover interactions ─────────────────────────────────────────────────────

/** Card hover: -4px / scale 1.01 / sharper shadow */
export const hoverLift = {
  whileHover: { y: -4, scale: 1.01, transition: spring.card },
  whileTap:   { y: -1, scale: 0.99, transition: spring.hover },
}

/** Button hover: -1px lift only */
export const hoverButton = {
  whileHover: { y: -1, transition: { duration: 0.16, ease: EASE_STANDARD } },
  whileTap:   { y: 0.5, scale: 0.99, transition: spring.hover },
}

/** Subtle grow — nav icons */
export const hoverGrow = {
  whileHover: { scale: 1.08, transition: spring.hover },
  whileTap:   { scale: 0.96, transition: spring.hover },
}

// ── Modal / drawer ─────────────────────────────────────────────────────────

export const drawerRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  show:   { x: 0, opacity: 1, transition: spring.modal },
  exit:   { x: '100%', opacity: 0, transition: { duration: 0.2, ease: EASE_EXIT } },
}

export const modalFade: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show:   { opacity: 1, scale: 1, transition: spring.modal },
  exit:   { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: EASE_EXIT } },
}

// ── Parallax max constraints (from spec) ───────────────────────────────────
export const PARALLAX = {
  maxDriftY: 96,      // desktop
  maxDriftYMobile: 40,
  maxRotateX: 4,      // deg
  maxRotateY: 6,      // deg
  maxScale:   1.04,
}

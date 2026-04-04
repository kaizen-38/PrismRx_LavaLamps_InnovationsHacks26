'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, description, children, className }: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 backdrop-blur-sm"
            style={{ background: 'rgba(15,23,42,0.35)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="sheet"
            ref={contentRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn('fixed right-0 top-0 z-50 h-full w-full max-w-[520px] flex flex-col', className)}
            style={{
              background: '#FFFFFF',
              borderLeft: '1px solid #E7EDF5',
              boxShadow: '-20px 0 60px rgba(15,23,42,0.10)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            <div
              className="flex-shrink-0 flex items-start justify-between gap-4 px-6 py-5"
              style={{ borderBottom: '1px solid #E7EDF5' }}
            >
              <div className="min-w-0">
                {title && (
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p style={{ marginTop: 4, fontSize: 13, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: '#94A3B8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F6FB'; (e.currentTarget as HTMLElement).style.color = '#334155' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

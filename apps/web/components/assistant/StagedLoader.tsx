'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import type { LoaderStage } from '@/lib/assistant-types'

interface Props {
  stages: LoaderStage[]
  onComplete: () => void
}

export function StagedLoader({ stages, onComplete }: Props) {
  const [currentStage, setCurrentStage] = useState(0)
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (stages.length === 0) { onComplete(); return }
    let stageIndex = 0

    function runStage(i: number) {
      if (i >= stages.length) { onComplete(); return }
      setCurrentStage(i)
      setTimeout(() => {
        setCompletedStages(prev => new Set([...prev, i]))
        runStage(i + 1)
      }, stages[i].durationMs)
    }

    runStage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Checking indexed policy data
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {stages.map((stage, i) => {
          const done = completedStages.has(i)
          const active = currentStage === i && !done
          const pending = i > currentStage

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: pending ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
            >
              <div style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Check style={{ width: 14, height: 14, color: '#0F766E' }} />
                  </motion.div>
                ) : active ? (
                  <Loader2 style={{ width: 14, height: 14, color: '#2B50FF', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--line-mid)' }} />
                )}
              </div>
              <span style={{
                fontSize: 13,
                color: done ? 'var(--ink-muted)' : active ? 'var(--ink-strong)' : 'var(--ink-faint)',
                fontWeight: active ? 500 : 400,
              }}>
                {stage.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '1.25rem', height: 3, background: 'var(--line-soft)', borderRadius: 9999, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: '#2B50FF', borderRadius: 9999 }}
          animate={{ width: `${Math.round(((completedStages.size) / Math.max(stages.length, 1)) * 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

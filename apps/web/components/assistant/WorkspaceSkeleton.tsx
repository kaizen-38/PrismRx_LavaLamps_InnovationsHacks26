'use client'

// Skeleton shimmer CSS is injected once here.
// Uses CSS animations that respect prefers-reduced-motion.

export function WorkspaceSkeleton() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .prism-skeleton {
            background: linear-gradient(90deg, #F3F6FB 25%, #E7EDF5 50%, #F3F6FB 75%);
            background-size: 800px 100%;
            animation: shimmer 1.4s ease-in-out infinite;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .prism-skeleton {
            background: #EEF3F8;
            animation: none;
          }
        }
        .prism-skeleton {
          border-radius: 8px;
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }} aria-busy="true" aria-label="Loading workspace">
        {/* Left pane skeleton */}
        <div style={{ width: 'clamp(320px, 42%, 520px)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line-soft)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          {/* Header skeleton */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="prism-skeleton" style={{ width: 28, height: 28, borderRadius: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="prism-skeleton" style={{ width: 120, height: 14 }} />
              <div className="prism-skeleton" style={{ width: 200, height: 11 }} />
            </div>
          </div>

          {/* Messages skeleton */}
          <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Assistant bubble skeleton */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className="prism-skeleton" style={{ width: '78%', height: 68, borderRadius: '14px 14px 14px 4px' }} />
            </div>
            {/* Quick actions skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="prism-skeleton" style={{ height: 52, borderRadius: 14 }} />
              ))}
            </div>
          </div>

          {/* Input skeleton */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--line-soft)' }}>
            <div className="prism-skeleton" style={{ height: 44, borderRadius: 14 }} />
          </div>
        </div>

        {/* Right pane skeleton */}
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="prism-skeleton" style={{ height: 180, borderRadius: 20 }} />
          <div className="prism-skeleton" style={{ height: 120, borderRadius: 16 }} />
          <div className="prism-skeleton" style={{ height: 80, borderRadius: 16 }} />
          <div className="prism-skeleton" style={{ height: 56, borderRadius: 12 }} />
        </div>
      </div>
    </>
  )
}

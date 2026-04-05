'use client'

import { usePathname } from 'next/navigation'
import NavBar from '@/components/nav-bar'

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return isLanding ? (
    <MarketingLayout>{children}</MarketingLayout>
  ) : (
    <WorkspaceLayout>{children}</WorkspaceLayout>
  )
}

function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <LayoutFrame variant="marketing">{children}</LayoutFrame>
}

function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <LayoutFrame variant="workspace">{children}</LayoutFrame>
}

function LayoutFrame({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: 'marketing' | 'workspace'
}) {
  return (
    <>
      <NavBar variant={variant} />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>© 2026 PrismRx · Innovation Hacks 2026 · Anton RX Track</span>
          <span className="site-footer__meta">Public documents only · Synthetic cases · No PHI</span>
        </div>
      </footer>
    </>
  )
}

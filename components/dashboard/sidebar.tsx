'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Menu, X, Wand2, CreditCard, Zap, MessageCircle, FolderOpen, Workflow } from 'lucide-react'
import { useTokens } from '@/lib/context/token-context'
import { BrandLogo } from '@/components/brand-logo'

const NAV_LINKS = [
  { href: '/studio', label: 'Studio', icon: Workflow },
  { href: '/dashboard', label: 'Advanced', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/templates', label: 'Templates', icon: Wand2 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/support', label: 'Support', icon: MessageCircle },
]

function TokenWidget({ collapsed }: { collapsed?: boolean }) {
  const { balance } = useTokens()

  if (balance === null) return null

  if (collapsed) {
    return (
      <Link
        href="/billing"
        title={`${balance.toLocaleString()} tokens`}
        className="flex items-center justify-center rounded-lg px-2 py-2 text-brand-text/40 hover:text-brand-text hover:bg-white/5 transition-all duration-150"
      >
        <Zap className="w-4 h-4 shrink-0 text-brand-accent" />
      </Link>
    )
  }

  return (
    <Link
      href="/billing"
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 border border-white/8 bg-white/[0.03] hover:border-brand-accent/30 hover:bg-brand-accent/5 transition-all duration-150 group"
    >
      <Zap className="w-3.5 h-3.5 text-brand-accent shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-brand-text/70 group-hover:text-brand-text transition-colors truncate">
          {balance.toLocaleString()} tokens
        </p>
        <p className="text-[10px] text-brand-text/30">remaining</p>
      </div>
    </Link>
  )
}

function NavLinks({ collapsed, onNav }: { collapsed?: boolean; onNav?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 flex-1">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
              collapsed ? 'justify-center px-2' : '',
              active
                ? 'bg-brand-accent/10 text-brand-accent font-medium'
                : 'text-brand-text/40 hover:text-brand-text hover:bg-white/5',
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-brand-accent' : 'text-brand-text/40')} />
            {!collapsed && label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-brand-bg border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo size={28} />
          <span className="font-black text-sm uppercase tracking-widest text-brand-text">GENETRIFY</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-brand-text/50 hover:text-brand-text transition-colors p-2.5 -mr-1"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-56 bg-brand-bg border-r border-white/5 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandLogo size={28} />
            <span className="font-black text-sm uppercase tracking-widest text-brand-text">GENETRIFY</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="text-brand-text/50 hover:text-brand-text transition-colors p-2.5 -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col h-[calc(100%-3.5rem)] px-3 py-5 gap-1">
          <NavLinks onNav={() => setMobileOpen(false)} />
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm text-brand-text/40 hover:text-brand-text hover:bg-white/5 transition-all duration-150"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-white/5 bg-brand-bg transition-all duration-200 h-screen sticky top-0',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn('flex items-center h-14 border-b border-white/5 px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5 group">
              <BrandLogo size={28} />
              <span className="font-black text-sm uppercase tracking-widest text-brand-text">GENETRIFY</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-brand-text/40 hover:text-brand-text transition-colors p-1 rounded-md hover:bg-white/5"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <div className="flex flex-col flex-1 px-2 py-4 gap-1">
          <NavLinks collapsed={collapsed} />

          <div className="mt-auto mb-1">
            <TokenWidget collapsed={collapsed} />
          </div>

          {/* Sign out */}
          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? 'Sign out' : undefined}
              className={cn(
                'flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm text-brand-text/40 hover:text-brand-text hover:bg-white/5 transition-all duration-150',
                collapsed ? 'justify-center px-2' : '',
              )}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && 'Sign out'}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}

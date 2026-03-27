'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { Video, Home, User, LogOut } from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Studio', icon: Home },
  { href: '/profile', label: 'Settings', icon: User },
]

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full px-3 py-5 gap-1">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-2 py-2 mb-3 group">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0">
          <Video className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight text-white">Affilify</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNav}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
                active
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-violet-400' : 'text-white/40')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </form>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-[#0a0814] border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 font-bold text-base text-white">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
            <Video className="w-3 h-3 text-white" />
          </div>
          Affilify
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-white/50 hover:text-white transition-colors p-1"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-56 bg-[#0a0814] border-r border-white/5 transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-end px-4 h-14 border-b border-white/5">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="3" x2="15" y2="15" />
              <line x1="15" y1="3" x2="3" y2="15" />
            </svg>
          </button>
        </div>
        <SidebarContent onNav={() => setOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/5 bg-[#0a0814]">
        <SidebarContent />
      </aside>
    </>
  )
}

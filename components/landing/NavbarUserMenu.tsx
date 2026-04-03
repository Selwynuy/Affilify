'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

interface Props {
  email: string
}

export function NavbarUserMenu({ email }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent text-xs font-bold select-none">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-brand-bg/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/[0.07]">
            <p className="text-xs text-brand-text/40 truncate">{email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-text/60 hover:text-brand-text hover:bg-white/5 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/templates"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-text/60 hover:text-brand-text hover:bg-white/5 transition-colors"
            >
              Marketplace
            </Link>
          </div>
          <div className="border-t border-white/[0.07] py-1">
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand-text/40 hover:text-brand-text hover:bg-white/5 transition-colors text-left"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function NavbarGuestButtons() {
  return (
    <>
      <Link
        href="/login"
        className="hidden md:inline-flex text-[13px] text-white/70 hover:text-white transition-colors px-3 py-1.5"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center gap-1.5 bg-brand-accent hover:bg-brand-accent-hover text-[#120f1c] text-[13px] font-bold px-4 py-1.5 rounded-full transition-all duration-200 shadow-lg shadow-brand-accent/25"
      >
        Get started
      </Link>
    </>
  )
}

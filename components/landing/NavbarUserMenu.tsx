'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { ChevronRight } from 'lucide-react'

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
        className="flex items-center gap-2 rounded-full focus:outline-none"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-semibold select-none">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0f0d1a]/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-zinc-500 truncate">{email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Profile
            </Link>
          </div>
          <div className="border-t border-white/10 py-1">
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-left"
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
        className="hidden md:inline-flex text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200"
      >
        Get started
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </>
  )
}

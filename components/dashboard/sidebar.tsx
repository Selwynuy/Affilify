'use client'

import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 px-4 py-6 gap-2">
      <p className="text-white font-semibold text-lg px-2 mb-2">Affilify</p>
      <Separator className="bg-zinc-800 mb-2" />
      <nav className="flex flex-col gap-1 flex-1">
        <Link
          href="/dashboard"
          className="rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/profile"
          className="rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          Profile
        </Link>
      </nav>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/60"
        >
          Sign out
        </Button>
      </form>
    </aside>
  )
}

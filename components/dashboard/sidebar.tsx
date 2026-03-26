'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/generate', label: 'Generate Images' },
  { href: '/dashboard/select', label: 'Select Images' },
  { href: '/dashboard/export', label: 'Export Video' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 px-4 py-6 gap-2">
      <p className="text-white font-semibold text-lg px-2 mb-2">Affilify</p>
      <Separator className="bg-zinc-800 mb-2" />
      <nav className="flex flex-col gap-1 flex-1">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-2 py-1.5 text-sm transition-colors',
              pathname === href
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            )}
          >
            {label}
          </Link>
        ))}
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

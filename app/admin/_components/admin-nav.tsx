'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Layers, MessageCircle, Users, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  overview: LayoutDashboard,
  templates: Layers,
  tickets: MessageCircle,
  users: Users,
  waitlist: Mail,
} as const

export interface AdminNavItem {
  href: string
  label: string
  icon: keyof typeof ICONS
}

export default function AdminNav({
  items,
  mobile = false,
}: {
  items: AdminNavItem[]
  mobile?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className={cn(
      mobile ? 'flex gap-2 overflow-x-auto pb-1' : 'flex flex-col gap-0.5',
    )}>
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon]
        const active = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`))

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg transition-all duration-150',
              mobile
                ? 'shrink-0 px-3 py-2 text-sm'
                : 'px-2.5 py-2 text-sm',
              active
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-violet-300' : 'text-white/40')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

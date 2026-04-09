import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { verifyAdmin } from '@/lib/admin/auth'
import { BrandLogo } from '@/components/brand-logo'
import AdminNav from './_components/admin-nav'
import type { AdminNavItem } from './_components/admin-nav'

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', icon: 'overview' },
  { href: '/admin/templates', label: 'Templates', icon: 'templates' },
  { href: '/admin/tickets', label: 'Tickets', icon: 'tickets' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await verifyAdmin()
  if (!user) redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-[#0f0d1a]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/5 bg-[#0a0814] lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-white/5 px-4">
          <BrandLogo size={28} />
          <div>
            <span className="text-sm font-bold text-white">Genetrify</span>
            <span className="-mt-0.5 block text-[10px] font-medium text-violet-400">Admin</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-2 py-4">
          <AdminNav items={ADMIN_NAV} />

          <div className="mt-auto">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/40 transition-all duration-150 hover:bg-white/5 hover:text-white"
            >
              {'<-'} User dashboard
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/40 transition-all duration-150 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10">
        <div className="mb-6 space-y-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={24} />
            <div>
              <span className="text-sm font-bold text-white">Genetrify</span>
              <span className="-mt-0.5 block text-[10px] font-medium text-violet-400">Admin</span>
            </div>
          </div>
          <AdminNav items={ADMIN_NAV} mobile />
        </div>

        {children}
      </main>
    </div>
  )
}

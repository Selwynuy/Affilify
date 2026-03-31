import { redirect } from 'next/navigation'
import { verifyAdmin } from '@/lib/admin/auth'
import Link from 'next/link'
import { Video, LayoutDashboard, MessageCircle, Users, LogOut, Layers } from 'lucide-react'
import { logout } from '@/app/actions/auth'

const ADMIN_NAV = [
  { href: '/admin',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/admin/templates', label: 'Templates',  icon: Layers          },
  { href: '/admin/tickets',   label: 'Tickets',    icon: MessageCircle   },
  { href: '/admin/users',     label: 'Users',      icon: Users           },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await verifyAdmin()
  if (!user) redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-[#0f0d1a]">
      {/* Admin sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/5 bg-[#0a0814]">
        <div className="flex items-center gap-2.5 h-14 border-b border-white/5 px-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Genetrify</span>
            <span className="block text-[10px] text-violet-400 font-medium -mt-0.5">Admin</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 px-2 py-4">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all duration-150"
            >
              <Icon className="w-4 h-4 shrink-0 text-white/40" />
              {label}
            </Link>
          ))}

          <div className="mt-auto">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all duration-150"
            >
              ← User dashboard
            </Link>
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
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10">
        {children}
      </main>
    </div>
  )
}

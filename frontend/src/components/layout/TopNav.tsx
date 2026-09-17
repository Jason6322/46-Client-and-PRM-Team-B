'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * Primary CRM navigation — the dark bar from the approved prototype.
 *
 * Replaces the boilerplate Sidebar + Navbar pair: the wireframes put every
 * section in one horizontal bar with no sidebar.
 */

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/organisations', label: 'Organisations' },
  { href: '/relationships', label: 'Relationships' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/opportunities', label: 'Opportunities' },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/auth/signin')
    router.refresh()
  }

  return (
    <header className="bg-nav">
      <div className="flex h-16 items-center gap-8 px-6">
        <Link href="/dashboard" className="text-base font-bold text-white">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'FSC CRM'}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-sm transition-colors',
                  active ? 'font-semibold text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <User className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

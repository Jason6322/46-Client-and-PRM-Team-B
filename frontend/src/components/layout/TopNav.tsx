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

/** "Tommy Ngo" → "TN". Returns null when there is no name to work from. */
function initialsFrom(name: string | null | undefined) {
  if (!name) return null
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
  return letters ? letters.toUpperCase() : null
}

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, user, profile } = useAuth()

  const displayName = profile?.displayName ?? user?.email ?? 'Account'
  const initials = initialsFrom(profile?.displayName)
  // UserProfile.role is the permission role ('user'), not a job title — the
  // prototype's "UX Designer" needs a jobTitle field that the schema lacks.
  const roleLabel = profile?.role === 'user' ? 'Team member' : (profile?.role ?? '')

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
            className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/10"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white"
            >
              {initials ?? <User className="h-4 w-4 text-zinc-400" />}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-white">{displayName}</span>
              <span className="block text-xs text-zinc-400">{roleLabel}</span>
            </span>
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

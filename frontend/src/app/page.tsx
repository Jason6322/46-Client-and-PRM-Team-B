import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Client and partner relationship management for the Food Systems Collective.',
}

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'App'}
        </h1>
        <p className="max-w-md text-lg text-zinc-600">
          Track organisations, contacts and partnership opportunities for the Food Systems
          Collective.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center rounded-md bg-black px-6 py-2.5 text-sm font-medium text-white shadow transition-colors hover:bg-zinc-800"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-zinc-50"
        >
          Create account
        </Link>
      </div>
    </main>
  )
}

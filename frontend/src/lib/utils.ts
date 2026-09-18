import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDatetime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Short relative time, as the prototype's "Last Activity" column shows it:
 * "just now", "2h ago", "5d ago", then an absolute date beyond a year.
 */
export function formatRelativeTime(date: Date | string | number): string {
  const then = new Date(date).getTime()
  const seconds = Math.floor((Date.now() - then) / 1000)

  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 60) return 'just now'

  const units: [limit: number, seconds: number, suffix: string][] = [
    [3600, 60, 'm'],
    [86400, 3600, 'h'],
    [2592000, 86400, 'd'],
    [31536000, 604800, 'w'],
  ]

  for (const [limit, divisor, suffix] of units) {
    if (seconds < limit) return `${Math.floor(seconds / divisor)}${suffix} ago`
  }

  return formatDate(new Date(then))
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}…` : str
}

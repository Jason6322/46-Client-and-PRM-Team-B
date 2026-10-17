'use client'

import { useState, useSyncExternalStore } from 'react'

/** The rows-per-page choices every list offers. */
export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 20

const STORAGE_PREFIX = 'pageSize:'
/** localStorage's own event fires only in other tabs; this one tells this tab. */
const CHANGE_EVENT = 'page-size-change'

function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value)
}

function readPageSize(key: string): PageSize {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_PREFIX + key))
    return isPageSize(stored) ? stored : DEFAULT_PAGE_SIZE
  } catch {
    // Storage blocked (private window, site data disabled): use the default.
    return DEFAULT_PAGE_SIZE
  }
}

function writePageSize(key: string, size: PageSize) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, String(size))
  } catch {
    // Not remembered, but the choice still applies for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/**
 * Client-side pagination of a list that is already in memory. Every list in
 * the CRM is fetched once (and cached) on the server, so changing page or page
 * size costs no Firestore reads.
 *
 * The page size is remembered per list (`storageKey`) in this browser. The
 * page goes back to 1 whenever the number of items changes — a new search or
 * filter — so it never points past the end of the list.
 */
export function usePagination<T>(items: readonly T[], storageKey: string) {
  const pageSize = useSyncExternalStore(
    subscribe,
    () => readPageSize(storageKey),
    () => DEFAULT_PAGE_SIZE
  )
  const [page, setPage] = useState(1)
  const [itemCount, setItemCount] = useState(items.length)

  // Adjusting state during render when an input changes, as React recommends
  // over an effect: the reset lands in the same render.
  if (itemCount !== items.length) {
    setItemCount(items.length)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize

  return {
    page: current,
    pageCount,
    pageSize,
    total: items.length,
    /** 1-based positions of the first and last item shown. */
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    pageItems: items.slice(start, start + pageSize),
    setPage: (next: number) => setPage(Math.min(Math.max(1, next), pageCount)),
    setPageSize: (size: PageSize) => {
      writePageSize(storageKey, size)
      setPage(1)
    },
  }
}

export type PaginationState = Omit<ReturnType<typeof usePagination>, 'pageItems'>

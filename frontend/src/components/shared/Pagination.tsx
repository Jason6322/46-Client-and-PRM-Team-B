'use client'

import { Children, useId, useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PAGE_SIZES,
  usePagination,
  type PageSize,
  type PaginationState,
} from '@/hooks/usePagination'
import { cn } from '@/lib/utils'

interface PaginationProps {
  pagination: PaginationState
  /** Plural noun for the count, e.g. "organisations". */
  label: string
  className?: string
}

const buttonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * "Showing 21–40 of 87 organisations", a rows-per-page picker (10 / 20 / 50)
 * and previous/next buttons. Pair with usePagination. The controls are hidden
 * while the whole list fits on the smallest page, leaving just the count.
 */
export function Pagination({ pagination, label, className }: PaginationProps) {
  const { page, pageCount, pageSize, total, from, to, setPage, setPageSize } = pagination
  const selectId = useId()
  const root = useRef<HTMLDivElement>(null)

  if (total === 0) return null
  if (total <= PAGE_SIZES[0]) {
    return (
      <p className={cn('text-sm text-zinc-500', className)}>
        Showing {total} {label}
      </p>
    )
  }

  /** Bring the top of the list back into view when its rows change. */
  const goTo = (next: number) => {
    setPage(next)
    const list = root.current?.parentElement
    if (list && list.getBoundingClientRect().top < 0) {
      list.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  return (
    <div
      ref={root}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500',
        className
      )}
    >
      <p aria-live="polite">
        Showing {from}–{to} of {total} {label}
      </p>

      <div className="flex items-center gap-4">
        <label htmlFor={selectId} className="flex items-center gap-2">
          Rows per page
          <select
            id={selectId}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value) as PageSize)}
            className="focus:border-brand-500 focus:ring-brand-500/30 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 focus:ring-2 focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            className={buttonClass}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-20 text-center whitespace-nowrap">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page === pageCount}
            aria-label="Next page"
            className={buttonClass}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface PaginatedListProps {
  /** The rendered items, one child each (typically `<li>`s). */
  children: ReactNode
  /** Remembers the page size for this list. */
  storageKey: string
  label: string
  /** Classes for the `<ul>` that holds the current page. */
  className?: string
  /** Classes for the pagination bar. */
  paginationClassName?: string
}

/**
 * A `<ul>` that shows one page of its children, for lists rendered by a Server
 * Component (the dashboard's "See all" pages): the server renders every item
 * once, and paging only changes which are shown.
 */
export function PaginatedList({
  children,
  storageKey,
  label,
  className,
  paginationClassName,
}: PaginatedListProps) {
  const { pageItems, ...pagination } = usePagination(Children.toArray(children), storageKey)

  return (
    <div>
      <ul className={className}>{pageItems}</ul>
      <Pagination pagination={pagination} label={label} className={paginationClassName} />
    </div>
  )
}

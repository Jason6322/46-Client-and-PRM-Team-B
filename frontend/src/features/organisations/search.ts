/**
 * The Search & Filter page's filters, kept out of the Client Component so the
 * server page can read them from the query string.
 */

export type SearchFilters = {
  q: string
  industry: string
  country: string
  status: string
  stage: string
  tag: string
  type: string
}

export const EMPTY_FILTERS: SearchFilters = {
  q: '',
  industry: '',
  country: '',
  status: '',
  stage: '',
  tag: '',
  type: '',
}

/** Filters from a page's searchParams; anything missing or repeated is empty. */
export function filtersFromParams(
  params: Record<string, string | string[] | undefined>
): SearchFilters {
  const read = (key: keyof SearchFilters) => {
    const value = params[key]
    return typeof value === 'string' ? value : ''
  }
  return {
    q: read('q'),
    industry: read('industry'),
    country: read('country'),
    status: read('status'),
    stage: read('stage'),
    tag: read('tag'),
    type: read('type'),
  }
}

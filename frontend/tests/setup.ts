import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase client SDK — never call real Firebase in unit tests
vi.mock('@/lib/firebase/client', () => ({
  auth: { currentUser: null, onAuthStateChanged: vi.fn() },
  db: {},
  app: {},
}))

// Pass-through cache, so action tests exercise the real reads every call.
// tests/unit/lib/cache.test.ts unmocks it to test the wrapper itself.
vi.mock('@/lib/cache', () => ({
  CACHE_TAGS: {
    organisations: 'organisations',
    activityFeed: 'activity-feed',
    opportunities: 'opportunities',
    users: 'users',
  },
  activitiesTag: (organisationId: string) => `activities:${organisationId}`,
  CACHE_SECONDS: 300,
  cached: <T extends (...args: never[]) => unknown>(read: T) => read,
  invalidate: vi.fn(),
}))

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: vi.fn(),
    createSessionCookie: vi.fn(),
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    listCollections: vi.fn().mockResolvedValue([]),
  },
}))

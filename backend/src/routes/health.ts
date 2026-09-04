import { Router, type Router as ExpressRouter } from 'express'
import { adminDb } from '../lib/firebase'

const router: ExpressRouter = Router()

/**
 * GET /api/health
 * Returns service health status, including a live Firestore connectivity check. No auth required.
 */
router.get('/', async (_req, res) => {
  try {
    await adminDb.listCollections()
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    })
  } catch {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    })
  }
})

export { router as healthRouter }

import { Router, type Router as ExpressRouter } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth'

const router: ExpressRouter = Router()

/**
 * GET /api/me
 * Returns the authenticated caller's identity.
 *
 * Mounted under the /api auth middleware, so reaching this handler at all
 * means the Firebase ID token was present and valid.
 */
router.get('/', (req, res) => {
  const { user } = req as AuthenticatedRequest
  res.json({
    uid: user.uid,
    email: user.email ?? null,
  })
})

export { router as meRouter }

import { Router, type Router as ExpressRouter } from 'express'
import { meRouter } from './me'
import { healthRouter } from './health'

const router: ExpressRouter = Router()

// Mount routes here. Use the /add-route skill to scaffold new routes.
router.use('/me', meRouter)
router.use('/health', healthRouter)

export { router as apiRouter }

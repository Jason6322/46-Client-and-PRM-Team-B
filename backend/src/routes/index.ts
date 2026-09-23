import { Router, type Router as ExpressRouter } from 'express'
import { meRouter } from './me'
import { healthRouter } from './health'
import { organisationsRouter } from './organisations'

const router: ExpressRouter = Router()

// Mount routes here. Use the /add-route skill to scaffold new routes.
router.use('/me', meRouter)
router.use('/health', healthRouter)
router.use('/organisations', organisationsRouter)

export { router as apiRouter }

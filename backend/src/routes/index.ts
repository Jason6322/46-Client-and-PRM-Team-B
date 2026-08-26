import { Router, type Router as ExpressRouter } from 'express'
import { meRouter } from './me'

const router: ExpressRouter = Router()

// Mount routes here. Use the /add-route skill to scaffold new routes.
router.use('/me', meRouter)

export { router as apiRouter }

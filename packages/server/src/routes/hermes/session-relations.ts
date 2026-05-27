import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/session-relations'

export const sessionRelationRoutes = new Router()

// Session relations CRUD
sessionRelationRoutes.get('/api/hermes/sessions/:id/relations', ctrl.listRelations)
sessionRelationRoutes.get('/api/hermes/sessions/:id/continuation-chain', ctrl.chain)
sessionRelationRoutes.post('/api/hermes/sessions/:id/relations', ctrl.create)
sessionRelationRoutes.delete('/api/hermes/relations/:id', ctrl.remove)
sessionRelationRoutes.delete('/api/hermes/sessions/:fromId/relations/:toId', ctrl.removeBetween)

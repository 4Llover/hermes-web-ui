import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/tags'

export const tagRoutes = new Router()

// Tags CRUD
tagRoutes.get('/api/hermes/tags', ctrl.list)
tagRoutes.post('/api/hermes/tags', ctrl.create)
tagRoutes.put('/api/hermes/tags/:id', ctrl.update)
tagRoutes.delete('/api/hermes/tags/:id', ctrl.remove)

// Session-tag operations
tagRoutes.get('/api/hermes/sessions/:id/tags', ctrl.getForSession)
tagRoutes.post('/api/hermes/sessions/:id/tags', ctrl.addToSession)
tagRoutes.post('/api/hermes/sessions/:id/tags/set', ctrl.setForSession)
tagRoutes.delete('/api/hermes/sessions/:id/tags/:tagId', ctrl.removeFromSession)

// Archive
tagRoutes.post('/api/hermes/sessions/:id/archive', ctrl.archive)
tagRoutes.post('/api/hermes/sessions/:id/unarchive', ctrl.unarchive)

// Recycle Bin
tagRoutes.post('/api/hermes/sessions/:id/trash', ctrl.trash)
tagRoutes.post('/api/hermes/sessions/:id/restore', ctrl.restore)
tagRoutes.get('/api/hermes/trash', ctrl.listTrash)
tagRoutes.post('/api/hermes/trash/purge', ctrl.purge)

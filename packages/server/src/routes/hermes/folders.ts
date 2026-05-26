import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/folders'

export const folderRoutes = new Router()

// Folder CRUD
folderRoutes.get('/api/hermes/folders', ctrl.list)
folderRoutes.post('/api/hermes/folders', ctrl.create)
folderRoutes.put('/api/hermes/folders/:id', ctrl.update)
folderRoutes.delete('/api/hermes/folders/:id', ctrl.remove)
folderRoutes.post('/api/hermes/folders/reorder', ctrl.reorder)
folderRoutes.post('/api/hermes/folders/migrate', ctrl.migrate)

// Session-folder operations (extend session management)
folderRoutes.post('/api/hermes/sessions/:id/folder', ctrl.moveToFolder)
folderRoutes.post('/api/hermes/sessions/:id/pin', ctrl.pin)
folderRoutes.post('/api/hermes/sessions/batch-move', ctrl.batchMove)
folderRoutes.post('/api/hermes/sessions/reorder', ctrl.sessionReorder)

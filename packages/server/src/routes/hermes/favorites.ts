import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/favorites'

export const favoriteRoutes = new Router()

// Favorites CRUD
favoriteRoutes.get('/api/hermes/favorites', ctrl.list)
favoriteRoutes.get('/api/hermes/favorites/:id', ctrl.get)
favoriteRoutes.post('/api/hermes/favorites', ctrl.create)
favoriteRoutes.put('/api/hermes/favorites/:id', ctrl.update_)
favoriteRoutes.delete('/api/hermes/favorites/:id', ctrl.remove)

// Check if a message is favorited
favoriteRoutes.get('/api/hermes/favorites/check/:messageId', ctrl.check)

// Batch check multiple message IDs
favoriteRoutes.post('/api/hermes/favorites/batch-check', ctrl.batchCheck)

// Delete by message_id (for unstar from message action bar)
favoriteRoutes.delete('/api/hermes/favorites/by-message/:messageId', ctrl.removeByMessageId)

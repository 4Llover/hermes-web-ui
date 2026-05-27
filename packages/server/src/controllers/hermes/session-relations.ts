/**
 * Session Relations controller — 关联会话 HTTP 接口
 */
import {
  createRelation,
  getOutgoingRelations,
  getIncomingRelations,
  getAllRelations,
  getContinuationChain,
  deleteRelation,
  deleteRelationBetween,
} from '../../db/hermes/session-relations-store'

// GET /api/hermes/sessions/:id/relations
export async function listRelations(ctx: any) {
  const { id } = ctx.params
  const { direction } = ctx.query  // 'outgoing' | 'incoming' | 'all' (default)

  let relations
  if (direction === 'outgoing') {
    relations = getOutgoingRelations(id)
  } else if (direction === 'incoming') {
    relations = getIncomingRelations(id)
  } else {
    relations = getAllRelations(id)
  }

  ctx.body = relations
}

// GET /api/hermes/sessions/:id/continuation-chain
export async function chain(ctx: any) {
  const { id } = ctx.params
  const chainResult = getContinuationChain(id)
  ctx.body = chainResult
}

// POST /api/hermes/sessions/:id/relations
export async function create(ctx: any) {
  const { id } = ctx.params
  const { to_session_id, relation_type, note } = ctx.request.body || {}

  if (!to_session_id || typeof to_session_id !== 'string') {
    ctx.status = 400
    ctx.body = { error: 'to_session_id is required' }
    return
  }

  if (id === to_session_id) {
    ctx.status = 400
    ctx.body = { error: 'Cannot create self-relation' }
    return
  }

  const validTypes = ['continuation', 'related', 'fork']
  const type = validTypes.includes(relation_type) ? relation_type : 'continuation'

  const relation = createRelation(id, to_session_id, type, note)
  if (!relation) {
    ctx.status = 409
    ctx.body = { error: 'Relation already exists or invalid' }
    return
  }

  ctx.status = 201
  ctx.body = relation
}

// DELETE /api/hermes/relations/:id
export async function remove(ctx: any) {
  const { id } = ctx.params
  const success = deleteRelation(id)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Relation not found' }
    return
  }
  ctx.body = { success: true }
}

// DELETE /api/hermes/sessions/:fromId/relations/:toId
export async function removeBetween(ctx: any) {
  const { fromId, toId } = ctx.params
  const success = deleteRelationBetween(fromId, toId)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Relation not found' }
    return
  }
  ctx.body = { success: true }
}

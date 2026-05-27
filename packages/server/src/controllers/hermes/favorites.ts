/**
 * Favorites controller — message bookmarking system.
 */
import { randomUUID } from 'crypto'
import {
  listFavorites,
  getFavorite,
  getFavoriteByMessageId,
  createFavorite,
  updateFavorite,
  deleteFavorite,
  deleteFavoriteByMessageId,
  isFavorited,
  getFavoritedMessageIds,
} from '../../db/hermes/favorite-store'

export async function list(ctx: any) {
  const { limit, offset, search, session_id } = ctx.query
  ctx.body = listFavorites({
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
    search: search || undefined,
    session_id: session_id || undefined,
  })
}

export async function get(ctx: any) {
  const { id } = ctx.params
  const fav = getFavorite(id)
  if (!fav) {
    ctx.status = 404
    ctx.body = { error: 'Favorite not found' }
    return
  }
  ctx.body = fav
}

export async function check(ctx: any) {
  const { messageId } = ctx.params
  ctx.body = { favorited: isFavorited(messageId) }
}

export async function batchCheck(ctx: any) {
  const { messageIds } = ctx.request.body || {}
  if (!Array.isArray(messageIds)) {
    ctx.status = 400
    ctx.body = { error: 'messageIds array is required' }
    return
  }
  const set = getFavoritedMessageIds(messageIds)
  ctx.body = { favoritedIds: [...set] }
}

export async function create(ctx: any) {
  const { message_id, session_id, content, role, title, note, tags, source_session_title } = ctx.request.body || {}

  if (!message_id || !session_id || content === undefined) {
    ctx.status = 400
    ctx.body = { error: 'message_id, session_id, and content are required' }
    return
  }

  // Check duplicate
  const existing = getFavoriteByMessageId(message_id)
  if (existing) {
    ctx.status = 409
    ctx.body = { error: 'Already favorited', favorite: existing }
    return
  }

  const fav = createFavorite({
    id: randomUUID(),
    message_id: String(message_id),
    session_id,
    content,
    role,
    title,
    note,
    tags,
    source_session_title,
  })

  ctx.status = 201
  ctx.body = fav
}

export async function update_(ctx: any) {
  const { id } = ctx.params
  const { title, note, tags } = ctx.request.body || {}

  const success = updateFavorite(id, { title, note, tags })
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Favorite not found' }
    return
  }
  ctx.body = { success: true }
}

export async function remove(ctx: any) {
  const { id } = ctx.params
  const success = deleteFavorite(id)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Favorite not found' }
    return
  }
  ctx.body = { success: true }
}

export async function removeByMessageId(ctx: any) {
  const { messageId } = ctx.params
  const success = deleteFavoriteByMessageId(messageId)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Favorite not found for this message' }
    return
  }
  ctx.body = { success: true }
}

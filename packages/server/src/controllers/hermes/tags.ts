/**
 * Tags controller — session labeling system.
 */
import { randomUUID } from 'crypto'
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  getSessionTags,
  addTagToSession,
  removeTagFromSession,
  setSessionTags,
} from '../../db/hermes/tag-store'
import {
  archiveSession,
  unarchiveSession,
  softDeleteSession,
  restoreSession,
  listDeletedSessions,
  purgeDeletedSessions,
} from '../../db/hermes/folder-store'

// === Tags ===

export async function list(ctx: any) {
  ctx.body = listTags()
}

export async function create(ctx: any) {
  const { name, color } = ctx.request.body || {}
  if (!name || typeof name !== 'string' || !name.trim()) {
    ctx.status = 400
    ctx.body = { error: 'Tag name is required' }
    return
  }
  const tag = createTag({ id: randomUUID(), name: name.trim(), color: color || null })
  ctx.status = 201
  ctx.body = tag
}

export async function update(ctx: any) {
  const { id } = ctx.params
  const { name, color } = ctx.request.body || {}
  const success = updateTag(id, { name, color })
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Tag not found' }
    return
  }
  ctx.body = { success: true }
}

export async function remove(ctx: any) {
  const { id } = ctx.params
  const success = deleteTag(id)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Tag not found' }
    return
  }
  ctx.body = { success: true }
}

export async function getForSession(ctx: any) {
  const { id } = ctx.params
  ctx.body = getSessionTags(id)
}

export async function addToSession(ctx: any) {
  const { id } = ctx.params
  const { tag_id } = ctx.request.body || {}
  if (!tag_id) {
    ctx.status = 400
    ctx.body = { error: 'tag_id is required' }
    return
  }
  addTagToSession(id, tag_id)
  ctx.body = { success: true }
}

export async function removeFromSession(ctx: any) {
  const { id, tagId } = ctx.params
  removeTagFromSession(id, tagId)
  ctx.body = { success: true }
}

export async function setForSession(ctx: any) {
  const { id } = ctx.params
  const { tag_ids } = ctx.request.body || {}
  if (!Array.isArray(tag_ids)) {
    ctx.status = 400
    ctx.body = { error: 'tag_ids array is required' }
    return
  }
  setSessionTags(id, tag_ids)
  ctx.body = { success: true }
}

// === Archive ===

export async function archive(ctx: any) {
  const { id } = ctx.params
  archiveSession(id)
  ctx.body = { success: true, archived: true }
}

export async function unarchive(ctx: any) {
  const { id } = ctx.params
  unarchiveSession(id)
  ctx.body = { success: true, archived: false }
}

// === Recycle Bin ===

export async function trash(ctx: any) {
  const { id } = ctx.params
  softDeleteSession(id)
  ctx.body = { success: true }
}

export async function restore(ctx: any) {
  const { id } = ctx.params
  restoreSession(id)
  ctx.body = { success: true }
}

export async function listTrash(ctx: any) {
  ctx.body = listDeletedSessions()
}

export async function purge(ctx: any) {
  const { days } = ctx.request.body || {}
  const purged = purgeDeletedSessions(days || 30)
  ctx.body = { success: true, purged }
}

/**
 * Folders controller — handles HTTP requests for session folder management.
 */
import { randomUUID } from 'crypto'
import {
  listFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  moveSessionToFolder,
  batchMoveSessionsToFolder,
  toggleSessionPinned,
  setSessionPinned,
  reorderSessions,
  migrateWorkspaceToFolders,
} from '../../db/hermes/folder-store'

// GET /api/hermes/folders
export async function list(ctx: any) {
  const folders = listFolders()
  ctx.body = folders
}

// POST /api/hermes/folders
export async function create(ctx: any) {
  const { name, color } = ctx.request.body || {}
  if (!name || typeof name !== 'string' || !name.trim()) {
    ctx.status = 400
    ctx.body = { error: 'Folder name is required' }
    return
  }

  const folder = createFolder({
    id: randomUUID(),
    name: name.trim(),
    color: color || null,
  })
  ctx.status = 201
  ctx.body = folder
}

// PUT /api/hermes/folders/:id
export async function update(ctx: any) {
  const { id } = ctx.params
  const { name, color, sort_order } = ctx.request.body || {}

  const existing = getFolder(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { error: 'Folder not found' }
    return
  }

  const data: any = {}
  if (name !== undefined) data.name = String(name).trim() || existing.name
  if (color !== undefined) data.color = color
  if (sort_order !== undefined) data.sort_order = Number(sort_order)

  updateFolder(id, data)
  ctx.body = { ...existing, ...data, updated_at: Math.floor(Date.now() / 1000) }
}

// DELETE /api/hermes/folders/:id
export async function remove(ctx: any) {
  const { id } = ctx.params
  const success = deleteFolder(id)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Folder not found' }
    return
  }
  ctx.body = { success: true }
}

// POST /api/hermes/folders/reorder
export async function reorder(ctx: any) {
  const { orders } = ctx.request.body || {}
  if (!Array.isArray(orders)) {
    ctx.status = 400
    ctx.body = { error: 'orders array is required' }
    return
  }

  reorderFolders(orders)
  ctx.body = { success: true }
}

// POST /api/hermes/sessions/:id/folder
export async function moveToFolder(ctx: any) {
  const { id } = ctx.params
  const { folder_id } = ctx.request.body || {}

  // folder_id can be null (move to unfiled)
  const success = moveSessionToFolder(id, folder_id || null)
  if (!success) {
    ctx.status = 404
    ctx.body = { error: 'Session not found' }
    return
  }
  ctx.body = { success: true, folder_id: folder_id || null }
}

// POST /api/hermes/sessions/batch-move
export async function batchMove(ctx: any) {
  const { ids, folder_id } = ctx.request.body || {}
  if (!Array.isArray(ids) || ids.length === 0) {
    ctx.status = 400
    ctx.body = { error: 'ids array is required' }
    return
  }

  const moved = batchMoveSessionsToFolder(ids, folder_id || null)
  ctx.body = { success: true, moved }
}

// POST /api/hermes/sessions/:id/pin
export async function pin(ctx: any) {
  const { id } = ctx.params
  const body = ctx.request.body || {}

  // If pinned is explicitly set, use it; otherwise toggle
  if (body.pinned !== undefined) {
    setSessionPinned(id, !!body.pinned)
    ctx.body = { success: true, pinned: !!body.pinned }
  } else {
    const result = toggleSessionPinned(id)
    if (!result) {
      ctx.status = 404
      ctx.body = { error: 'Session not found' }
      return
    }
    ctx.body = { success: true, ...result }
  }
}

// POST /api/hermes/sessions/reorder
export async function sessionReorder(ctx: any) {
  const { orders } = ctx.request.body || {}
  if (!Array.isArray(orders)) {
    ctx.status = 400
    ctx.body = { error: 'orders array is required' }
    return
  }

  reorderSessions(orders)
  ctx.body = { success: true }
}

// POST /api/hermes/folders/migrate
export async function migrate(ctx: any) {
  const result = migrateWorkspaceToFolders()
  ctx.body = result
}

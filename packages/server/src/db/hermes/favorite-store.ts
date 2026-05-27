/**
 * Favorite store — CRUD for message favorites (收藏夹).
 * Stores content snapshots so favorites survive session deletion.
 */
import { getDb } from '../index'
import { FAVORITES_TABLE } from './schemas'

// --- Types ---

export interface FavoriteRow {
  id: string
  message_id: string
  session_id: string
  content: string
  role: string
  title: string | null
  note: string | null
  tags: string | null       // JSON array string
  source_session_title: string | null
  created_at: number
}

// --- CRUD ---

export function listFavorites(options?: {
  limit?: number
  offset?: number
  search?: string
  session_id?: string
}): { items: FavoriteRow[]; total: number } {
  const db = getDb()
  if (!db) return { items: [], total: 0 }

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let whereClause = ''
  const params: any[] = []

  if (options?.session_id) {
    whereClause = 'WHERE session_id = ?'
    params.push(options.session_id)
  }

  if (options?.search) {
    const searchWhere = whereClause ? `${whereClause} AND ` : 'WHERE '
    whereClause = `${searchWhere}(content LIKE ? OR title LIKE ? OR note LIKE ?)`
    const q = `%${options.search}%`
    params.push(q, q, q)
  }

  const totalRow = db.prepare(
    `SELECT COUNT(*) as cnt FROM ${FAVORITES_TABLE} ${whereClause}`
  ).get(...params) as any
  const total = totalRow?.cnt ?? 0

  const items = db.prepare(
    `SELECT * FROM ${FAVORITES_TABLE} ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as any[]

  return { items: items.map(mapFavoriteRow), total }
}

export function getFavorite(id: string): FavoriteRow | null {
  const db = getDb()
  if (!db) return null

  const row = db.prepare(`SELECT * FROM ${FAVORITES_TABLE} WHERE id = ?`).get(id) as any
  return row ? mapFavoriteRow(row) : null
}

export function getFavoriteByMessageId(messageId: string): FavoriteRow | null {
  const db = getDb()
  if (!db) return null

  const row = db.prepare(
    `SELECT * FROM ${FAVORITES_TABLE} WHERE message_id = ?`
  ).get(messageId) as any
  return row ? mapFavoriteRow(row) : null
}

export function createFavorite(data: {
  id: string
  message_id: string
  session_id: string
  content: string
  role?: string
  title?: string | null
  note?: string | null
  tags?: string[] | null
  source_session_title?: string | null
}): FavoriteRow {
  const db = getDb()
  if (!db) throw new Error('Database not available')

  const now = Math.floor(Date.now() / 1000)
  const tagsJson = data.tags ? JSON.stringify(data.tags) : null

  db.prepare(`
    INSERT INTO ${FAVORITES_TABLE}
    (id, message_id, session_id, content, role, title, note, tags, source_session_title, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.message_id,
    data.session_id,
    data.content,
    data.role || 'assistant',
    data.title || null,
    data.note || null,
    tagsJson,
    data.source_session_title || null,
    now,
  )

  return {
    id: data.id,
    message_id: data.message_id,
    session_id: data.session_id,
    content: data.content,
    role: data.role || 'assistant',
    title: data.title || null,
    note: data.note || null,
    tags: tagsJson,
    source_session_title: data.source_session_title || null,
    created_at: now,
  }
}

export function updateFavorite(
  id: string,
  data: { title?: string | null; note?: string | null; tags?: string[] | null }
): boolean {
  const db = getDb()
  if (!db) return false

  const sets: string[] = []
  const params: any[] = []

  if (data.title !== undefined) {
    sets.push('title = ?')
    params.push(data.title)
  }
  if (data.note !== undefined) {
    sets.push('note = ?')
    params.push(data.note)
  }
  if (data.tags !== undefined) {
    sets.push('tags = ?')
    params.push(data.tags ? JSON.stringify(data.tags) : null)
  }

  if (sets.length === 0) return false
  params.push(id)

  const result = db.prepare(
    `UPDATE ${FAVORITES_TABLE} SET ${sets.join(', ')} WHERE id = ?`
  ).run(...params)

  return result.changes > 0
}

export function deleteFavorite(id: string): boolean {
  const db = getDb()
  if (!db) return false

  const result = db.prepare(`DELETE FROM ${FAVORITES_TABLE} WHERE id = ?`).run(id)
  return result.changes > 0
}

export function deleteFavoriteByMessageId(messageId: string): boolean {
  const db = getDb()
  if (!db) return false

  const result = db.prepare(
    `DELETE FROM ${FAVORITES_TABLE} WHERE message_id = ?`
  ).run(messageId)
  return result.changes > 0
}

export function isFavorited(messageId: string): boolean {
  const db = getDb()
  if (!db) return false

  const row = db.prepare(
    `SELECT 1 FROM ${FAVORITES_TABLE} WHERE message_id = ? LIMIT 1`
  ).get(messageId)
  return !!row
}

/**
 * Batch check: given a list of message IDs, return the set that are favorited.
 */
export function getFavoritedMessageIds(messageIds: string[]): Set<string> {
  const db = getDb()
  if (!db || messageIds.length === 0) return new Set()

  const placeholders = messageIds.map(() => '?').join(',')
  const rows = db.prepare(
    `SELECT message_id FROM ${FAVORITES_TABLE} WHERE message_id IN (${placeholders})`
  ).all(...messageIds) as any[]

  return new Set(rows.map((r: any) => r.message_id))
}

// --- Mapper ---

function mapFavoriteRow(row: any): FavoriteRow {
  return {
    id: row.id,
    message_id: row.message_id,
    session_id: row.session_id,
    content: row.content || '',
    role: row.role || 'assistant',
    title: row.title ?? null,
    note: row.note ?? null,
    tags: row.tags ?? null,
    source_session_title: row.source_session_title ?? null,
    created_at: row.created_at,
  }
}

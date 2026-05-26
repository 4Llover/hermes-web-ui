/**
 * Tag store — CRUD for session tagging/labeling.
 */
import { getDb } from '../index'
import { TAGS_TABLE, SESSION_TAGS_TABLE } from './schemas'

// --- Types ---

export interface TagRow {
  id: string
  name: string
  color: string | null
  created_at: number
}

export interface TagWithCount extends TagRow {
  session_count: number
}

// --- Tag CRUD ---

export function listTags(): TagWithCount[] {
  const db = getDb()
  if (!db) return []

  const rows = db.prepare(`
    SELECT t.*, COALESCE(c.cnt, 0) as session_count
    FROM ${TAGS_TABLE} t
    LEFT JOIN (
      SELECT tag_id, COUNT(*) as cnt
      FROM ${SESSION_TAGS_TABLE}
      GROUP BY tag_id
    ) c ON c.tag_id = t.id
    ORDER BY t.name ASC
  `).all() as any[]

  return rows.map(mapTagRow)
}

export function getTag(id: string): TagRow | null {
  const db = getDb()
  if (!db) return null
  const row = db.prepare(`SELECT * FROM ${TAGS_TABLE} WHERE id = ?`).get(id) as any
  return row ? mapTagRow(row) : null
}

export function createTag(data: { id: string; name: string; color?: string | null }): TagRow {
  const db = getDb()
  if (!db) throw new Error('Database not available')

  const now = Math.floor(Date.now() / 1000)
  db.prepare(`INSERT INTO ${TAGS_TABLE} (id, name, color, created_at) VALUES (?, ?, ?, ?)`)
    .run(data.id, data.name, data.color || null, now)

  return { id: data.id, name: data.name, color: data.color || null, created_at: now }
}

export function updateTag(id: string, data: { name?: string; color?: string | null }): boolean {
  const db = getDb()
  if (!db) return false

  const sets: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
  if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color) }
  if (sets.length === 0) return false

  values.push(id)
  const result = db.prepare(`UPDATE ${TAGS_TABLE} SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return (result as any).changes > 0
}

export function deleteTag(id: string): boolean {
  const db = getDb()
  if (!db) return false

  // Remove all session associations
  db.prepare(`DELETE FROM ${SESSION_TAGS_TABLE} WHERE tag_id = ?`).run(id)
  const result = db.prepare(`DELETE FROM ${TAGS_TABLE} WHERE id = ?`).run(id)
  return (result as any).changes > 0
}

// --- Session-Tag operations ---

export function getSessionTags(sessionId: string): TagRow[] {
  const db = getDb()
  if (!db) return []

  const rows = db.prepare(`
    SELECT t.* FROM ${TAGS_TABLE} t
    INNER JOIN ${SESSION_TAGS_TABLE} st ON st.tag_id = t.id
    WHERE st.session_id = ?
    ORDER BY t.name ASC
  `).all(sessionId) as any[]

  return rows.map(mapTagRow)
}

export function addTagToSession(sessionId: string, tagId: string): boolean {
  const db = getDb()
  if (!db) return false

  try {
    db.prepare(`INSERT OR IGNORE INTO ${SESSION_TAGS_TABLE} (session_id, tag_id) VALUES (?, ?)`).run(sessionId, tagId)
    return true
  } catch {
    return false
  }
}

export function removeTagFromSession(sessionId: string, tagId: string): boolean {
  const db = getDb()
  if (!db) return false

  const result = db.prepare(`DELETE FROM ${SESSION_TAGS_TABLE} WHERE session_id = ? AND tag_id = ?`).run(sessionId, tagId)
  return (result as any).changes > 0
}

export function setSessionTags(sessionId: string, tagIds: string[]): void {
  const db = getDb()
  if (!db) return

  db.prepare(`DELETE FROM ${SESSION_TAGS_TABLE} WHERE session_id = ?`).run(sessionId)
  const stmt = db.prepare(`INSERT INTO ${SESSION_TAGS_TABLE} (session_id, tag_id) VALUES (?, ?)`)
  for (const tagId of tagIds) {
    stmt.run(sessionId, tagId)
  }
}

export function getSessionsByTag(tagId: string): string[] {
  const db = getDb()
  if (!db) return []

  const rows = db.prepare(`SELECT session_id FROM ${SESSION_TAGS_TABLE} WHERE tag_id = ?`).all(tagId) as any[]
  return rows.map(r => r.session_id)
}

// --- Helpers ---

function mapTagRow(row: any): TagWithCount {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    color: row.color != null ? String(row.color) : null,
    created_at: Number(row.created_at || 0),
    session_count: Number(row.session_count || 0),
  }
}

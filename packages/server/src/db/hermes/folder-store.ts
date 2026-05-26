/**
 * Folder store — CRUD for session grouping folders.
 * Uses the same getDb() pattern as session-store.ts.
 */
import { getDb } from '../index'
import { FOLDERS_TABLE, SESSIONS_TABLE } from './schemas'

// --- Types ---

export interface FolderRow {
  id: string
  name: string
  color: string | null
  sort_order: number
  created_at: number
  updated_at: number
}

export interface FolderWithCount extends FolderRow {
  session_count: number
}

// --- CRUD ---

export function listFolders(): FolderWithCount[] {
  const db = getDb()
  if (!db) return []

  const rows = db.prepare(`
    SELECT f.*, COALESCE(c.cnt, 0) as session_count
    FROM ${FOLDERS_TABLE} f
    LEFT JOIN (
      SELECT folder_id, COUNT(*) as cnt
      FROM ${SESSIONS_TABLE}
      WHERE folder_id IS NOT NULL
      GROUP BY folder_id
    ) c ON c.folder_id = f.id
    ORDER BY f.sort_order ASC, f.created_at ASC
  `).all() as any[]

  return rows.map(mapFolderRow)
}

export function getFolder(id: string): FolderRow | null {
  const db = getDb()
  if (!db) return null

  const row = db.prepare(`SELECT * FROM ${FOLDERS_TABLE} WHERE id = ?`).get(id) as any
  return row ? mapFolderRow(row) : null
}

export function createFolder(data: { id: string; name: string; color?: string | null }): FolderRow {
  const db = getDb()
  if (!db) throw new Error('Database not available')

  const now = Math.floor(Date.now() / 1000)
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as max_order FROM ${FOLDERS_TABLE}`).get() as any
  const sortOrder = (maxOrder?.max_order ?? -1) + 1

  db.prepare(`
    INSERT INTO ${FOLDERS_TABLE} (id, name, color, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.id, data.name, data.color || null, sortOrder, now, now)

  return { id: data.id, name: data.name, color: data.color || null, sort_order: sortOrder, created_at: now, updated_at: now }
}

export function updateFolder(id: string, data: { name?: string; color?: string | null; sort_order?: number }): boolean {
  const db = getDb()
  if (!db) return false

  const sets: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
  if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color) }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(data.sort_order) }

  if (sets.length === 0) return false

  sets.push('updated_at = ?')
  values.push(Math.floor(Date.now() / 1000))
  values.push(id)

  const result = db.prepare(`UPDATE ${FOLDERS_TABLE} SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return (result as any).changes > 0
}

export function deleteFolder(id: string): boolean {
  const db = getDb()
  if (!db) return false

  // Move sessions in this folder back to "unfiled"
  db.prepare(`UPDATE ${SESSIONS_TABLE} SET folder_id = NULL WHERE folder_id = ?`).run(id)

  const result = db.prepare(`DELETE FROM ${FOLDERS_TABLE} WHERE id = ?`).run(id)
  return (result as any).changes > 0
}

export function reorderFolders(orders: Array<{ id: string; sort_order: number }>): void {
  const db = getDb()
  if (!db) return

  const stmt = db.prepare(`UPDATE ${FOLDERS_TABLE} SET sort_order = ?, updated_at = ? WHERE id = ?`)
  const now = Math.floor(Date.now() / 1000)

  for (const { id, sort_order } of orders) {
    stmt.run(sort_order, now, id)
  }
}

// --- Session-folder operations ---

export function moveSessionToFolder(sessionId: string, folderId: string | null): boolean {
  const db = getDb()
  if (!db) return false

  const result = db.prepare(`UPDATE ${SESSIONS_TABLE} SET folder_id = ? WHERE id = ?`).run(folderId, sessionId)
  return (result as any).changes > 0
}

export function batchMoveSessionsToFolder(sessionIds: string[], folderId: string | null): number {
  const db = getDb()
  if (!db) return 0

  if (sessionIds.length === 0) return 0

  const placeholders = sessionIds.map(() => '?').join(',')
  const result = db.prepare(
    `UPDATE ${SESSIONS_TABLE} SET folder_id = ? WHERE id IN (${placeholders})`
  ).run(folderId, ...sessionIds)
  return (result as any).changes
}

export function toggleSessionPinned(sessionId: string): { pinned: boolean } | null {
  const db = getDb()
  if (!db) return null

  const row = db.prepare(`SELECT pinned FROM ${SESSIONS_TABLE} WHERE id = ?`).get(sessionId) as any
  if (!row) return null

  const newPinned = row.pinned ? 0 : 1
  db.prepare(`UPDATE ${SESSIONS_TABLE} SET pinned = ? WHERE id = ?`).run(newPinned, sessionId)
  return { pinned: !!newPinned }
}

export function setSessionPinned(sessionId: string, pinned: boolean): boolean {
  const db = getDb()
  if (!db) return false

  const result = db.prepare(`UPDATE ${SESSIONS_TABLE} SET pinned = ? WHERE id = ?`).run(pinned ? 1 : 0, sessionId)
  return (result as any).changes > 0
}

export function reorderSessions(orders: Array<{ id: string; sort_order: number }>): void {
  const db = getDb()
  if (!db) return

  const stmt = db.prepare(`UPDATE ${SESSIONS_TABLE} SET sort_order = ? WHERE id = ?`)
  for (const { id, sort_order } of orders) {
    stmt.run(sort_order, id)
  }
}

// --- Migration: workspace → folder_id ---

export function migrateWorkspaceToFolders(): { migrated: number; foldersCreated: number } {
  const db = getDb()
  if (!db) return { migrated: 0, foldersCreated: 0 }

  // Check if folders table is empty and there are workspace values
  const folderCount = (db.prepare(`SELECT COUNT(*) as cnt FROM ${FOLDERS_TABLE}`).get() as any).cnt
  if (folderCount > 0) return { migrated: 0, foldersCreated: 0 } // Already migrated

  const workspaces = db.prepare(
    `SELECT DISTINCT workspace FROM ${SESSIONS_TABLE} WHERE workspace IS NOT NULL AND workspace != ''`
  ).all() as Array<{ workspace: string }>

  if (workspaces.length === 0) return { migrated: 0, foldersCreated: 0 }

  const now = Math.floor(Date.now() / 1000)
  let foldersCreated = 0
  let migrated = 0

  for (let i = 0; i < workspaces.length; i++) {
    const ws = workspaces[i].workspace
    const folderId = `migrated_${i}_${now}`

    db.prepare(`
      INSERT INTO ${FOLDERS_TABLE} (id, name, color, sort_order, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?)
    `).run(folderId, ws, i, now, now)
    foldersCreated++

    const result = db.prepare(
      `UPDATE ${SESSIONS_TABLE} SET folder_id = ? WHERE workspace = ?`
    ).run(folderId, ws)
    migrated += (result as any).changes
  }

  return { migrated, foldersCreated }
}

// --- Archive & Recycle Bin ---

export function archiveSession(sessionId: string): boolean {
  const db = getDb()
  if (!db) return false
  const result = db.prepare(`UPDATE ${SESSIONS_TABLE} SET archived = 1 WHERE id = ?`).run(sessionId)
  return (result as any).changes > 0
}

export function unarchiveSession(sessionId: string): boolean {
  const db = getDb()
  if (!db) return false
  const result = db.prepare(`UPDATE ${SESSIONS_TABLE} SET archived = 0 WHERE id = ?`).run(sessionId)
  return (result as any).changes > 0
}

export function softDeleteSession(sessionId: string): boolean {
  const db = getDb()
  if (!db) return false
  const now = Math.floor(Date.now() / 1000)
  const result = db.prepare(`UPDATE ${SESSIONS_TABLE} SET deleted_at = ? WHERE id = ?`).run(now, sessionId)
  return (result as any).changes > 0
}

export function restoreSession(sessionId: string): boolean {
  const db = getDb()
  if (!db) return false
  const result = db.prepare(`UPDATE ${SESSIONS_TABLE} SET deleted_at = NULL WHERE id = ?`).run(sessionId)
  return (result as any).changes > 0
}

export function listDeletedSessions(): Array<{ id: string; title: string | null; deleted_at: number }> {
  const db = getDb()
  if (!db) return []
  return db.prepare(
    `SELECT id, title, deleted_at FROM ${SESSIONS_TABLE} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
  ).all() as any[]
}

export function purgeDeletedSessions(olderThanDays = 30): number {
  const db = getDb()
  if (!db) return 0
  const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400)
  // Delete associated messages first
  db.prepare(
    `DELETE FROM messages WHERE session_id IN (SELECT id FROM ${SESSIONS_TABLE} WHERE deleted_at IS NOT NULL AND deleted_at < ?)`
  ).run(cutoff)
  const result = db.prepare(
    `DELETE FROM ${SESSIONS_TABLE} WHERE deleted_at IS NOT NULL AND deleted_at < ?`
  ).run(cutoff)
  return (result as any).changes
}

// --- Helpers ---

function mapFolderRow(row: any): FolderWithCount {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    color: row.color != null ? String(row.color) : null,
    sort_order: Number(row.sort_order || 0),
    created_at: Number(row.created_at || 0),
    updated_at: Number(row.updated_at || 0),
    session_count: Number(row.session_count || 0),
  }
}

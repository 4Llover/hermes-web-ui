/**
 * Session Relations Store — 关联会话 CRUD
 * 支持三种关系类型：continuation（续接）、related（关联）、fork（分叉）
 */
import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import { SESSION_RELATIONS_TABLE as TABLE } from './schemas'

export interface SessionRelation {
  id: string
  from_session_id: string
  to_session_id: string
  relation_type: 'continuation' | 'related' | 'fork'
  note: string | null
  created_at: number
}

// ── Create ──

export function createRelation(
  fromSessionId: string,
  toSessionId: string,
  relationType: SessionRelation['relation_type'] = 'continuation',
  note?: string,
): SessionRelation | null {
  const db = getDb()
  if (!db) return null

  // Prevent self-relation
  if (fromSessionId === toSessionId) return null

  const id = randomUUID()
  const now = Date.now()

  try {
    db.prepare(
      `INSERT INTO ${TABLE} (id, from_session_id, to_session_id, relation_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, fromSessionId, toSessionId, relationType, note ?? null, now)

    return { id, from_session_id: fromSessionId, to_session_id: toSessionId, relation_type: relationType, note: note ?? null, created_at: now }
  } catch {
    // Duplicate pair → ignore
    return null
  }
}

// ── Read ──

/** Get all relations where this session is the "from" side (outgoing) */
export function getOutgoingRelations(sessionId: string): SessionRelation[] {
  const db = getDb()
  if (!db) return []
  return db.prepare(
    `SELECT * FROM ${TABLE} WHERE from_session_id = ? ORDER BY created_at DESC`
  ).all(sessionId) as unknown as SessionRelation[]
}

/** Get all relations where this session is the "to" side (incoming) */
export function getIncomingRelations(sessionId: string): SessionRelation[] {
  const db = getDb()
  if (!db) return []
  return db.prepare(
    `SELECT * FROM ${TABLE} WHERE to_session_id = ? ORDER BY created_at DESC`
  ).all(sessionId) as unknown as SessionRelation[]
}

/** Get all relations for a session (both directions) */
export function getAllRelations(sessionId: string): SessionRelation[] {
  const db = getDb()
  if (!db) return []
  return db.prepare(
    `SELECT * FROM ${TABLE} WHERE from_session_id = ? OR to_session_id = ? ORDER BY created_at DESC`
  ).all(sessionId, sessionId) as unknown as SessionRelation[]
}

/** Get the full chain: follow continuation links forward from a session */
export function getContinuationChain(sessionId: string): SessionRelation[] {
  const db = getDb()
  if (!db) return []

  const chain: SessionRelation[] = []
  const visited = new Set<string>()
  let current = sessionId

  while (current && !visited.has(current)) {
    visited.add(current)
    const next = db.prepare(
      `SELECT * FROM ${TABLE} WHERE from_session_id = ? AND relation_type = 'continuation' ORDER BY created_at DESC LIMIT 1`
    ).get(current) as unknown as SessionRelation | undefined

    if (next) {
      chain.push(next)
      current = next.to_session_id
    } else {
      break
    }
  }

  return chain
}

// ── Delete ──

export function deleteRelation(id: string): boolean {
  const db = getDb()
  if (!db) return false
  const result = db.prepare(`DELETE FROM ${TABLE} WHERE id = ?`).run(id)
  return result.changes > 0
}

export function deleteRelationBetween(fromId: string, toId: string): boolean {
  const db = getDb()
  if (!db) return false
  const result = db.prepare(
    `DELETE FROM ${TABLE} WHERE (from_session_id = ? AND to_session_id = ?) OR (from_session_id = ? AND to_session_id = ?)`
  ).run(fromId, toId, toId, fromId)
  return result.changes > 0
}

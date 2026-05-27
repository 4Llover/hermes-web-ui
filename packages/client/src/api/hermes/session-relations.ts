import { request } from '../client'

export interface SessionRelation {
  id: string
  from_session_id: string
  to_session_id: string
  relation_type: 'continuation' | 'related' | 'fork'
  note: string | null
  created_at: number
}

/** Get all relations for a session (both directions) */
export async function fetchRelations(sessionId: string): Promise<SessionRelation[]> {
  return request<SessionRelation[]>(`/api/hermes/sessions/${sessionId}/relations`)
}

/** Get continuation chain starting from a session */
export async function fetchContinuationChain(sessionId: string): Promise<SessionRelation[]> {
  return request<SessionRelation[]>(`/api/hermes/sessions/${sessionId}/continuation-chain`)
}

/** Create a relation between two sessions */
export async function createRelation(
  fromSessionId: string,
  toSessionId: string,
  relationType: 'continuation' | 'related' | 'fork' = 'continuation',
  note?: string,
): Promise<SessionRelation> {
  return request<SessionRelation>(`/api/hermes/sessions/${fromSessionId}/relations`, {
    method: 'POST',
    body: JSON.stringify({
      to_session_id: toSessionId,
      relation_type: relationType,
      note: note || undefined,
    }),
  })
}

/** Delete a relation by ID */
export async function deleteRelation(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/relations/${id}`, {
    method: 'DELETE',
  })
}

/** Delete relation between two sessions */
export async function deleteRelationBetween(fromId: string, toId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/sessions/${fromId}/relations/${toId}`, {
    method: 'DELETE',
  })
}

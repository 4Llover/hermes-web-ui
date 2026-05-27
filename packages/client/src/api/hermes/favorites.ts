import { request } from '../client'

export interface Favorite {
  id: string
  message_id: string
  session_id: string
  content: string
  role: string
  title: string | null
  note: string | null
  tags: string | null
  source_session_title: string | null
  created_at: number
}

export interface FavoriteListResult {
  items: Favorite[]
  total: number
}

export async function fetchFavorites(params?: {
  limit?: number
  offset?: number
  search?: string
  session_id?: string
}): Promise<FavoriteListResult> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  if (params?.search) qs.set('search', params.search)
  if (params?.session_id) qs.set('session_id', params.session_id)
  const q = qs.toString()
  return request<FavoriteListResult>(`/api/hermes/favorites${q ? '?' + q : ''}`)
}

export async function getFavorite(id: string): Promise<Favorite> {
  return request<Favorite>(`/api/hermes/favorites/${id}`)
}

export async function createFavorite(data: {
  message_id: string
  session_id: string
  content: string
  role?: string
  title?: string | null
  note?: string | null
  tags?: string[] | null
  source_session_title?: string | null
}): Promise<Favorite> {
  return request<Favorite>('/api/hermes/favorites', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateFavorite(
  id: string,
  data: { title?: string | null; note?: string | null; tags?: string[] | null }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/favorites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteFavorite(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/favorites/${id}`, {
    method: 'DELETE',
  })
}

export async function checkFavorited(messageId: string): Promise<{ favorited: boolean }> {
  return request<{ favorited: boolean }>(`/api/hermes/favorites/check/${messageId}`)
}

export async function batchCheckFavorited(messageIds: string[]): Promise<{ favoritedIds: string[] }> {
  return request<{ favoritedIds: string[] }>('/api/hermes/favorites/batch-check', {
    method: 'POST',
    body: JSON.stringify({ messageIds }),
  })
}

export async function deleteFavoriteByMessageId(messageId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/favorites/by-message/${messageId}`, {
    method: 'DELETE',
  })
}

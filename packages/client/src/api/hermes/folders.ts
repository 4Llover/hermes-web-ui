import { request } from '../client'

export interface Folder {
  id: string
  name: string
  color: string | null
  sort_order: number
  created_at: number
  updated_at: number
  session_count: number
}

export async function fetchFolders(): Promise<Folder[]> {
  return request<Folder[]>('/api/hermes/folders')
}

export async function createFolder(data: { name: string; color?: string | null }): Promise<Folder> {
  return request<Folder>('/api/hermes/folders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateFolder(id: string, data: { name?: string; color?: string | null; sort_order?: number }): Promise<Folder> {
  return request<Folder>(`/api/hermes/folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteFolder(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/folders/${id}`, {
    method: 'DELETE',
  })
}

export async function reorderFolders(orders: Array<{ id: string; sort_order: number }>): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/hermes/folders/reorder', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  })
}

export async function moveSessionToFolder(sessionId: string, folderId: string | null): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/hermes/sessions/${sessionId}/folder`, {
    method: 'POST',
    body: JSON.stringify({ folder_id: folderId }),
  })
}

export async function batchMoveSessions(ids: string[], folderId: string | null): Promise<{ success: boolean; moved: number }> {
  return request<{ success: boolean; moved: number }>('/api/hermes/sessions/batch-move', {
    method: 'POST',
    body: JSON.stringify({ ids, folder_id: folderId }),
  })
}

export async function toggleSessionPin(sessionId: string): Promise<{ success: boolean; pinned: boolean }> {
  return request<{ success: boolean; pinned: boolean }>(`/api/hermes/sessions/${sessionId}/pin`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function reorderSessions(orders: Array<{ id: string; sort_order: number }>): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/hermes/sessions/reorder', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  })
}

export async function migrateFolders(): Promise<{ migrated: number; foldersCreated: number }> {
  return request<{ migrated: number; foldersCreated: number }>('/api/hermes/folders/migrate', {
    method: 'POST',
  })
}

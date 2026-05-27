import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as favApi from '@/api/hermes/favorites'
import type { Favorite, FavoriteListResult } from '@/api/hermes/favorites'

export const useFavoritesStore = defineStore('favorites', () => {
  // List state
  const items = ref<Favorite[]>([])
  const total = ref(0)
  const loading = ref(false)
  const search = ref('')
  const offset = ref(0)
  const pageSize = 50

  // Quick lookup: which message IDs are favorited (for the ⭐ button)
  const favoritedSet = reactive(new Set<string>())

  // --- List operations ---

  async function fetchFavorites(reset = false) {
    if (reset) {
      offset.value = 0
      items.value = []
    }
    loading.value = true
    try {
      const result: FavoriteListResult = await favApi.fetchFavorites({
        limit: pageSize,
        offset: offset.value,
        search: search.value || undefined,
      })
      if (reset) {
        items.value = result.items
      } else {
        items.value.push(...result.items)
      }
      total.value = result.total
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (items.value.length >= total.value) return
    offset.value = items.value.length
    await fetchFavorites()
  }

  function setSearch(query: string) {
    search.value = query
    fetchFavorites(true)
  }

  // --- Toggle favorite (star/unstar from message action bar) ---

  async function toggleFavorite(params: {
    message_id: string
    session_id: string
    content: string
    role?: string
    source_session_title?: string | null
  }): Promise<boolean> {
    const isFav = favoritedSet.has(params.message_id)

    if (isFav) {
      // Unstar
      try {
        await favApi.deleteFavoriteByMessageId(params.message_id)
        favoritedSet.delete(params.message_id)
        // Remove from list if present
        items.value = items.value.filter(f => f.message_id !== params.message_id)
        total.value = Math.max(0, total.value - 1)
        return false
      } catch (err) {
        console.error('Failed to unfavorite:', err)
        throw err
      }
    } else {
      // Star
      try {
        const fav = await favApi.createFavorite({
          message_id: params.message_id,
          session_id: params.session_id,
          content: params.content,
          role: params.role || 'assistant',
          source_session_title: params.source_session_title,
        })
        favoritedSet.add(params.message_id)
        // Add to list at the top
        items.value.unshift(fav)
        total.value += 1
        return true
      } catch (err: any) {
        // 409 = already favorited — treat as success
        if (err?.status === 409 || err?.response?.status === 409) {
          favoritedSet.add(params.message_id)
          return true
        }
        console.error('Failed to favorite:', err)
        throw err
      }
    }
  }

  // --- Batch check (called when loading a session's messages) ---

  async function checkMessages(messageIds: string[]) {
    if (messageIds.length === 0) return
    try {
      const { favoritedIds } = await favApi.batchCheckFavorited(messageIds)
      for (const id of favoritedIds) {
        favoritedSet.add(id)
      }
    } catch (err) {
      console.error('Failed to batch check favorites:', err)
    }
  }

  // --- Single check ---

  async function checkOne(messageId: string): Promise<boolean> {
    if (favoritedSet.has(messageId)) return true
    try {
      const { favorited } = await favApi.checkFavorited(messageId)
      if (favorited) favoritedSet.add(messageId)
      return favorited
    } catch {
      return false
    }
  }

  // --- Delete from list ---

  async function removeFavorite(id: string) {
    try {
      await favApi.deleteFavorite(id)
      const item = items.value.find(f => f.id === id)
      if (item) {
        favoritedSet.delete(item.message_id)
      }
      items.value = items.value.filter(f => f.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (err) {
      console.error('Failed to delete favorite:', err)
      throw err
    }
  }

  // --- Update (title/note/tags) ---

  async function updateFavoriteItem(
    id: string,
    data: { title?: string | null; note?: string | null; tags?: string[] | null }
  ) {
    try {
      await favApi.updateFavorite(id, data)
      const item = items.value.find(f => f.id === id)
      if (item) {
        if (data.title !== undefined) item.title = data.title ?? null
        if (data.note !== undefined) item.note = data.note ?? null
        if (data.tags !== undefined) item.tags = data.tags ? JSON.stringify(data.tags) : null
      }
    } catch (err) {
      console.error('Failed to update favorite:', err)
      throw err
    }
  }

  // --- Helpers ---

  function isFavorited(messageId: string): boolean {
    return favoritedSet.has(messageId)
  }

  return {
    // State
    items,
    total,
    loading,
    search,
    favoritedSet,
    // Actions
    fetchFavorites,
    loadMore,
    setSearch,
    toggleFavorite,
    checkMessages,
    checkOne,
    removeFavorite,
    updateFavoriteItem,
    isFavorited,
  }
})

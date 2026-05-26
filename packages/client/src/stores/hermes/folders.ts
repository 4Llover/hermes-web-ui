import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as foldersApi from '@/api/hermes/folders'
import type { Folder } from '@/api/hermes/folders'

export const useFoldersStore = defineStore('folders', () => {
  const folders = ref<Folder[]>([])
  const loading = ref(false)
  const collapsedIds = ref<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('hermes_collapsed_folders') || '[]'))
  )

  const sortedFolders = computed(() =>
    [...folders.value].sort((a, b) => a.sort_order - b.sort_order)
  )

  function persistCollapsed() {
    localStorage.setItem('hermes_collapsed_folders', JSON.stringify([...collapsedIds.value]))
  }

  async function fetchFolders() {
    loading.value = true
    try {
      folders.value = await foldersApi.fetchFolders()
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    } finally {
      loading.value = false
    }
  }

  async function createFolder(name: string, color?: string | null) {
    const folder = await foldersApi.createFolder({ name, color })
    folders.value.push(folder)
    return folder
  }

  async function renameFolder(id: string, name: string) {
    await foldersApi.updateFolder(id, { name })
    const f = folders.value.find(f => f.id === id)
    if (f) f.name = name
  }

  async function updateFolderColor(id: string, color: string | null) {
    await foldersApi.updateFolder(id, { color })
    const f = folders.value.find(f => f.id === id)
    if (f) f.color = color
  }

  async function removeFolder(id: string) {
    await foldersApi.deleteFolder(id)
    folders.value = folders.value.filter(f => f.id !== id)
    collapsedIds.value.delete(id)
    persistCollapsed()
  }

  async function reorderFolders(orders: Array<{ id: string; sort_order: number }>) {
    await foldersApi.reorderFolders(orders)
    for (const { id, sort_order } of orders) {
      const f = folders.value.find(f => f.id === id)
      if (f) f.sort_order = sort_order
    }
  }

  function toggleCollapsed(id: string) {
    if (collapsedIds.value.has(id)) {
      collapsedIds.value.delete(id)
    } else {
      collapsedIds.value.add(id)
    }
    persistCollapsed()
  }

  function isCollapsed(id: string): boolean {
    return collapsedIds.value.has(id)
  }

  async function moveSession(sessionId: string, folderId: string | null) {
    await foldersApi.moveSessionToFolder(sessionId, folderId)
  }

  async function batchMove(sessionIds: string[], folderId: string | null) {
    await foldersApi.batchMoveSessions(sessionIds, folderId)
  }

  async function togglePin(sessionId: string) {
    return foldersApi.toggleSessionPin(sessionId)
  }

  async function runMigration() {
    return foldersApi.migrateFolders()
  }

  return {
    folders,
    sortedFolders,
    loading,
    collapsedIds,
    fetchFolders,
    createFolder,
    renameFolder,
    updateFolderColor,
    removeFolder,
    reorderFolders,
    toggleCollapsed,
    isCollapsed,
    moveSession,
    batchMove,
    togglePin,
    runMigration,
  }
})

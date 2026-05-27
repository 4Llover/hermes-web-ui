import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as relationsApi from '@/api/hermes/session-relations'
import type { SessionRelation } from '@/api/hermes/session-relations'

export const useSessionRelationsStore = defineStore('session-relations', () => {
  const relations = ref<SessionRelation[]>([])
  const continuationChain = ref<SessionRelation[]>([])
  const loading = ref(false)

  async function fetchRelations(sessionId: string) {
    loading.value = true
    try {
      relations.value = await relationsApi.fetchRelations(sessionId)
    } catch (err) {
      console.error('Failed to fetch relations:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchContinuationChain(sessionId: string) {
    try {
      continuationChain.value = await relationsApi.fetchContinuationChain(sessionId)
    } catch (err) {
      console.error('Failed to fetch continuation chain:', err)
    }
  }

  async function createRelation(
    fromSessionId: string,
    toSessionId: string,
    relationType: 'continuation' | 'related' | 'fork' = 'continuation',
    note?: string,
  ): Promise<SessionRelation | null> {
    try {
      const relation = await relationsApi.createRelation(fromSessionId, toSessionId, relationType, note)
      relations.value.push(relation)
      return relation
    } catch (err) {
      console.error('Failed to create relation:', err)
      return null
    }
  }

  async function deleteRelation(id: string): Promise<boolean> {
    try {
      await relationsApi.deleteRelation(id)
      relations.value = relations.value.filter(r => r.id !== id)
      return true
    } catch (err) {
      console.error('Failed to delete relation:', err)
      return false
    }
  }

  return {
    relations,
    continuationChain,
    loading,
    fetchRelations,
    fetchContinuationChain,
    createRelation,
    deleteRelation,
  }
})

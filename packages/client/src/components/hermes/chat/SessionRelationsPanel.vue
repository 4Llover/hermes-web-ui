<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { NButton, NSelect, NInput, NPopconfirm, NEmpty } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSessionRelationsStore } from '@/stores/hermes/session-relations'
import { useChatStore } from '@/stores/hermes/chat'

const props = defineProps<{
  sessionId: string
}>()

const { t } = useI18n()
const router = useRouter()
const relationsStore = useSessionRelationsStore()
const chatStore = useChatStore()

const showCreateForm = ref(false)
const targetSessionId = ref('')
const relationType = ref<'continuation' | 'related' | 'fork'>('continuation')
const relationNote = ref('')

// Session options for the dropdown (exclude current session)
const sessionOptions = computed(() =>
  chatStore.sessions
    .filter(s => s.id !== props.sessionId)
    .map(s => ({
      label: s.title || s.id.slice(0, 8),
      value: s.id,
    }))
)

// Group relations by direction
const outgoingRelations = computed(() =>
  relationsStore.relations.filter(r => r.from_session_id === props.sessionId)
)

const incomingRelations = computed(() =>
  relationsStore.relations.filter(r => r.to_session_id === props.sessionId)
)

// Continuation chain
const chain = computed(() => relationsStore.continuationChain)

// Get session title by ID
function getSessionTitle(sessionId: string): string {
  return chatStore.sessions.find(s => s.id === sessionId)?.title || sessionId.slice(0, 8)
}

// Relation type label
function relationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    continuation: `→ ${t('chat.relationsTypeContinuation') || '续接'}`,
    related: `↔ ${t('chat.relationsTypeRelated') || '关联'}`,
    fork: `⤳ ${t('chat.relationsTypeFork') || '分叉'}`,
  }
  return labels[type] || type
}

// Navigate to session
function goToSession(sessionId: string) {
  router.push({ name: 'hermes.session', params: { sessionId } })
}

// Create relation
async function handleCreate() {
  if (!targetSessionId.value) return

  await relationsStore.createRelation(
    props.sessionId,
    targetSessionId.value,
    relationType.value,
    relationNote.value || undefined,
  )

  // Reset form
  showCreateForm.value = false
  targetSessionId.value = ''
  relationNote.value = ''
  relationType.value = 'continuation'
}

// Delete relation
async function handleDelete(id: string) {
  await relationsStore.deleteRelation(id)
}

onMounted(() => {
  relationsStore.fetchRelations(props.sessionId)
  relationsStore.fetchContinuationChain(props.sessionId)
})
</script>

<template>
  <div class="session-relations">
    <div class="relations-header">
      <h4 class="relations-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {{ t('chat.relationsTitle') || '关联会话' }}
      </h4>
      <NButton size="tiny" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '✕' : '+' }}
      </NButton>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" class="relations-form">
      <NSelect
        v-model:value="targetSessionId"
        :options="sessionOptions"
        :placeholder="t('chat.relationsSelectSession') || '选择会话...'"
        filterable
        size="small"
      />
      <div class="form-row">
        <NSelect
          v-model:value="relationType"
          :options="[
            { label: '→ 续接 (continuation)', value: 'continuation' },
            { label: '↔ 关联 (related)', value: 'related' },
            { label: '⤳ 分叉 (fork)', value: 'fork' },
          ]"
          size="small"
          style="width: 60%"
        />
        <NButton
          type="primary"
          size="small"
          :disabled="!targetSessionId"
          @click="handleCreate"
        >
          {{ t('common.create') || '创建' }}
        </NButton>
      </div>
      <NInput
        v-model:value="relationNote"
        :placeholder="t('chat.relationsNotePlaceholder') || '备注（可选）...'"
        size="small"
        type="textarea"
        :rows="1"
      />
    </div>

    <!-- Continuation chain -->
    <div v-if="chain.length > 0" class="relations-section">
      <div class="section-label">🔗 {{ t('chat.relationsChain') || '任务链' }}</div>
      <div class="chain-list">
        <div
          v-for="link in chain"
          :key="link.id"
          class="chain-item"
          @click="goToSession(link.to_session_id)"
        >
          <span class="chain-arrow">→</span>
          <span class="chain-title">{{ getSessionTitle(link.to_session_id) }}</span>
          <NPopconfirm @positive-click="handleDelete(link.id)">
            <template #trigger>
              <button class="chain-delete" @click.stop>×</button>
            </template>
            删除此关联？
          </NPopconfirm>
        </div>
      </div>
    </div>

    <!-- Outgoing relations -->
    <div v-if="outgoingRelations.length > 0" class="relations-section">
      <div class="section-label">→ {{ t('chat.relationsOutgoing') || '从此会话出发' }}</div>
      <div
        v-for="rel in outgoingRelations"
        :key="rel.id"
        class="relation-item"
        @click="goToSession(rel.to_session_id)"
      >
        <span class="relation-type">{{ relationTypeLabel(rel.relation_type) }}</span>
        <span class="relation-target">{{ getSessionTitle(rel.to_session_id) }}</span>
        <span v-if="rel.note" class="relation-note" :title="rel.note">📝</span>
        <NPopconfirm @positive-click="handleDelete(rel.id)">
          <template #trigger>
            <button class="relation-delete" @click.stop>×</button>
          </template>
          删除此关联？
        </NPopconfirm>
      </div>
    </div>

    <!-- Incoming relations -->
    <div v-if="incomingRelations.length > 0" class="relations-section">
      <div class="section-label">← {{ t('chat.relationsIncoming') || '指向此会话' }}</div>
      <div
        v-for="rel in incomingRelations"
        :key="rel.id"
        class="relation-item"
        @click="goToSession(rel.from_session_id)"
      >
        <span class="relation-type">{{ relationTypeLabel(rel.relation_type) }}</span>
        <span class="relation-target">{{ getSessionTitle(rel.from_session_id) }}</span>
        <span v-if="rel.note" class="relation-note" :title="rel.note">📝</span>
        <NPopconfirm @positive-click="handleDelete(rel.id)">
          <template #trigger>
            <button class="relation-delete" @click.stop>×</button>
          </template>
          删除此关联？
        </NPopconfirm>
      </div>
    </div>

    <!-- Empty state -->
    <NEmpty
      v-if="outgoingRelations.length === 0 && incomingRelations.length === 0 && chain.length === 0 && !showCreateForm"
      size="small"
      :description="t('chat.relationsEmpty') || '暂无关联会话'"
      class="relations-empty"
    />
  </div>
</template>

<style scoped lang="scss">
.session-relations {
  padding: 12px;
  font-size: 13px;
}

.relations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.relations-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.relations-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.relations-section {
  margin-bottom: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding: 0 2px;
}

.chain-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chain-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background: var(--bg-secondary);
  }
}

.chain-arrow {
  color: var(--accent-primary);
  font-weight: 600;
}

.chain-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chain-delete {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.15s;

  .chain-item:hover & {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1 !important;
    color: #e53e3e;
  }
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background: var(--bg-secondary);
  }
}

.relation-type {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.relation-target {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-note {
  flex-shrink: 0;
  cursor: help;
}

.relation-delete {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.15s;

  .relation-item:hover & {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1 !important;
    color: #e53e3e;
  }
}

.relations-empty {
  padding: 20px 0;
}
</style>

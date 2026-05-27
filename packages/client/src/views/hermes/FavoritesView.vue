<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { NInput, NEmpty, NSpin, NButton, NPopconfirm, NCheckbox, useMessage } from 'naive-ui'
import { useFavoritesStore } from '@/stores/hermes/favorites'
import { copyToClipboard } from '@/utils/clipboard'
import type { Favorite } from '@/api/hermes/favorites'

const { t } = useI18n()
const router = useRouter()
const toast = useMessage()
const favStore = useFavoritesStore()

// --- Expanded state ---
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function isExpanded(id: string) {
  return expandedId.value === id
}

// --- Edit state ---
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editNote = ref('')

function startEdit(fav: Favorite) {
  editingId.value = fav.id
  editTitle.value = fav.title || ''
  editNote.value = fav.note || ''
}

function cancelEdit() {
  editingId.value = null
  editTitle.value = ''
  editNote.value = ''
}

async function saveEdit(id: string) {
  try {
    await favStore.updateFavoriteItem(id, {
      title: editTitle.value.trim() || null,
      note: editNote.value.trim() || null,
    })
    editingId.value = null
    toast.success(t('favorites.saved'))
  } catch {
    toast.error(t('favorites.saveFailed'))
  }
}

// --- Batch mode ---
const batchMode = ref(false)
const selectedIds = ref(new Set<string>())

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) selectedIds.value.clear()
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function selectAll() {
  for (const fav of favStore.items) {
    selectedIds.value.add(fav.id)
  }
}

function deselectAll() {
  selectedIds.value.clear()
}

const hasSelection = computed(() => selectedIds.value.size > 0)

async function batchDelete() {
  if (selectedIds.value.size === 0) return
  const count = selectedIds.value.size
  try {
    for (const id of selectedIds.value) {
      await favStore.removeFavorite(id)
    }
    selectedIds.value.clear()
    batchMode.value = false
    toast.success(t('favorites.batchDeleted', { count }))
  } catch {
    toast.error(t('favorites.deleteFailed'))
    favStore.fetchFavorites(true)
  }
}

// --- Copy ---
async function copyContent(content: string) {
  const ok = await copyToClipboard(content)
  if (ok) toast.success(t('favorites.copied'))
  else toast.error(t('favorites.copyFailed'))
}

// --- Search ---
function handleSearch(value: string) {
  favStore.setSearch(value)
}

// --- Scroll ---
function handleScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    favStore.loadMore()
  }
}

// --- Delete ---
async function handleDelete(id: string) {
  try {
    await favStore.removeFavorite(id)
    toast.success(t('favorites.deleted'))
  } catch {
    toast.error(t('favorites.deleteFailed'))
  }
}

// --- Helpers ---
function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function goToSource(sessionId: string) {
  router.push({ name: 'hermes.session', params: { sessionId } })
}

function getPreview(content: string, maxLen = 150): string {
  if (!content) return ''
  const text = content.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ').trim()
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

onMounted(() => {
  favStore.fetchFavorites(true)
})
</script>

<template>
  <div class="favorites-view">
    <!-- Header -->
    <div class="favorites-header">
      <h2>{{ t('favorites.title') }}</h2>
      <span class="favorites-count" v-if="favStore.total > 0">{{ favStore.total }}</span>
      <div class="header-actions">
        <NButton size="tiny" quaternary :type="batchMode ? 'primary' : 'default'" @click="toggleBatchMode">
          {{ batchMode ? t('favorites.exitBatch') : t('favorites.batchManage') }}
        </NButton>
      </div>
    </div>

    <!-- Batch bar -->
    <div v-if="batchMode" class="batch-bar">
      <NCheckbox :checked="selectedIds.size === favStore.items.length && favStore.items.length > 0" @update:checked="(v: boolean) => v ? selectAll() : deselectAll()">
        {{ t('favorites.selectAll') }}
      </NCheckbox>
      <span class="batch-count" v-if="hasSelection">{{ t('favorites.selected', { count: selectedIds.size }) }}</span>
      <NPopconfirm v-if="hasSelection" @positive-click="batchDelete">
        <template #trigger>
          <NButton size="tiny" type="error" quaternary>{{ t('favorites.batchDelete') }}</NButton>
        </template>
        {{ t('favorites.confirmBatchDelete', { count: selectedIds.size }) }}
      </NPopconfirm>
    </div>

    <!-- Search -->
    <div class="favorites-search">
      <NInput
        :value="favStore.search"
        :placeholder="t('favorites.searchPlaceholder')"
        clearable
        @update:value="handleSearch"
      />
    </div>

    <!-- List -->
    <div class="favorites-list" @scroll="handleScroll">
      <NSpin v-if="favStore.loading && favStore.items.length === 0" class="favorites-spinner" />

      <NEmpty
        v-else-if="!favStore.loading && favStore.items.length === 0"
        :description="favStore.search ? t('favorites.noResults') : t('favorites.empty')"
      />

      <div
        v-for="fav in favStore.items"
        :key="fav.id"
        class="fav-card"
        :class="{ expanded: isExpanded(fav.id), selected: selectedIds.has(fav.id) }"
      >
        <!-- Checkbox in batch mode -->
        <div v-if="batchMode" class="fav-checkbox" @click="toggleSelect(fav.id)">
          <NCheckbox :checked="selectedIds.has(fav.id)" />
        </div>

        <!-- Header -->
        <div class="fav-card-header" @click="toggleExpand(fav.id)">
          <div class="fav-header-left">
            <span class="fav-expand-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ rotated: isExpanded(fav.id) }">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
            <span class="fav-source" v-if="fav.source_session_title" @click.stop="goToSource(fav.session_id)">
              {{ fav.source_session_title }}
            </span>
            <span v-if="fav.title" class="fav-custom-title">{{ fav.title }}</span>
          </div>
          <span class="fav-time">{{ formatTime(fav.created_at) }}</span>
        </div>

        <!-- Preview (collapsed) -->
        <div v-if="!isExpanded(fav.id)" class="fav-card-body" @click="toggleExpand(fav.id)">
          <p class="fav-preview-text">{{ getPreview(fav.content) }}</p>
        </div>

        <!-- Expanded content -->
        <div v-if="isExpanded(fav.id)" class="fav-expanded">
          <!-- Edit mode -->
          <div v-if="editingId === fav.id" class="fav-edit">
            <div class="fav-edit-field">
              <label>{{ t('favorites.titleLabel') }}</label>
              <NInput v-model:value="editTitle" :placeholder="t('favorites.titlePlaceholder')" size="small" />
            </div>
            <div class="fav-edit-field">
              <label>{{ t('favorites.noteLabel') }}</label>
              <NInput v-model:value="editNote" type="textarea" :placeholder="t('favorites.notePlaceholder')" size="small" :rows="3" />
            </div>
            <div class="fav-edit-actions">
              <NButton size="tiny" @click="cancelEdit">{{ t('common.cancel') }}</NButton>
              <NButton size="tiny" type="primary" @click="saveEdit(fav.id)">{{ t('common.save') }}</NButton>
            </div>
          </div>

          <!-- View mode -->
          <template v-if="editingId !== fav.id">
            <div v-if="fav.note" class="fav-note">
              <span class="fav-note-label">{{ t('favorites.note') }}:</span> {{ fav.note }}
            </div>
            <div class="fav-full-content">
              <pre class="fav-content-text">{{ fav.content }}</pre>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="fav-card-footer" v-if="!batchMode">
          <NButton size="tiny" quaternary @click="copyContent(fav.content)">
            {{ t('favorites.copy') }}
          </NButton>
          <NButton size="tiny" quaternary @click="startEdit(fav)">
            {{ t('favorites.edit') }}
          </NButton>
          <NButton size="tiny" quaternary @click="goToSource(fav.session_id)">
            {{ t('favorites.goToSource') }}
          </NButton>
          <NPopconfirm @positive-click="handleDelete(fav.id)">
            <template #trigger>
              <NButton size="tiny" quaternary type="error">
                {{ t('favorites.delete') }}
              </NButton>
            </template>
            {{ t('favorites.confirmDelete') }}
          </NPopconfirm>
        </div>
      </div>

      <div v-if="favStore.loading && favStore.items.length > 0" class="favorites-loading-more">
        <NSpin size="small" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.favorites-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  overflow: hidden;
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .favorites-count {
    font-size: 12px;
    color: $text-muted;
    background: rgba(0, 0, 0, 0.06);
    padding: 2px 8px;
    border-radius: 10px;

    .dark & {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .header-actions {
    margin-left: auto;
  }
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  border-radius: $radius-sm;
  font-size: 13px;

  .batch-count {
    color: $text-muted;
    font-size: 12px;
  }
}

.favorites-search {
  margin-bottom: 12px;
}

.favorites-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
}

.favorites-spinner {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.favorites-loading-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.fav-card {
  border: 1px solid $border-color;
  border-radius: $radius-md;
  padding: 12px 14px;
  background: $bg-card;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &.expanded {
    border-color: var(--accent-primary);
  }

  &.selected {
    border-color: var(--accent-primary);
    background: rgba(var(--accent-primary-rgb), 0.03);
  }

  .dark & {
    background: #2a2a2a;
    border-color: #444;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  }
}

.fav-checkbox {
  margin-bottom: 6px;
  cursor: pointer;
}

.fav-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;

  .fav-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;
  }

  .fav-expand-icon {
    flex-shrink: 0;
    color: $text-muted;

    svg {
      transition: transform 0.15s ease;
      &.rotated { transform: rotate(180deg); }
    }
  }

  .fav-source {
    font-size: 12px;
    color: var(--accent-primary);
    cursor: pointer;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover { text-decoration: underline; }
  }

  .fav-custom-title {
    font-size: 13px;
    font-weight: 500;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fav-time {
    font-size: 11px;
    color: $text-muted;
    flex-shrink: 0;
    margin-left: 8px;
  }
}

.fav-card-body {
  font-size: 13px;
  line-height: 1.5;
  color: $text-secondary;
  max-height: 60px;
  overflow: hidden;
  cursor: pointer;
  margin-top: 6px;
  position: relative;

  .fav-preview-text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    background: linear-gradient(transparent, $bg-card);
    pointer-events: none;

    .dark & { background: linear-gradient(transparent, #2a2a2a); }
  }
}

.fav-expanded {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid $border-light;
}

.fav-note {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: $radius-sm;

  .dark & { background: rgba(255, 255, 255, 0.05); }

  .fav-note-label {
    font-weight: 600;
    color: $text-muted;
  }
}

.fav-full-content {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 8px;
  scrollbar-width: thin;

  .fav-content-text {
    font-family: $font-code;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 10px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: $radius-sm;

    .dark & { background: rgba(255, 255, 255, 0.03); }
  }
}

.fav-edit {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .fav-edit-field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 12px;
      font-weight: 600;
      color: $text-muted;
    }
  }

  .fav-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.fav-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid $border-light;
}
</style>

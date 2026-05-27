<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { NModal, NInput, NScrollbar, NSpin, NEmpty, NButton } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { listFiles, type FileEntry } from '@/api/hermes/files'

const { t } = useI18n()

const props = defineProps<{
  show: boolean
  multiSelect?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  select: [entries: FileEntry[]]
}>()

const showModel = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v),
})

const currentPath = ref('/')
const loading = ref(false)
const entries = ref<FileEntry[]>([])
const error = ref<string | null>(null)
const searchQuery = ref('')
const searchInputRef = ref<InstanceType<typeof NInput>>()
const selectedPaths = ref<Set<string>>(new Set())

const breadcrumbs = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = [{ label: '/', path: '/' }]
  let acc = ''
  for (const part of parts) {
    acc += '/' + part
    crumbs.push({ label: part, path: acc })
  }
  return crumbs
})

const filteredEntries = computed(() => {
  if (!searchQuery.value.trim()) return entries.value
  const q = searchQuery.value.toLowerCase()
  return entries.value.filter(e => e.name.toLowerCase().includes(q))
})

const sortedEntries = computed(() => {
  const list = [...filteredEntries.value]
  list.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return list
})

async function navigateTo(path: string) {
  loading.value = true
  error.value = null
  try {
    const result = await listFiles(path)
    entries.value = result.entries
    currentPath.value = result.absolutePath || result.path || path
  } catch (err: any) {
    error.value = err.message || 'Failed to list directory'
    entries.value = []
  } finally {
    loading.value = false
  }
}

function handleEntryClick(entry: FileEntry) {
  if (entry.isDir) {
    searchQuery.value = ''
    navigateTo(entry.absolutePath || entry.path)
  } else {
    toggleSelect(entry)
  }
}

function handleEntryDblClick(entry: FileEntry) {
  if (!entry.isDir) {
    selectedPaths.value.clear()
    selectedPaths.value.add(entry.absolutePath || entry.path)
    handleConfirm()
  }
}

function toggleSelect(entry: FileEntry) {
  const path = entry.absolutePath || entry.path
  const next = new Set(selectedPaths.value)
  if (next.has(path)) {
    next.delete(path)
  } else {
    if (!props.multiSelect) next.clear()
    next.add(path)
  }
  selectedPaths.value = next
}

function isSelected(entry: FileEntry): boolean {
  return selectedPaths.value.has(entry.absolutePath || entry.path)
}

function handleConfirm() {
  const selected = entries.value.filter(e =>
    selectedPaths.value.has(e.absolutePath || e.path)
  )
  if (selected.length > 0) {
    emit('select', selected)
    emit('update:show', false)
    selectedPaths.value.clear()
    searchQuery.value = ''
  }
}

function handleBreadcrumbClick(path: string) {
  searchQuery.value = ''
  navigateTo(path)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function getFileIcon(entry: FileEntry): string {
  if (entry.isDir) return '📁'
  const ext = entry.name.split('.').pop()?.toLowerCase() || ''
  const iconMap: Record<string, string> = {
    py: '🐍', js: '📜', ts: '📜', tsx: '📜', jsx: '📜',
    md: '📝', txt: '📄', json: '📋', yaml: '📋', yml: '📋', toml: '📋',
    csv: '📊', xlsx: '📊', xls: '📊',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    pdf: '📕', doc: '📘', docx: '📘',
    mp4: '🎬', mp3: '🎵', wav: '🎵',
    zip: '📦', tar: '📦', gz: '📦',
    sh: '⚙️', bat: '⚙️',
  }
  return iconMap[ext] || '📄'
}

watch(() => props.show, (v) => {
  if (v) {
    selectedPaths.value.clear()
    searchQuery.value = ''
    if (entries.value.length === 0) {
      navigateTo('/')
    }
    nextTick(() => searchInputRef.value?.focus())
  }
})
</script>

<template>
  <NModal
    v-model:show="showModel"
    preset="card"
    :title="t('fileBrowser.title')"
    style="width: 640px; max-height: 70vh"
    :bordered="false"
    :segmented="{ content: true, footer: true }"
  >
    <div class="fb-breadcrumb">
      <span
        v-for="(crumb, i) in breadcrumbs"
        :key="crumb.path"
        class="fb-crumb"
        :class="{ active: i === breadcrumbs.length - 1 }"
        @click="i < breadcrumbs.length - 1 && handleBreadcrumbClick(crumb.path)"
      >
        {{ crumb.label }}
        <span v-if="i < breadcrumbs.length - 1" class="fb-crumb-sep">/</span>
      </span>
    </div>

    <div class="fb-search">
      <NInput
        ref="searchInputRef"
        v-model:value="searchQuery"
        :placeholder="t('fileBrowser.search')"
        size="small"
        clearable
      >
        <template #prefix>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </template>
      </NInput>
    </div>

    <div class="fb-list-container">
      <NScrollbar style="max-height: 400px">
        <div v-if="loading" class="fb-loading">
          <NSpin size="small" />
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-else-if="error" class="fb-error">{{ error }}</div>
        <NEmpty v-else-if="sortedEntries.length === 0" :description="t('fileBrowser.empty')" />
        <div v-else>
          <div
            v-for="entry in sortedEntries"
            :key="entry.path"
            class="fb-entry"
            :class="{ selected: isSelected(entry), dir: entry.isDir }"
            @click="handleEntryClick(entry)"
            @dblclick="handleEntryDblClick(entry)"
          >
            <span class="fb-entry-icon">{{ getFileIcon(entry) }}</span>
            <span class="fb-entry-name">{{ entry.name }}</span>
            <span v-if="!entry.isDir" class="fb-entry-size">{{ formatSize(entry.size) }}</span>
            <span v-if="isSelected(entry)" class="fb-entry-check">✓</span>
          </div>
        </div>
      </NScrollbar>
    </div>

    <template #footer>
      <div class="fb-footer">
        <span class="fb-selection-info" v-if="selectedPaths.size > 0">
          {{ t('fileBrowser.selected', { count: selectedPaths.size }) }}
        </span>
        <span class="fb-selection-info" v-else>
          {{ t('fileBrowser.hint') }}
        </span>
        <div class="fb-footer-actions">
          <NButton size="small" @click="showModel = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" size="small" :disabled="selectedPaths.size === 0" @click="handleConfirm">
            {{ t('fileBrowser.confirm') }}
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.fb-breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  overflow-x: auto;
  white-space: nowrap;
}

.fb-crumb {
  cursor: pointer;
  color: #1a9c6e;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background 0.15s;
  &:hover:not(.active) { background: rgba(26, 156, 110, 0.1); }
  &.active { color: #666; cursor: default; }
}

.fb-crumb-sep {
  color: #ccc;
  margin: 0 2px;
}

.fb-search { margin-bottom: 8px; }
.fb-list-container { min-height: 200px; }

.fb-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #999;
  font-size: 13px;
}

.fb-error {
  padding: 20px;
  text-align: center;
  color: #e8734a;
  font-size: 13px;
}

.fb-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
  font-size: 13px;
  user-select: none;
  &:hover { background: rgba(26, 156, 110, 0.06); }
  &.selected { background: rgba(26, 156, 110, 0.12); }
  &.dir .fb-entry-name { font-weight: 500; }
}

.fb-entry-icon {
  font-size: 15px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.fb-entry-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}

.fb-entry-size {
  color: #999;
  font-size: 12px;
  flex-shrink: 0;
}

.fb-entry-check {
  color: #1a9c6e;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.fb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fb-selection-info {
  font-size: 12px;
  color: #999;
}

.fb-footer-actions {
  display: flex;
  gap: 8px;
}
</style>

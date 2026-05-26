# 会话智能管理功能设计方案

> 基于 hermes-web-ui v0.6.0 现有架构，参考 ChatGPT / Cherry Studio / Open WebUI

## 一、现有架构基础

### 已有能力（可直接利用）

| 能力 | 实现位置 | 说明 |
|------|---------|------|
| workspace 字段 | sessions 表 TEXT 列 | 已存在，可存分组名 |
| 设置 workspace API | `POST /sessions/:id/workspace` | 已实现 |
| 批量删除 API | `POST /sessions/batch-delete` | 已实现 |
| 批量选择模式 | ChatPanel.vue `isBatchMode` | 前端已有 |
| 分组折叠/展开 | 你的自定义代码（+125行） | 已部署 |
| 右键菜单 | NDropdown contextMenu | 已有框架 |
| FolderPicker 组件 | 独立组件，弹窗选择 | 已存在 |

### 缺失部分（需要新增）

| 缺失 | 说明 |
|------|------|
| folders 表 | 当前 workspace 是自由文本，无独立的分组实体管理 |
| 分组 CRUD API | 新建/重命名/删除/排序 分组 |
| 拖拽交互 | 前端无 DnD 库 |
| 会话排序字段 | sessions 表无 sort_order |
| pinned 字段 | 前端有 pin 逻辑但后端无持久化 |
| archived 状态 | 无归档功能 |

---

## 二、功能规划（分三期）

### Phase 1：核心分组 + 拖拽（最小可用版本）

**目标：** 实现"新建分组 → 拖拽会话进分组 → 管理分组"的完整闭环

#### 1.1 后端改动

**新增 `folders` 表：**
```sql
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,           -- uuid
  name TEXT NOT NULL,            -- 分组显示名
  color TEXT DEFAULT NULL,       -- 可选颜色标识 (#hex)
  sort_order INTEGER DEFAULT 0,  -- 排序权重
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**sessions 表新增字段：**
```sql
ALTER TABLE sessions ADD COLUMN folder_id TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN pinned INTEGER DEFAULT 0;
```

**新增 API 端点：**

```
GET    /api/hermes/folders              → 列出所有分组
POST   /api/hermes/folders              → 创建分组 { name, color? }
PUT    /api/hermes/folders/:id          → 更新分组 { name?, color?, sort_order? }
DELETE /api/hermes/folders/:id          → 删除分组（会话释放到"未分组"）
POST   /api/hermes/folders/reorder      → 批量更新排序 [{ id, sort_order }]

POST   /api/hermes/sessions/:id/folder  → 移动会话到分组 { folder_id | null }
POST   /api/hermes/sessions/:id/pin     → 切换置顶 { pinned: boolean }
POST   /api/hermes/sessions/batch-move  → 批量移动 { ids[], folder_id }
POST   /api/hermes/sessions/reorder     → 批量排序 [{ id, sort_order }]
```

#### 1.2 前端改动

**拖拽库选型：** `vue-draggable-plus`（基于 SortableJS，Vue3 原生支持）

**ChatPanel 侧边栏改造：**
```
Session 侧边栏
├── 📌 固定区（pinned sessions，可拖拽排序）
├── 📁 分组区（folders）
│   ├── [+] 新建分组按钮
│   ├── 📁 分组 A（可折叠/拖拽）
│   │   ├── 💬 会话 1（可拖拽移动/排序）
│   │   └── 💬 会话 2
│   ├── 📁 分组 B
│   │   └── 💬 会话 3
│   └── 📁 未分组（默认组，不可删除）
│       └── 💬 会话 4
└── 🔍 搜索框
```

**交互细节：**
- 拖拽会话 → 松到分组标题上 = 移入该分组
- 拖拽会话 → 松到组内会话之间 = 排序
- 拖拽分组 → 调整分组之间的顺序
- 右键分组 → 重命名 / 修改颜色 / 删除
- 右键会话 → 移至分组（子菜单列出所有分组）/ 置顶 / 取消置顶

#### 1.3 数据迁移

现有 `workspace` 字段数据自动迁移：
```
启动时检测: 
  IF sessions.workspace 有非NULL值 AND folders 表为空:
    为每个唯一的 workspace 值创建一条 folder 记录
    将 sessions.folder_id 指向对应的 folder.id
```

---

### Phase 2：增强管理

| 功能 | 说明 |
|------|------|
| 🏷️ 标签系统 | tags 表 + session_tags 关联表，彩色标签，多标签 |
| 📦 归档功能 | sessions.archived = 1，归档区独立展示 |
| 🗑️ 回收站 | 软删除 sessions.deleted_at，30天后真删 |
| 📊 分组统计 | 每个分组显示会话数、总 token 消耗 |
| 🔍 高级搜索 | 按分组/标签/模型/日期复合过滤 |
| 📋 批量移动/标签 | 批量模式下可移动到分组或打标签 |

### Phase 3：智能管理

| 功能 | 说明 |
|------|------|
| 🤖 AI 自动分组建议 | 分析会话标题+内容，推荐放入哪个分组 |
| 🤖 AI 自动标签 | 基于对话主题自动打标签 |
| 📈 使用热力图 | 可视化哪些分组/标签最活跃 |
| 🔗 关联会话 | 标记"续接"关系，追踪跨 session 的任务线 |

---

## 三、技术方案细节

### 3.1 拖拽实现

```bash
# 安装依赖
npm install vue-draggable-plus
```

```vue
<!-- 伪代码：分组内会话列表 -->
<VueDraggable
  v-model="folder.sessions"
  group="sessions"
  :animation="200"
  ghost-class="drag-ghost"
  @end="handleDragEnd"
>
  <SessionListItem
    v-for="session in folder.sessions"
    :key="session.id"
    :session="session"
  />
</VueDraggable>
```

关键参数：
- `group="sessions"`：允许跨分组拖拽
- `ghost-class`：拖拽时的半透明占位样式
- `@end`：松手时调用 API 更新 folder_id + sort_order

### 3.2 新建分组交互

触发方式（三选一，推荐 ①+③）：
1. ① 侧边栏顶部 [+ 新建分组] 按钮
2. ② 拖拽会话到侧边栏底部空白区 → 弹出新建
3. ③ 右键会话 → "移至" → "新建分组..."

弹窗内容：
- 分组名称（必填）
- 颜色选择器（可选，预设 8 色）

### 3.3 状态管理

```typescript
// stores/folders.ts (新文件)
interface Folder {
  id: string
  name: string
  color: string | null
  sortOrder: number
  collapsed: boolean  // 本地状态，存 localStorage
}

// chatStore 扩展
interface Session {
  // ... 现有字段
  folderId: string | null  // 新增
  sortOrder: number        // 新增
  pinned: boolean          // 新增
}
```

### 3.4 与 workspace 字段的兼容策略

| 场景 | 处理方式 |
|------|---------|
| 旧 session 有 workspace 无 folder_id | 启动迁移脚本自动创建 folder |
| CLI session（state.db）无 folder_id | 显示在"未分组"中 |
| API setWorkspace 仍可用 | 保持向后兼容，内部同时设 folder_id |
| folder 删除 | session.folder_id 置 NULL，回到未分组 |

---

## 四、工作量估算

| 阶段 | 改动 | 预估行数 | 预估时间 |
|------|------|---------|---------|
| Phase 1 后端 | folders CRUD + migration + 新端点 | ~300 行 | 1-2h |
| Phase 1 前端 | 拖拽+分组UI+Store+右键菜单 | ~600 行 | 3-4h |
| Phase 1 测试 | 手工验证+修bug | - | 1h |
| **Phase 1 总计** | | **~900 行** | **5-7h** |
| Phase 2 全部 | 标签+归档+回收站+搜索 | ~1200 行 | 8-12h |
| Phase 3 全部 | AI 功能 | ~500 行 | 4-6h |

---

## 五、文件改动清单（Phase 1）

```
packages/server/
├── src/db/hermes/schemas.ts          ← 新增 folders 表 + sessions 扩展字段
├── src/db/hermes/folder-store.ts     ← 新增：folders CRUD
├── src/db/hermes/session-store.ts    ← 扩展：folder_id/sort_order/pinned
├── src/routes/hermes/folders.ts      ← 新增：folders API 路由
├── src/routes/hermes/sessions.ts     ← 扩展：move/pin/reorder 端点
└── src/routes/index.ts               ← 注册 folders 路由

packages/client/
├── src/api/hermes/folders.ts         ← 新增：folders API 调用
├── src/stores/hermes/folders.ts      ← 新增：folders store
├── src/stores/hermes/chat.ts         ← 扩展：session 增加 folderId/pinned
├── src/components/hermes/chat/
│   ├── ChatPanel.vue                 ← 大改：侧边栏分组+拖拽
│   ├── FolderItem.vue                ← 新增：分组组件（折叠/右键/拖拽目标）
│   ├── DraggableSessionList.vue      ← 新增：可拖拽会话列表
│   └── FolderCreateModal.vue         ← 新增：新建分组弹窗
├── src/i18n/locales/zh.ts            ← 扩展
└── src/i18n/locales/en.ts            ← 扩展
```

---

## 六、参考竞品总结

| 维度 | 最佳参考 | 说明 |
|------|---------|------|
| 交互体验 | ChatGPT | 简洁的拖拽+单级文件夹，学习成本低 |
| 功能完整度 | Cherry Studio | 多级文件夹+标签+回收站+归档，功能最全 |
| 架构参考 | Open WebUI | workspace 概念+REST API，和你现有架构最接近 |
| 推荐路线 | ChatGPT 式交互 + Cherry Studio 核心功能 | 简洁交互+丰富管理 |

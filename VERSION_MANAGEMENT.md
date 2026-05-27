# Hermes Web UI Fork 版本管理指南

## 概述

本项目是 [EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui) 的自定义 fork，添加了以下功能：

- **Phase 1**: 会话分组 + 拖拽管理
- **Phase 2**: 标签 + 归档 + 回收站
- **Phase 3**: 关联会话（续接关系追踪）

## 仓库结构

```
origin:   github-4llover:4Llover/hermes-web-ui.git (你的 fork)
upstream: https://github.com/EKKOLearnAI/hermes-web-ui.git (官方仓库)
```

- **分支**: `feature/zh-session-groups`
- **当前版本**: 基于 upstream v0.6.1 + 自定义功能

## 同步流程

### 自动同步（推荐）

```bash
cd /mnt/e/Hermes\ Folder/projects/hermes-web-ui/
./sync-upstream.sh
```

### 手动同步

```bash
# 1. 获取最新代码
git fetch upstream
git fetch origin

# 2. 暂存本地更改（如有）
git stash push -m "manual sync"

# 3. Rebase onto upstream/main
git rebase upstream/main

# 4. 恢复暂存的更改
git stash pop

# 5. 推送到 origin
git push --force-with-lease origin feature/zh-session-groups
```

### 强制同步（覆盖本地）

```bash
git fetch upstream
git reset --hard upstream/main
git push --force-with-lease origin feature/zh-session-groups
```

## 构建与部署

```bash
# 构建
cd /mnt/e/Hermes\ Folder/projects/hermes-web-ui/
PATH="$HOME/.local/node-v23/bin:$PATH" npm run build

# 部署到 Hermes
cp dist/client/* ~/.local/node-v23/lib/node_modules/hermes-web-ui/dist/client/
cp dist/server/index.js ~/.local/node-v23/lib/node_modules/hermes-web-ui/dist/server/

# 重启服务
systemctl --user restart hermes-web-ui
```

## 版本标记

### 当前自定义功能

| 功能 | 状态 | 说明 |
|------|------|------|
| UI 字体层级优化 | ✅ | 分组标签 13px，会话标题 12px |
| 关联会话 | ✅ | 续接/关联/分叉三种关系类型 |
| 任务链追踪 | ✅ | 自动追踪 continuation 链 |

### 与 upstream 的差异

```bash
# 查看差异
git log --oneline upstream/main..HEAD

# 查看文件差异
git diff upstream/main --stat
```

## 冲突解决

### 常见冲突文件

- `packages/client/src/components/hermes/chat/ChatPanel.vue` (主要 UI 文件)
- `packages/client/src/i18n/locales/zh.ts` (中文翻译)
- `packages/server/src/db/hermes/schemas.ts` (数据库 schema)

### 解决步骤

1. **识别冲突**: `git status` 查看冲突文件
2. **手动编辑**: 保留两边的更改，或选择优先保留的版本
3. **标记解决**: `git add <冲突文件>`
4. **继续 rebase**: `git rebase --continue`
5. **推送更新**: `git push --force-with-lease origin feature/zh-session-groups`

## 回滚策略

### 回滚到特定版本

```bash
# 查看版本历史
git log --oneline -20

# 回滚到特定 commit
git reset --hard <commit-hash>

# 强制推送
git push --force-with-lease origin feature/zh-session-groups
```

### 回滚到 upstream 版本

```bash
# 丢弃所有自定义更改
git fetch upstream
git reset --hard upstream/main
git push --force-with-lease origin feature/zh-session-groups
```

## 最佳实践

1. **定期同步**: 每周至少同步一次 upstream，避免差异过大
2. **小步提交**: 每个功能一个 commit，方便回滚和 cherry-pick
3. **测试验证**: 同步后务必构建测试，确保功能正常
4. **备份分支**: 重大更改前创建备份分支
   ```bash
   git branch backup/feature-YYYYMMDD
   ```
5. **文档更新**: 每次同步后更新本文档的版本信息

## 相关链接

- **Fork 仓库**: https://github.com/4Llover/hermes-web-ui
- **官方仓库**: https://github.com/EKKOLearnAI/hermes-web-ui
- **Hermes Agent**: https://github.com/nicepkg/hermes

## 更新日志

### 2026-05-27
- 添加 UI 字体层级优化
- 实现关联会话功能（Phase 3）
- 创建版本管理文档和同步脚本

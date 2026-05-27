#!/bin/bash
# Hermes Web UI Fork 同步脚本
# 用法: ./sync-upstream.sh [--force]

set -e

cd "$(dirname "$0")"

echo "=== Hermes Web UI Fork 同步 ==="
echo ""

# 检查远程仓库
echo "1. 检查远程仓库..."
if ! git remote get-url upstream > /dev/null 2>&1; then
    echo "❌ 未配置 upstream 远程仓库"
    echo "   请先运行: git remote add upstream https://github.com/EKKOLearnAI/hermes-web-ui.git"
    exit 1
fi

echo "   origin: $(git remote get-url origin)"
echo "   upstream: $(git remote get-url upstream)"
echo ""

# 获取最新代码
echo "2. 获取最新代码..."
git fetch upstream
git fetch origin
echo ""

# 检查本地分支
CURRENT_BRANCH=$(git branch --show-current)
echo "3. 当前分支: $CURRENT_BRANCH"
echo ""

# 检查是否有未提交的更改
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️  检测到未提交的更改:"
    git status --short
    echo ""
    read -p "是否暂存这些更改? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -m "sync-upstream: auto-stash $(date +%Y%m%d-%H%M%S)"
        echo "✅ 已暂存更改"
    else
        echo "❌ 请先提交或暂存更改后再同步"
        exit 1
    fi
fi

# Rebase onto upstream/main
echo "4. Rebase onto upstream/main..."
if git rebase upstream/main; then
    echo "✅ Rebase 成功"
else
    echo "❌ Rebase 失败，可能存在冲突"
    echo "   请手动解决冲突后运行: git rebase --continue"
    echo "   或放弃 rebase: git rebase --abort"
    exit 1
fi
echo ""

# 恢复暂存的更改
if git stash list | grep -q "sync-upstream: auto-stash"; then
    echo "5. 恢复暂存的更改..."
    git stash pop
    echo "✅ 已恢复更改"
fi
echo ""

# 推送到 origin
echo "6. 推送到 origin..."
if [[ "$1" == "--force" ]]; then
    git push --force-with-lease origin "$CURRENT_BRANCH"
else
    git push origin "$CURRENT_BRANCH"
fi
echo ""

echo "=== 同步完成 ==="
echo ""
echo "当前状态:"
git log --oneline -5
echo ""
echo "下一步:"
echo "  - 如果有冲突，解决后运行: git rebase --continue"
echo "  - 构建测试: PATH=\"\$HOME/.local/node-v23/bin:\$PATH\" npm run build"
echo "  - 部署: cp dist 到 ~/.local/node-v23/lib/node_modules/hermes-web-ui/dist/"

#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Prisma：清空当前 DATABASE_URL 指向的 MySQL 库，按 migrations 全量重建并可选 seed
# Prisma: drop & recreate DB from migrations, then optional seed (test data OK)
#
# 用法 Usage:
#   cd backend-api
#   ./scripts/prisma-fresh-mysql.sh              # 交互确认 / interactive confirm
#   ./scripts/prisma-fresh-mysql.sh --yes        # 跳过确认（仅测试库）/ no prompt (test DB only)
#   SKIP_SEED=1 ./scripts/prisma-fresh-mysql.sh --yes   # 不跑 seed
#
# 需要 Requires: Node.js, npm, backend-api/.env 中有效的 DATABASE_URL
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "错误: 未找到 $ROOT_DIR/.env（请先配置 DATABASE_URL）"
  echo "Error: missing .env (set DATABASE_URL first)"
  exit 1
fi

if ! command -v npx &>/dev/null; then
  echo "错误: 未找到 npx，请先安装 Node.js"
  exit 1
fi

echo "=========================================="
echo "警告: 将删除并重建当前 DATABASE_URL 中的数据库（不可恢复）"
echo "WARN: This will DROP and recreate the database from DATABASE_URL."
echo "=========================================="
if [[ "${1:-}" != "--yes" && "${1:-}" != "-y" ]]; then
  read -r -p "确认继续? [y/N] " confirm
  if [[ ! "${confirm:-}" =~ ^[yY]$ ]]; then
    echo "已取消."
    exit 0
  fi
fi

echo ">>> prisma migrate reset --force"
npx prisma migrate reset --force --skip-seed

if [[ "${SKIP_SEED:-0}" != "1" ]]; then
  echo ">>> npm run seed"
  npm run seed
else
  echo ">>> SKIP_SEED=1，跳过 seed"
fi

echo ">>> prisma migrate status"
npx prisma migrate status

echo "完成。Done."

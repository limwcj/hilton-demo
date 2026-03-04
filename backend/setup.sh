#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v pnpm &>/dev/null; then
  echo "⚠️  pnpm not found, trying to enable via corepack..."
  if command -v corepack &>/dev/null; then
    corepack enable
    corepack prepare pnpm@latest --activate
  else
    echo "❌ Neither pnpm nor corepack found. Install pnpm: npm install -g pnpm"
    exit 1
  fi
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "📄 Created .env from .env.example"
fi

echo "📦 Installing backend dependencies..."
pnpm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🚀 Starting backend (dev mode)..."
exec pnpm start:dev

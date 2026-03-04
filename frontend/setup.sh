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

echo "📦 Installing frontend dependencies..."
pnpm install

echo "🚀 Starting frontend (dev mode)..."
exec pnpm dev

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Pre-flight checks ────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌ $1 is required but not installed."
    exit 1
  fi
}

check_cmd docker
check_cmd node

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
echo "✅ Using pnpm $(pnpm --version)"

# ── 1. Start MongoDB ─────────────────────────────────────────────────
echo "🐳 Starting MongoDB via Docker Compose..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d mongo

echo "⏳ Waiting for MongoDB to be ready..."
for i in $(seq 1 30); do
  if docker exec mongofordemo mongosh --quiet --eval "db.runCommand({ ping: 1 })" &>/dev/null; then
    echo "✅ MongoDB is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ MongoDB failed to start within 30 seconds."
    exit 1
  fi
  sleep 1
done

# ── 2. Initialize replica set (idempotent) ───────────────────────────
echo "🔗 Initializing MongoDB replica set..."
docker exec mongofordemo mongosh --quiet --eval '
  try {
    rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] });
    print("Replica set initiated with localhost.");
  } catch(e) {
    if (e.codeName === "AlreadyInitialized") {
      const member = rs.conf().members[0].host;
      if (member !== "localhost:27017") {
        const cfg = rs.conf();
        cfg.members[0].host = "localhost:27017";
        cfg.version++;
        rs.reconfig(cfg, { force: true });
        print("Replica set reconfigured to use localhost:27017.");
      } else {
        print("Replica set already initialized correctly.");
      }
    } else {
      print("rs.initiate error: " + e.message);
    }
  }
'

echo "⏳ Waiting for replica set primary..."
for i in $(seq 1 15); do
  if docker exec mongofordemo mongosh --quiet --eval "rs.status().myState" 2>/dev/null | grep -q "1"; then
    echo "✅ Replica set primary is ready."
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "⚠️  Replica set primary election taking longer than expected, continuing..."
  fi
  sleep 1
done

# ── 3. Backend setup ─────────────────────────────────────────────────
echo ""
echo "📦 Setting up backend..."
cd "$ROOT_DIR/backend"

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "📄 Created backend/.env from .env.example"
fi

pnpm install
npx prisma generate

# ── 4. Frontend setup ────────────────────────────────────────────────
echo ""
echo "📦 Setting up frontend..."
cd "$ROOT_DIR/frontend"
pnpm install

# ── 5. Launch backend & frontend ─────────────────────────────────────
echo ""
echo "🚀 Starting backend (NestJS) and frontend (Vite) ..."

cd "$ROOT_DIR/backend"
pnpm start:dev &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
pnpm dev &
FRONTEND_PID=$!

# ── Graceful shutdown ─────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "👋 Done."
}
trap cleanup INT TERM

echo ""
echo "==========================================="
echo "  Backend  → http://localhost:3000"
echo "  GraphQL  → http://localhost:3000/graphql"
echo "  Frontend → http://localhost:4173"
echo "==========================================="
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

wait

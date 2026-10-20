#!/bin/bash
# BuildVault deploy script (run on the VPS as root)
# Usage: ./deploy.sh
# Flow: refuse if dirty -> pull main -> back up DB -> install deps if lockfiles changed
#       -> build frontend -> restart service -> health check.

set -euo pipefail

BEFORE="${DEPLOY_BEFORE:-}"
rollback_hint() {
  echo "❌ Deploy stopped at line $1."
  if [ -n "$BEFORE" ]; then
    echo "   To roll back the code: cd $REPO && git reset --hard $BEFORE && (cd frontend && npm run build) && systemctl restart buildvault"
  fi
  echo "   Database backups: $BACKUP_DIR"
}
trap 'rollback_hint $LINENO' ERR

REPO="/root/.openclaw/workspace/buildvault"
DB="$REPO/backend/buildvault.db"
BACKUP_DIR="$REPO/backend/db_backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

cd "$REPO"

# 0. The backend must run as the systemd service; check before changing anything.
if ! systemctl cat buildvault.service >/dev/null 2>&1; then
  echo "❌ systemd service 'buildvault' is not installed, so the new code could not be restarted."
  echo "   Nothing was changed. Set it up first (README: 'One-time service setup'), then run ./deploy.sh again."
  exit 1
fi

# 1. Abort if working tree is dirty (server edits must be committed first)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree is dirty. Commit or stash changes before deploying."
  exit 1
fi

# 2. Pull latest from GitHub (fast-forward only)
if [ -z "${DEPLOY_BEFORE:-}" ]; then
  BEFORE=$(git rev-parse HEAD)
  echo "⬇️  Pulling latest from GitHub..."
  git pull --ff-only origin main
  # bash keeps reading the copy of this script it started with; if the pull changed it,
  # restart with the new version (remembering where we came from).
  if ! git diff --quiet "$BEFORE" HEAD -- deploy.sh; then
    echo "🔁 deploy.sh changed, re-running the new version..."
    DEPLOY_BEFORE="$BEFORE" exec bash "$REPO/deploy.sh"
  fi
fi
AFTER=$(git rev-parse HEAD)

# 3. Back up the DB with SQLite's online backup (safe while the app is running), keep newest 20
mkdir -p "$BACKUP_DIR"
if [ -f "$DB" ]; then
  (cd backend && node -e "require('better-sqlite3')('$DB',{readonly:true}).backup('$BACKUP_DIR/buildvault_$TIMESTAMP.db').then(()=>console.log('✅ DB backed up → db_backups/buildvault_$TIMESTAMP.db'))")
  ls -t "$BACKUP_DIR"/buildvault_*.db | tail -n +21 | xargs -r rm --
fi

# 4. Install dependencies only when a lockfile changed. 'npm install' updates node_modules in place
#    (npm ci would delete it first, under the running app).
changed() { [ "$BEFORE" != "$AFTER" ] && ! git diff --quiet "$BEFORE" "$AFTER" -- "$1"; }
if changed backend/package-lock.json; then echo "📦 Backend deps changed, installing..."; (cd backend && npm install --omit=dev --no-audit --no-fund); fi
if changed frontend/package-lock.json; then echo "📦 Frontend deps changed, installing..."; (cd frontend && npm install --no-audit --no-fund); fi

# 5. Build frontend
echo "🔨 Building frontend..."
(cd frontend && npm run build)

# 6. Restart backend as the systemd service. A node process started some other way (by hand or by
#    an agent) would keep holding port 3001 and the new code would never run, so stop it first.
echo "🔄 Restarting backend..."
SERVICE_PID=$(systemctl show -p MainPID --value buildvault || echo 0)
PORT_PID=$(ss -tlnpH 'sport = :3001' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "${PORT_PID:-}" ] && [ "$PORT_PID" != "$SERVICE_PID" ]; then
  echo "   Stopping stray node process $PORT_PID on :3001"
  kill "$PORT_PID" || true
  sleep 1
fi
systemctl restart buildvault

# 7. Health check: the running process must report the commit we just deployed
sleep 2
LIVE=$(curl -fsS http://127.0.0.1:3001/api/health | grep -oP '"version":"\K[^"]+' || echo none)
if [ "$LIVE" = "$AFTER" ] && curl -fsS https://mazhagarage.cloud/api/projects/public >/dev/null; then
  echo "🚀 Done! $(git log --oneline -1) is live at https://mazhagarage.cloud"
else
  echo "⚠️  Health check failed (running version: $LIVE, expected: $AFTER)."
  rollback_hint $LINENO
  exit 1
fi

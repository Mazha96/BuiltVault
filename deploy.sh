#!/bin/bash
# BuildVault deploy script (run on the VPS as root)
# Usage: ./deploy.sh
# Flow: refuse if dirty -> pull main -> back up DB -> install deps if lockfiles changed
#       -> build frontend -> restart service -> health check.

set -euo pipefail

REPO="/root/.openclaw/workspace/buildvault"
DB="$REPO/backend/buildvault.db"
BACKUP_DIR="$REPO/backend/db_backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

cd "$REPO"

# 1. Abort if working tree is dirty (server edits must be committed first)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree is dirty. Commit or stash changes before deploying."
  exit 1
fi

# 2. Pull latest from GitHub (fast-forward only)
BEFORE=$(git rev-parse HEAD)
echo "⬇️  Pulling latest from GitHub..."
git pull --ff-only origin main
AFTER=$(git rev-parse HEAD)

# 3. Back up the DB with SQLite's online backup (safe while the app is running), keep newest 20
mkdir -p "$BACKUP_DIR"
if [ -f "$DB" ]; then
  (cd backend && node -e "require('better-sqlite3')('$DB',{readonly:true}).backup('$BACKUP_DIR/buildvault_$TIMESTAMP.db').then(()=>console.log('✅ DB backed up → db_backups/buildvault_$TIMESTAMP.db'))")
  ls -t "$BACKUP_DIR"/buildvault_*.db | tail -n +21 | xargs -r rm --
fi

# 4. Install dependencies only when a lockfile changed
changed() { [ "$BEFORE" != "$AFTER" ] && git diff --name-only "$BEFORE" "$AFTER" | grep -qx "$1"; }
if changed backend/package-lock.json; then echo "📦 Backend deps changed, installing..."; (cd backend && npm ci --omit=dev); fi
if changed frontend/package-lock.json; then echo "📦 Frontend deps changed, installing..."; (cd frontend && npm ci); fi

# 5. Build frontend
echo "🔨 Building frontend..."
(cd frontend && npm run build)

# 6. Restart backend (systemd service; falls back to pm2 if the service isn't installed)
echo "🔄 Restarting backend..."
if systemctl list-unit-files buildvault.service >/dev/null 2>&1 && systemctl cat buildvault.service >/dev/null 2>&1; then
  systemctl restart buildvault
else
  pm2 restart buildvault
fi

# 7. Health check
sleep 2
if curl -fsS http://127.0.0.1:3001/api/health >/dev/null && curl -fsS https://mazhagarage.cloud/api/projects/public >/dev/null; then
  echo "🚀 Done! $(git log --oneline -1) is live at https://mazhagarage.cloud"
else
  echo "⚠️  Health check failed. To roll back the code:"
  echo "    cd $REPO && git reset --hard $BEFORE && (cd frontend && npm run build) && systemctl restart buildvault"
  echo "    DB backup from just before this deploy: $BACKUP_DIR/buildvault_$TIMESTAMP.db"
  exit 1
fi

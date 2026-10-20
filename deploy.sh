#!/bin/bash
# BuildVault deploy script
# Usage: ./deploy.sh "commit message"

set -e

REPO="/root/.openclaw/workspace/buildvault"
DB="$REPO/backend/buildvault.db"
BACKUP_DIR="$REPO/backend/db_backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
MSG="${1:-auto: deploy $(date '+%Y-%m-%d %H:%M')}"

cd "$REPO"

# 1. Abort if working tree is dirty
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree is dirty. Commit or stash changes before deploying."
  exit 1
fi

# 2. Pull latest from GitHub (fast-forward only)
echo "⬇️  Pulling latest from GitHub..."
git pull --ff-only origin main

# 3. Backup DB (keep newest 20 only)
mkdir -p "$BACKUP_DIR"
if [ -f "$DB" ]; then
  cp "$DB" "$BACKUP_DIR/buildvault_$TIMESTAMP.db"
  echo "✅ DB backed up → db_backups/buildvault_$TIMESTAMP.db"
  # Prune: keep only the 20 newest backups
  ls -t "$BACKUP_DIR"/buildvault_*.db | tail -n +21 | xargs -r rm --
  echo "🗂️  Backups pruned to 20 newest"
fi

# 4. Build frontend
echo "🔨 Building frontend..."
cd "$REPO/frontend" && npm run build
cd "$REPO"

# 5. Restart backend
echo "🔄 Restarting backend..."
pm2 restart buildvault

echo "🚀 Done! Live at https://mazhagarage.cloud"

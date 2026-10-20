#!/bin/bash
# BuildVault deploy script
# Usage: ./deploy.sh "commit message"
# Backs up DB, builds frontend, restarts backend, commits and pushes to GitHub

set -e

REPO="/root/.openclaw/workspace/buildvault"
DB="$REPO/backend/buildvault.db"
BACKUP_DIR="$REPO/backend/db_backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
MSG="${1:-auto: deploy $(date '+%Y-%m-%d %H:%M')}"

cd "$REPO"

# 1. Backup DB
mkdir -p "$BACKUP_DIR"
if [ -f "$DB" ]; then
  cp "$DB" "$BACKUP_DIR/buildvault_$TIMESTAMP.db"
  echo "✅ DB backed up → db_backups/buildvault_$TIMESTAMP.db"
fi

# 2. Build frontend
echo "🔨 Building frontend..."
cd "$REPO/frontend" && npm run build
cd "$REPO"

# 3. Restart backend
echo "🔄 Restarting backend..."
pm2 restart buildvault

# 4. Commit and push
echo "📦 Committing and pushing..."
git add -A
git diff --cached --quiet && echo "ℹ️  Nothing new to commit" || git commit -m "$MSG"
git push origin main

echo "🚀 Done! Live at https://mazhagarage.cloud"

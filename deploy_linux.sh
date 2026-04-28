#!/bin/bash

# ==============================================================================
# Vee Production Deployment Script (Server-Side) - V3 (Bulletproof)
# ==============================================================================

set -e

# Configuration
APP_NAME="vee-app"
WORKER_APP_NAME="vee-whatsapp-worker"
BACKEND_PORT=3001
LOG_FILE="deploy_output.log"
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    local message="$1"
    local level="${2:-INFO}"
    local color="$NC"
    case "$level" in
        "INFO") color="$BLUE" ;;
        "SUCCESS") color="$GREEN" ;;
        "WARN") color="$YELLOW" ;;
        "ERROR") color="$RED" ;;
    esac
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message${NC}" | tee -a "$LOG_FILE"
}

log "Starting Deployment V3 (SCORCHED EARTH)..." "INFO"

# 1. Source NVM
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm use 22 || nvm install 22
fi

# 2. Strong Git Sync
log "Forcefully resetting code to origin/main..."
git fetch origin main
git reset --hard origin/main
log "Git Sync COMPLETE." "SUCCESS"

# 3. Process Cleanup
log "Killing all existing Node/PM2 processes on ports 3001 and 5000..."
sudo fuser -k 3001/tcp > /dev/null 2>&1 || true
sudo fuser -k 5000/tcp > /dev/null 2>&1 || true
pm2 delete all > /dev/null 2>&1 || true
log "Cleanup COMPLETE." "SUCCESS"

# 4. Frontend Setup
log "Processing Frontend..."
cd "$FRONTEND_DIR"
if ! npm install -s; then
    log "Frontend npm install FAILED!" "ERROR"
    exit 1
fi

if ! npm run build > ../frontend_build.log 2>&1; then
    log "Frontend build FAILED! Showing last 30 lines of build log:" "ERROR"
    tail -n 30 ../frontend_build.log
    exit 1
fi
cd ..

# 5. Backend Setup
log "Processing Backend..."
cd "$BACKEND_DIR"
if ! npm install -s; then
    log "Backend npm install FAILED!" "ERROR"
    exit 1
fi

if ! npm rebuild better-sqlite3 > ../backend_rebuild.log 2>&1; then
    log "Backend rebuild FAILED! Showing rebuild log:" "ERROR"
    cat ../backend_rebuild.log
    exit 1
fi
cd ..

# 6. PM2 Start (With explicit CWD and ENV)
log "Starting PM2 processes..."
pm2 start "backend/server.js" --name "$APP_NAME" --cwd "$(pwd)" --update-env
pm2 start "backend/whatsapp-worker.js" --name "$WORKER_APP_NAME" --cwd "$(pwd)"
pm2 save > /dev/null

# 7. Final Verification
log "Checking process status..."
sleep 5
pm2 status

# Health check
if curl -s -I http://localhost:3001/today | grep -q "200 OK"; then
    log "HEALTH CHECK PASSED (Port 3001 /today)" "SUCCESS"
else
    log "HEALTH CHECK FAILED (Port 3001 /today)" "ERROR"
    log "Checking log for clue..." "WARN"
    pm2 logs "$APP_NAME" --lines 5 --no-colors
fi

log "DEPLOYMENT COMPLETE V3" "SUCCESS"

#!/bin/bash

# ==============================================================================
# Vee Production Deployment Script (Server-Side) - V2 (Robust)
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

error_exit() {
    log "$1" "ERROR"
    exit 1
}

log "Starting Deployment V2..." "INFO"

# 1. Source NVM
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm use 22 || nvm install 22
fi

# 2. Strong Git Sync (Reset to remote)
log "Syncing with GitHub (Resetting to HEAD)..."
git fetch origin main
git reset --hard origin/main || error_exit "Git reset failed"
log "GitHub synchronization complete." "SUCCESS"

# 3. Process Cleanup (Port 3001)
log "Cleaning up any existing processes on port $BACKEND_PORT..."
# Kill any node process using the backend port, even if not managed by PM2
sudo fuser -k $BACKEND_PORT/tcp > /dev/null 2>&1 || log "No process found on port $BACKEND_PORT, skipping kill." "WARN"
pm2 delete "$APP_NAME" > /dev/null 2>&1 || true

# 4. Frontend Setup & Build
log "Processing Frontend..."
cd "$FRONTEND_DIR"
npm install -s
npm run build > ../frontend_build.log 2>&1 || error_exit "Vite build failed (check frontend_build.log)"
cd ..
log "Frontend built." "SUCCESS"

# 5. Backend Setup
log "Processing Backend..."
cd "$BACKEND_DIR"
npm install -s
npm rebuild better-sqlite3 > /dev/null 2>&1 || error_exit "Native module rebuild failed"
cd ..

# 6. PM2 Start
log "Starting PM2 processes..."
# Use absolute path to ensure correct cwd
pm2 start "$BACKEND_DIR/server.js" --name "$APP_NAME" --update-env || error_exit "Failed to start $APP_NAME"
pm2 delete "$WORKER_APP_NAME" > /dev/null 2>&1 || true
pm2 start "$BACKEND_DIR/whatsapp-worker.js" --name "$WORKER_APP_NAME" || error_exit "Failed to start WhatsApp Worker"
pm2 save > /dev/null

# 7. Health Check
log "Final Health Check..."
sleep 3
# Ping the app on the proxy port (the backend port)
if curl -s http://localhost:$BACKEND_PORT/api/users/3/ping -X POST > /dev/null; then
    log "API Health Check: 200 OK" "SUCCESS"
else
    log "API Health Check: FAILED" "ERROR"
fi

# Test SPA route (should return HTML, not 404)
if curl -s -I http://localhost:$BACKEND_PORT/today | grep -q "200 OK"; then
    log "SPA Route Check (/today): 200 OK" "SUCCESS"
else
    log "SPA Route Check (/today): FAILED (Still 404?)" "ERROR"
fi

log "DEPLOYMENT COMPLETE" "SUCCESS"
pm2 status "$APP_NAME"

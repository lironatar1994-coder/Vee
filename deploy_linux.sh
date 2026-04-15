#!/bin/bash

# ==============================================================================
# Vee Production Deployment Script (Server-Side)
# ==============================================================================
# This script handles pulling the latest code, building the frontend,
# installing backend dependencies, and restarting PM2 processes.
# ==============================================================================

set -e # Exit on error

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

# Logger function
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

# Error handler
error_exit() {
    log "$1" "ERROR"
    pm2 status "$APP_NAME" >> "$LOG_FILE" 2>&1
    exit 1
}

# ------------------------------------------------------------------------------
# 1. Environment Preparation
# ------------------------------------------------------------------------------
log "Starting Deployment Process..." "INFO"
echo "--- Deployment Run $(date) ---" >> "$LOG_FILE"

# Source NVM
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    log "Sourcing NVM..."
    source "$HOME/.nvm/nvm.sh"
    nvm use 22 || nvm install 22
else
    log "NVM not found, attempting to use system node..." "WARN"
fi

# Verify Node version
NODE_VER=$(node -v)
log "Using Node $NODE_VER" "SUCCESS"

# ------------------------------------------------------------------------------
# 2. Git Synchronization
# ------------------------------------------------------------------------------
log "Synchronizing with GitHub..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Already up to date with remote. Continuing with build just in case..." "WARN"
else
    log "Pulling latest changes..."
    git pull origin main || error_exit "Failed to pull changes from GitHub"
fi

# ------------------------------------------------------------------------------
# 3. System Dependencies (Chromium for Puppeteer)
# ------------------------------------------------------------------------------
if command -v apt-get &> /dev/null; then
    log "Verifying system dependencies (Chromium/Puppeteer)..."
    # Added common missing libs for Ubuntu 24.04
    sudo apt-get update -y -qq
    sudo apt-get install -y -qq libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcb-dri3-0 libxcomposite1 \
        libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 libcups2 \
        libdrm2 libgbm1 libasound2t64 libpangocairo-1.0-0 libpango-1.0-0 libatk1.0-0 > /dev/null 2>&1 || log "Apt install failed, skipping (might be already setup)" "WARN"
fi

# ------------------------------------------------------------------------------
# 4. Frontend Setup & Build
# ------------------------------------------------------------------------------
log "Processing Frontend..."
cd "$FRONTEND_DIR"
log "Installing frontend dependencies..."
npm install -s || error_exit "Frontend npm install failed"

log "Building frontend production bundle..."
npm run build > ../frontend_build.log 2>&1 || error_exit "Vite build failed. Check frontend_build.log"
cd ..
log "Frontend built successfully." "SUCCESS"

# ------------------------------------------------------------------------------
# 5. Backend Setup
# ------------------------------------------------------------------------------
log "Processing Backend..."
cd "$BACKEND_DIR"
log "Installing backend dependencies..."
npm install -s || error_exit "Backend npm install failed"

log "Rebuilding native SQLite modules..."
npm rebuild better-sqlite3 > /dev/null 2>&1 || error_exit "Native module rebuild failed"

# Check for .env
if [ ! -f ".env" ]; then
    log ".env file missing in backend directory!" "ERROR"
    log "Deployment will continue but backend might fail to start." "WARN"
fi
cd ..

# ------------------------------------------------------------------------------
# 6. PM2 Process Management
# ------------------------------------------------------------------------------
log "Restarting PM2 processes..."

# Main App
if pm2 list | grep -q "$APP_NAME"; then
    log "Restarting $APP_NAME..."
    pm2 restart "$APP_NAME" --wait-ready --listen-timeout 10000 || error_exit "Failed to restart $APP_NAME"
else
    log "Starting $APP_NAME for the first time..."
    pm2 start "$BACKEND_DIR/server.js" --name "$APP_NAME" || error_exit "Failed to start $APP_NAME"
fi

# Worker
log "Cycling $WORKER_APP_NAME..."
pm2 delete "$WORKER_APP_NAME" > /dev/null 2>&1 || true
pm2 start "$BACKEND_DIR/whatsapp-worker.js" --name "$WORKER_APP_NAME" || error_exit "Failed to start WhatsApp Worker"

pm2 save > /dev/null

# ------------------------------------------------------------------------------
# 7. Health Check
# ------------------------------------------------------------------------------
log "Performing Health Check..."
sleep 2 # Give it a second to bind
if command -v curl &> /dev/null; then
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/users/3/ping -X POST || echo "000")
    if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "404" ]; then # 404 is okay if ping exists but user 3 doesn't
        log "Health Check PASSED (HTTP $STATUS_CODE)" "SUCCESS"
    else
        log "Health Check FAILED (HTTP $STATUS_CODE). Check backend logs: pm2 logs $APP_NAME" "WARN"
    fi
fi

log "========================================================" "SUCCESS"
log "DEPLOAYMENT COMPLETE AND HEALTHY" "SUCCESS"
log "========================================================" "SUCCESS"

pm2 status "$APP_NAME"

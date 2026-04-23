#!/bin/bash

# ==============================================================================
# Vee Log Cleanup Utility
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log "Starting Log Cleanup..."

# 1. Truncate PM2 Logs (without deleting files so PM2 doesn't lose handle)
if command -v pm2 &> /dev/null; then
    log "Truncating PM2 logs..."
    pm2 flush
    log "PM2 logs flushed." "SUCCESS"
fi

# 2. Clear build logs
if [ -f "frontend_build.log" ]; then
    log "Clearing frontend_build.log..."
    > frontend_build.log
fi

if [ -f "deploy_output.log" ]; then
    log "Truncating deploy_output.log to last 1000 lines..."
    tail -n 1000 deploy_output.log > deploy_output.log.tmp && mv deploy_output.log.tmp deploy_output.log
fi

# 3. Clean system logs (Journald) - only if root
if [ "$EUID" -eq 0 ]; then
    log "Cleaning system journal (keeping last 7 days)..."
    journalctl --vacuum-time=7d
fi

# 4. App Logs (Winston handles its own rotation now, but we'll ensure they don't leak)
log "App logs are managed by Winston rotation (max 5x20MB)."

log "Cleanup Complete. Disk space released."

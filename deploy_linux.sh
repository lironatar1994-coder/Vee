#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting deployment process for Vee...${NC}"

# 0. Check for Puppeteer/Chromium dependencies (Common issue on headless servers)
if command -v apt-get &> /dev/null; then
    echo -e "${BLUE}Checking for system dependencies (Chromium)...${NC}"
    # Minimal set for headless chrome, updated for Ubuntu 24.04 compatibility
    sudo apt-get update -y && sudo apt-get install -y libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcb-dri3-0 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 libcups2 libdrm2 libgbm1 libasound2t64 libpangocairo-1.0-0 libpango-1.0-0 libatk1.0-0
fi

# Source NVM to ensure we use the correct Node version
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm use 22 || nvm install 22
else
    echo -e "${RED}Error: NVM not found. Please install NVM or ensure Node 22 is in PATH.${NC}"
fi

# 1. Check for Node.js and npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}Using Node $(node -v)${NC}"

# 2. Check for PM2, install globally if not present
if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}Installing PM2 globally...${NC}"
    npm install -g pm2
    echo -e "${GREEN}PM2 installed.${NC}"
fi

# 3. Setup Frontend
echo -e "${BLUE}Setting up Frontend...${NC}"
cd frontend
# Use npm install safely
npm install
echo -e "${BLUE}Building Frontend...${NC}"
npm run build
cd ..
echo -e "${GREEN}Frontend build complete.${NC}"

# 4. Setup Backend
echo -e "${BLUE}Setting up Backend...${NC}"
cd backend
npm install
cd ..
echo -e "${GREEN}Backend dependencies installed.${NC}"

# 5. Start/Restart with PM2
echo -e "${BLUE}Updating application with PM2...${NC}"
APP_NAME="vee-app"
ENTRY_POINT="backend/server.js"

# Check if app is already running
if pm2 list | grep -q "$APP_NAME"; then
    echo -e "${BLUE}Restarting existing process '$APP_NAME'...${NC}"
    pm2 restart "$APP_NAME"
else
    echo -e "${BLUE}Starting new process '$APP_NAME'...${NC}"
    pm2 start "$ENTRY_POINT" --name "$APP_NAME"
fi

WORKER_APP_NAME="vee-whatsapp-worker"
WORKER_ENTRY_POINT="backend/whatsapp-worker.js"

if pm2 list | grep -q "$WORKER_APP_NAME"; then
    echo -e "${BLUE}Restarting existing worker process '$WORKER_APP_NAME'...${NC}"
    pm2 restart "$WORKER_APP_NAME"
else
    echo -e "${BLUE}Starting new worker process '$WORKER_APP_NAME'...${NC}"
    pm2 start "$WORKER_ENTRY_POINT" --name "$WORKER_APP_NAME"
fi

# 6. Final Sync
echo -e "${BLUE}Saving PM2 configuration...${NC}"
pm2 save

echo -e "--------------------------------------------------------"
echo -e "${GREEN}Deployment finished! Application is now healthy.${NC}"
pm2 status "$APP_NAME"
echo -e "--------------------------------------------------------"

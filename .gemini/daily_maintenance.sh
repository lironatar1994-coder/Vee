#!/bin/bash
# Daily Maintenance Script for Vee Server

echo "Starting Maintenance - $(date)"

# 1. Clear npm cache
npm cache clean --force

# 2. Clear old Puppeteer/Chromium versions (older than 7 days)
if [ -d /root/.cache/puppeteer ]; then
    echo "Cleaning Puppeteer cache..."
    find /root/.cache/puppeteer -mindepth 1 -maxdepth 1 -mtime +7 -exec rm -rf {} \;
fi

# 3. Vacuum system logs (keep last 2 days only)
echo "Vacuuming system logs..."
journalctl --vacuum-time=2d

# 4. Clean apt cache
echo "Cleaning apt cache..."
apt-get clean

# 5. Clean up old build logs
echo "Cleaning old build logs..."
rm -f /root/Vee/frontend_build.log

echo "Maintenance Complete - $(date)"

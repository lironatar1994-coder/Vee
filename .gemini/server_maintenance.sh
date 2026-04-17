#!/bin/bash

# Configuration
LOG_FILE="/var/log/server_maintenance.log"
EMAIL="lironatar94@gmail.com"
RESEND_KEY=$(grep RESEND_API_KEY /root/Vee/backend/.env | cut -d '=' -f2 | tr -d '\r')

# Init log
echo "--- Server Maintenance Started at $(date) ---" > $LOG_FILE

# 1. System Logs
echo -e "\n1. Vacuuming journalctl (keep last 2 days)..." >> $LOG_FILE
journalctl --vacuum-time=2d >> $LOG_FILE 2>&1

# 2. PM2 Logs
echo -e "\n2. Flushing PM2 logs..." >> $LOG_FILE
/usr/bin/pm2 flush >> $LOG_FILE 2>&1

# 3. APT Cache
echo -e "\n3. Cleaning apt cache and autoremove..." >> $LOG_FILE
apt-get clean >> $LOG_FILE 2>&1
DEBIAN_FRONTEND=noninteractive apt-get autoremove -y >> $LOG_FILE 2>&1

# 4. NPM Cache
echo -e "\n4. Cleaning NPM cache..." >> $LOG_FILE
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm cache clean --force >> $LOG_FILE 2>&1

# 5. Puppeteer Cache
echo -e "\n5. Cleaning old Puppeteer/Chromium versions (older than 7 days)..." >> $LOG_FILE
if [ -d /root/.cache/puppeteer ]; then
    find /root/.cache/puppeteer -mindepth 1 -maxdepth 1 -mtime +7 -exec rm -rf {} \; >> $LOG_FILE 2>&1
fi

# 6. Disk Space
echo -e "\n6. Final Disk Space:" >> $LOG_FILE
df -h / >> $LOG_FILE 2>&1

echo -e "\n--- Server Maintenance Completed at $(date) ---" >> $LOG_FILE

# Email Notification via Resend API
if [ -n "$RESEND_KEY" ]; then
  # Format log for HTML email
  LOG_HTML=$(cat $LOG_FILE | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' | awk '{printf "%s<br>", $0}' | sed 's/"/\\"/g')
  
  curl -s -X POST "https://api.resend.com/emails" \
       -H "Authorization: Bearer $RESEND_KEY" \
       -H "Content-Type: application/json" \
       -d "{
             \"from\": \"Vee Maintenance <onboarding@resend.dev>\",
             \"to\": [\"$EMAIL\"],
             \"subject\": \"Vee Server Maintenance Report\",
             \"html\": \"<div style='font-family: monospace;'><h3>Vee Server Maintenance Report</h3><hr>${LOG_HTML}</div>\"
           }" >> $LOG_FILE 2>&1
else
  echo -e "\nWarning: Resend API Key not found, could not send email." >> $LOG_FILE
fi

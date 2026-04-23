# ==============================================================================
# Vee Deployment Script (Local Windows)
# ==============================================================================

param (
    [string]$Message = "",
    [switch]$SyncEnv
)

$ErrorActionPreference = "Stop"

Write-Host "--- Starting Vee Deployment ---" -ForegroundColor Blue

# 0. Sync .env (Securely move secrets via SCP)
if ($SyncEnv) {
    Write-Host "Syncing .env file to server via secure copy (SCP)..." -ForegroundColor Yellow
    $ENV_SOURCE = "./backend/.env"
    $ENV_DEST = "root@vee-app.co.il:/root/Vee/backend/.env"
    
    if (Test-Path $ENV_SOURCE) {
        scp $ENV_SOURCE $ENV_DEST
        Write-Host "Secrets successfully synchronized." -ForegroundColor Green
    } else {
        Write-Host "Error: Local .env file not found at $ENV_SOURCE" -ForegroundColor Red
        exit 1
    }
}

# 1. Check Git Status
$status = git status --porcelain
if ($status) {
    if (-not $Message) {
        $Message = Read-Host "Changes detected. Enter commit message"
    }
    
    if (-not $Message) {
        Write-Host "Error: Commit message required." -ForegroundColor Red
        exit 1
    }

    Write-Host "Staging and committing changes..." -ForegroundColor Gray
    git add .
    git commit -m "$Message"
} else {
    Write-Host "No local changes to commit. Proceeding with sync..." -ForegroundColor Yellow
}

# 2. Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Gray
git push origin main

# 3. Trigger Remote Deployment
Write-Host "Connecting to server and triggering remote deploy..." -ForegroundColor Blue
$SSH_HOST = "root@vee-app.co.il"
$REMOTE_CMD = "cd /root/Vee && chmod +x deploy_linux.sh && ./deploy_linux.sh"

ssh $SSH_HOST $REMOTE_CMD

if ($LASTEXITCODE -ne 0) {
    Write-Host "--- Deployment FAILED ---" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "--- Deployment Complete ---" -ForegroundColor Green

# ==============================================================================
# Vee Deployment Script (Local Windows) - Enhanced V3
# ==============================================================================

param (
    [string]$Message = "",
    [switch]$SyncEnv,
    [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"

Write-Host "--- Starting Vee Deployment ---" -ForegroundColor Cyan

# 0. Pre-flight Check: SSH Connectivity
if (-not $SkipCheck) {
    Write-Host "Checking server connectivity..." -ForegroundColor Gray
    $SSH_HOST = "root@vee-app.co.il"
    if (-not (Test-Connection -ComputerName "vee-app.co.il" -Count 1 -Quiet)) {
        Write-Host "Error: Could not ping server vee-app.co.il. Check your connection." -ForegroundColor Red
        exit 1
    }
}

# 1. Sync .env (Optional)
if ($SyncEnv) {
    Write-Host "Syncing .env file to server via SCP..." -ForegroundColor Yellow
    $ENV_SOURCE = "./backend/.env"
    $ENV_DEST = "root@vee-app.co.il:/root/Vee/backend/.env"
    
    if (Test-Path $ENV_SOURCE) {
        scp $ENV_SOURCE $ENV_DEST
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: SCP failed to sync .env file." -ForegroundColor Red
            exit 1
        }
        Write-Host "Secrets successfully synchronized." -ForegroundColor Green
    } else {
        Write-Host "Error: Local .env file not found at $ENV_SOURCE" -ForegroundColor Red
        exit 1
    }
}

# 2. Git Workflow
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

# 3. Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Gray
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Git push failed. Please check your credentials or network." -ForegroundColor Red
    exit 1
}

# 4. Trigger Remote Deployment
Write-Host "Connecting to server and triggering remote deploy..." -ForegroundColor Blue
$REMOTE_CMD = "cd /root/Vee && chmod +x deploy_linux.sh && ./deploy_linux.sh"

ssh $SSH_HOST $REMOTE_CMD

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "The remote script exited with error code $LASTEXITCODE." -ForegroundColor Yellow
    Write-Host "Please review the build logs printed above for the specific error." -ForegroundColor Gray
    exit $LASTEXITCODE
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "      DEPLOYMENT COMPLETE SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Visit: http://vee-app.co.il" -ForegroundColor Cyan


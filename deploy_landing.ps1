# ==============================================================================
# Vee Landing Page Deployment Script (Local Windows)
# ==============================================================================

param (
    [string]$Message = "Add Vee landing page",
    [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"

$SSH_HOST = "root@vee-app.co.il"
$SSH_DOMAIN = "vee-app.co.il"
$REMOTE_DIR = "/root/Vee"
$EXPECTED_REMOTE = "github.com/lironatar1994-coder/Vee"

$DEPLOY_PATHS = @(
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/src/App.jsx",
    "frontend/src/components/Login.jsx",
    "frontend/src/components/AppRedirectLoader.jsx",
    "frontend/src/components/AppRedirectLoader.css",
    "frontend/src/pages/Landing.jsx",
    "frontend/src/pages/Landing.css",
    "frontend/src/assets/landing",
    "deploy_landing.ps1"
)

Write-Host "--- Starting Vee Landing Deployment ---" -ForegroundColor Cyan

if (-not $SkipCheck) {
    Write-Host "Checking server connectivity..." -ForegroundColor Gray
    if (-not (Test-Connection -ComputerName $SSH_DOMAIN -Count 1 -Quiet)) {
        Write-Host "Error: Could not ping server $SSH_DOMAIN." -ForegroundColor Red
        exit 1
    }
}

$remoteUrl = git remote get-url origin
if ($remoteUrl -notlike "*$EXPECTED_REMOTE*") {
    Write-Host "Error: origin remote is '$remoteUrl', expected it to contain '$EXPECTED_REMOTE'." -ForegroundColor Red
    exit 1
}

$branch = git branch --show-current
if ($branch -ne "main") {
    Write-Host "Error: deploy must run from main. Current branch: $branch" -ForegroundColor Red
    exit 1
}

Write-Host "Running frontend production build before deploy..." -ForegroundColor Gray
Push-Location "frontend"
npm run build
Pop-Location
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: frontend build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Staging landing-page deployment files only..." -ForegroundColor Gray
git add -- $DEPLOY_PATHS

$staged = git diff --cached --name-only
if ($staged) {
    Write-Host "Creating deployment commit..." -ForegroundColor Gray
    git commit -m "$Message"
} else {
    Write-Host "No landing-page changes staged. Proceeding with remote deploy." -ForegroundColor Yellow
}

Write-Host "Pushing to GitHub..." -ForegroundColor Gray
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Git push failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Connecting to server and triggering remote deploy..." -ForegroundColor Blue
$REMOTE_CMD = "cd $REMOTE_DIR && git remote set-url origin https://github.com/lironatar1994-coder/Vee.git && chmod +x deploy_linux.sh && ./deploy_linux.sh"

ssh $SSH_HOST $REMOTE_CMD
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "The remote script exited with error code $LASTEXITCODE." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "      LANDING DEPLOYMENT COMPLETE SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Visit: https://vee-app.co.il" -ForegroundColor Cyan

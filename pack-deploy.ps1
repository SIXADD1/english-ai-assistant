# CET Writing Tutor - Deploy Package Script
# Usage: .\pack-deploy.ps1

Write-Host "=== Start packaging deploy files ==="

# 1. Build frontend
Write-Host "[1/3] Building frontend..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# 2. Clean unnecessary files
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "dist\assets\*.map"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "ai-service\__pycache__"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "api\node_modules"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "api\uploads"

# 3. Package
Write-Host "[2/3] Packaging to deploy-package.zip..."
if (Test-Path "deploy-package.zip") { Remove-Item "deploy-package.zip" }

Compress-Archive -Path "dist", "api", "ai-service", "migrations", ".env.example" -DestinationPath "deploy-package.zip" -Force

# 4. Restore api deps (for local dev)
Write-Host "[3/3] Restoring local deps..."
cd api; npm install; cd ..

Write-Host ""
Write-Host "=== Packaging complete! ===" -ForegroundColor Green
Write-Host "File: deploy-package.zip"
Write-Host ""
Write-Host "Upload to server, then follow DEPLOY.md."

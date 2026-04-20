# Setup script for diarai project
$ErrorActionPreference = "Stop"

$projectDir = "e:\Project\20260417140811\diarai"
$nodePath = "C:\Users\29490\.workbuddy\binaries\node\versions\20.18.0.installing.14196.__extract_temp__\node-v20.18.0-win-x64"

# Remove old node_modules if exists
if (Test-Path "$projectDir\node_modules") {
    Write-Host "Removing old node_modules..."
    Remove-Item "$projectDir\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Install dependencies
Write-Host "Installing dependencies..."
Set-Location $projectDir
& "$nodePath\npm.cmd" install --registry=https://registry.npmmirror.com 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully!"
    
    # Start dev server
    Write-Host "Starting development server..."
    & "$nodePath\node.exe" "$projectDir\node_modules\next\dist\bin\next" dev -p 3000
} else {
    Write-Host "Installation failed with exit code: $LASTEXITCODE"
}

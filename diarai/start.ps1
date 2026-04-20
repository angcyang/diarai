# DiarAI 启动脚本
$ErrorActionPreference = "Continue"

$projectDir = $PSScriptRoot
$nodePath = "C:\Users\29490\.workbuddy\binaries\node\versions\20.18.0.installing.14196.__extract_temp__\node-v20.18.0-win-x64"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    DiarAI - AI智能日记应用" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectDir

# 清理旧的node_modules
if (Test-Path "node_modules") {
    Write-Host "正在清理旧的依赖..." -ForegroundColor Yellow
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 安装依赖
Write-Host "[1/2] 正在安装依赖（首次需要3-5分钟）..." -ForegroundColor Yellow
& "$nodePath\npm.cmd" install --registry=https://registry.npmmirror.com

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[2/2] 正在启动开发服务器..." -ForegroundColor Green
    Write-Host "请访问: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
    Write-Host ""
    
    & "$nodePath\node.exe" "$projectDir\node_modules\next\dist\bin\next" dev -p 3000
} else {
    Write-Host "安装失败！错误代码: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "请检查网络连接后重试" -ForegroundColor Yellow
    Read-Host "按回车键退出"
}

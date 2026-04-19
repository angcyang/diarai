@echo off
chcp 65001 >nul
title DiarAI - AI日记应用

echo ========================================
echo     DiarAI - AI智能日记应用
echo ========================================
echo.

cd /d "%~dp0"

REM 删除旧的node_modules(如果存在冲突)
if exist "node_modules\.package-lock.json" (
    echo 检测到残留安装文件，正在清理...
    rmdir /s /q node_modules 2>nul
)

REM 安装依赖
echo [1/2] 正在安装依赖（首次需要3-5分钟）...
call "C:\Users\29490\.workbuddy\binaries\node\versions\20.18.0.installing.14196.__extract_temp__\node-v20.18.0-win-x64\npm.cmd" install --registry=https://registry.npmmirror.com

if %errorlevel% neq 0 (
    echo 安装失败！请检查网络连接后重试
    pause
    exit /b 1
)

echo.
echo [2/2] 正在启动开发服务器...
echo 请访问: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

REM 启动开发服务器
call "C:\Users\29490\.workbuddy\binaries\node\versions\20.18.0.installing.14196.__extract_temp__\node-v20.18.0-win-x64\node.exe" node_modules\next\dist\bin\next dev -p 3000

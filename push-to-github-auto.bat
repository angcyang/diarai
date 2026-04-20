@echo off
chcp 65001 >nul
title DiarAI - GitHub 上传脚本

echo ========================================
echo     DiarAI - 准备上传到 GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM 修复Git安全目录问题
git config --global --add safe.directory "%CD%"

REM 检查git是否安装
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Git！
    echo.
    echo 请先安装 Git：
    echo 1. 下载: https://git-scm.com/download/win
    echo 2. 安装时一路下一步即可
    pause
    exit /b 1
)

REM 配置Git用户信息
echo.
echo [配置] 设置 Git 用户信息
git config --global user.email "2949050522@qq.com"
git config --global user.name "angcyang"

REM 检查是否是git仓库
if not exist ".git" (
    echo [1/6] 初始化 Git 仓库...
    git init
    git branch -M main
) else (
    echo [1/6] Git 仓库已存在
    git branch -M main
)

echo.
echo [2/6] 配置远程仓库

REM 检查远程仓库配置
git remote -v 2>nul | findstr "origin" >nul
if %errorlevel% neq 0 (
    git remote add origin https://github.com/angcyang/diarai.git
    echo 远程仓库已添加: https://github.com/angcyang/diarai.git
) else (
    echo 远程仓库已配置
)

echo.
echo [3/6] 确保是 main 分支...
git branch --show-current

echo.
echo [4/6] 添加所有文件...
git add .

echo.
echo [5/6] 提交文件...
git commit -m "Fix Dockerfile for Railway deployment"

echo.
echo [6/6] 推送到 GitHub...
git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo     上传成功！
    echo ========================================
    echo.
    echo 请在 Railway 重新部署！
    echo.
) else (
    echo.
    echo [错误] 上传失败
)

pause

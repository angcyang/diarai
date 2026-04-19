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
    echo [1/5] 初始化 Git 仓库...
    git init
    git branch -M main
) else (
    echo [1/5] Git 仓库已存在
)

echo.
echo [2/5] 配置远程仓库

REM 检查远程仓库配置
git remote -v 2>nul | findstr "origin" >nul
if %errorlevel% neq 0 (
    git remote add origin https://github.com/angcyang/diarai.git
    echo 远程仓库已添加: https://github.com/angcyang/diarai.git
) else (
    echo 远程仓库已配置
)

echo.
echo [3/5] 添加所有文件...
git add .

echo.
echo [4/5] 提交文件...
git commit -m "DiarAI - AI智能日记应用 v1.0"

echo.
echo [5/5] 推送到 GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo     上传成功！
    echo ========================================
    echo.
    echo 下一步：
    echo 1. 打开 https://railway.app
    echo 2. 用 GitHub 登录
    echo 3. 点击 "New Project" -^> "Deploy from GitHub"
    echo 4. 选择 diarai 仓库
    echo.
) else (
    echo.
    echo [错误] 上传失败
)

pause

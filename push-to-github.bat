@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title DiarAI - GitHub 上传脚本

echo ========================================
echo     DiarAI - 准备上传到 GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM 检查git是否安装
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Git！
    echo.
    echo 请先安装 Git：
    echo 1. 下载: https://git-scm.com/download/win
    echo 2. 安装时一路下一步即可
    echo 3. 重新运行此脚本
    pause
    exit /b 1
)

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
    echo.
    set /p GH_USER="请输入你的 GitHub 用户名: "
    
    if "!GH_USER!"=="" (
        echo [错误] 用户名不能为空
        pause
        exit /b 1
    )
    
    echo.
    echo 请先在 GitHub 上创建仓库：
    echo 1. 访问: https://github.com/new
    echo 2. 仓库名称输入: diarai
    echo 3. 不要勾选任何选项
    echo 4. 点击 "Create repository"
    echo.
    echo 创建完成后按任意键继续...
    pause >nul
    
    git remote add origin https://github.com/!GH_USER!/diarai.git
    echo 远程仓库已添加: https://github.com/!GH_USER!/diarai.git
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
    echo [错误] 上传失败，请检查：
    echo 1. 是否在 GitHub 上创建了名为 'diarai' 的仓库
    echo 2. 用户名是否正确
)

pause

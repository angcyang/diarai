# DiarAI - GitHub 上传脚本 (PowerShell版)
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    DiarAI - 上传到 GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectDir = $PSScriptRoot
Set-Location $projectDir

# 检查Git
try {
    $gitVersion = git --version
    Write-Host "[OK] Git 已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 Git！" -ForegroundColor Red
    Write-Host "请先安装 Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 1. 初始化Git仓库
Write-Host ""
Write-Host "[步骤 1/5] 检查 Git 仓库..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "  初始化新仓库..."
    git init
    git branch -M main
    Write-Host "  完成！" -ForegroundColor Green
} else {
    Write-Host "  Git 仓库已存在" -ForegroundColor Gray
}

# 2. 配置远程仓库
Write-Host ""
Write-Host "[步骤 2/5] 配置远程仓库..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>$null

if ($remoteUrl) {
    Write-Host "  远程仓库已存在: $remoteUrl" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  请在 GitHub 上创建仓库：" -ForegroundColor Cyan
    Write-Host "  1. 打开 https://github.com/new" -ForegroundColor White
    Write-Host '  2. Repository name 输入: diarai' -ForegroundColor White
    Write-Host '  3. 不要勾选任何选项' -ForegroundColor White
    Write-Host '  4. 点击 "Create repository"' -ForegroundColor White
    Write-Host ""
    
    $githubUser = ""
    while ([string]::IsNullOrWhiteSpace($githubUser)) {
        $githubUser = Read-Host "请输入你的 GitHub 用户名"
        if ([string]::IsNullOrWhiteSpace($githubUser)) {
            Write-Host "  用户名不能为空！" -ForegroundColor Red
        }
    }
    
    $repoUrl = "https://github.com/$githubUser/diarai.git"
    Write-Host "  添加远程仓库..."
    git remote add origin $repoUrl
    Write-Host "  已添加: $repoUrl" -ForegroundColor Green
}

# 3. 添加文件
Write-Host ""
Write-Host "[步骤 3/5] 添加所有文件..." -ForegroundColor Yellow
git add .

# 4. 提交
Write-Host ""
Write-Host "[步骤 4/5] 提交文件..." -ForegroundColor Yellow
$commitMsg = "DiarAI - AI智能日记应用 v1.0"
git commit -m $commitMsg
Write-Host "  提交完成！" -ForegroundColor Green

# 5. 推送
Write-Host ""
Write-Host "[步骤 5/5] 推送到 GitHub..." -ForegroundColor Yellow
Write-Host "  正在推送..."
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "    上传成功！🎉" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Cyan
    Write-Host "1. 打开 https://railway.app" -ForegroundColor White
    Write-Host "2. 用 GitHub 登录" -ForegroundColor White
    Write-Host '3. 点击 "New Project" -> "Deploy from GitHub"' -ForegroundColor White
    Write-Host "4. 选择 diarai 仓库" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[错误] 上传失败！" -ForegroundColor Red
    Write-Host "请检查：" -ForegroundColor Yellow
    Write-Host "1. 是否在 GitHub 上创建了名为 'diarai' 的仓库" -ForegroundColor White
    Write-Host "2. GitHub 用户名是否正确" -ForegroundColor White
}

Write-Host ""
Read-Host "按回车键退出"

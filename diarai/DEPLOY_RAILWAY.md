# DiarAI on Railway 部署指南

## 部署步骤

### 1. 创建 GitHub 仓库

```bash
# 在 GitHub 上创建新仓库：diarai
# 然后在本地执行：

cd diarai
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/diarai.git
git push -u origin main
```

### 2. 连接 Railway

1. 访问 [Railway](https://railway.app)
2. 使用 GitHub 登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择 `diarai` 仓库

### 3. 配置环境变量

在 Railway 项目设置中添加：

| 变量名 | 值 | 说明 |
|-------|-----|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3000` | 端口 |

### 4. 配置 SQLite 数据目录

在 Railway 项目的 Variables 中添加：

| 变量名 | 值 |
|-------|-----|
| `RAILWAY_VOLUME_MOUNT_PATH` | `/app/data` |

### 5. 部署

点击 "Deploy" 开始部署，Railway 会自动检测 Dockerfile 并构建。

## ⚠️ 重要提示

Railway 免费额度为 **$5/月**，SQLite 数据库会存储在临时文件系统中。升级到付费计划可获得持久化存储。

## 访问应用

部署完成后，Railway 会提供域名，如：`diarai.railway.app`

# DiarAI - AI 日记分析工具

一款面向个人用户的 AI 日记分析工具，支持 AI 引导写作、情感趋势分析、双向标签体系与个性画像生成。

## ✨ 功能特性

- **🤖 AI 引导写作** - 通过对话式引导，深入挖掘你的内心故事
- **😊 情感分析** - 自动识别日记情绪，生成情绪趋势图
- **🏷️ 双向标签体系** - 情感标签（7种）+ 意义标签（5类）
- **📊 个性画像** - 基于日记数据，AI 生成你的性格画像
- **📈 数据可视化** - 情绪折线图、标签分布、热力图等
- **🔒 隐私优先** - 本地 SQLite 存储，无需登录，无云端上传

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0
- npm >= 9.0

### 安装

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API Key
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
npm run build
npm start
```

## 📁 项目结构

```
diarai/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.tsx          # 首页 / 写日记
│   │   ├── diary/            # 日记库
│   │   ├── stats/            # 统计分析
│   │   ├── profile/          # 个性画像
│   │   ├── tags/             # 标签管理
│   │   ├── settings/          # 设置
│   │   └── api/               # API 路由
│   │       ├── diary/         # 日记 CRUD
│   │       ├── tags/          # 标签管理
│   │       ├── stats/         # 统计聚合
│   │       └── ai/            # AI 分析
│   ├── components/
│   │   ├── layout/           # 布局组件
│   │   └── ui/               # UI 基础组件
│   ├── lib/
│   │   ├── db.ts             # SQLite 数据库
│   │   ├── ai.ts             # AI 多模型适配
│   │   └── utils.ts          # 工具函数
│   └── types/
│       └── index.ts           # TypeScript 类型
├── data/                      # SQLite 数据库文件
├── .env.example              # 环境变量示例
└── package.json
```

## 🏷️ 标签体系

### 情感标签（7种）

| 标签 | 色彩 | 描述 |
|-----|-----|------|
| 😊 开心 | 黄色 | 愉悦、喜悦 |
| 😌 平静 | 蓝色 | 淡然、安宁 |
| 😟 焦虑 | 橙色 | 担心、紧张 |
| 😢 悲伤 | 灰蓝 | 低落、伤心 |
| 😤 愤怒 | 红色 | 不满、生气 |
| 🙏 感恩 | 绿色 | 感激、珍惜 |
| 😕 迷芒 | 紫色 | 困惑、不确定 |

### 意义标签（5类）

| 类别 | 图标 | 描述 |
|-----|-----|------|
| 积极 | 🌟 | 成就、正向事件、进步 |
| 日常 | 📅 | 常规生活、习惯记录 |
| 社交 | 👥 | 朋友、家人、人际互动 |
| 反思 | 🪞 | 自我审视、感悟、内省 |
| 挑战 | ⚡ | 困难、压力、成长节点 |

## 🔧 配置说明

### AI API Key 配置

支持三种 AI 提供商：

1. **通义千问**（默认）
   - 获取地址：https://dashscope.console.aliyun.com/
   - 模型推荐：qwen-turbo（快速）或 qwen-plus（标准）

2. **DeepSeek**
   - 获取地址：https://platform.deepseek.com/
   - 模型推荐：deepseek-chat

3. **自定义**
   - 支持任何 OpenAI 兼容 API
   - 需要配置 API 地址和模型名称

## 🎨 界面预览

- **深色主题**：Catppuccin Mocha 色系
- **响应式设计**：支持桌面和移动设备
- **现代化 UI**：流畅动画、渐变色彩

## 📄 License

MIT License

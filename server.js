const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// AI服务路由（需要真实API时扩展）
app.post('/api/ai/guide', async (req, res) => {
    const { content, provider, apiKey, model } = req.body;
    
    // 这里可以集成真实的AI API
    // 目前返回模拟数据
    const guides = [
        '今天发生了什么让你印象深刻的事情？试着描述一下当时的场景和你的感受。',
        '有没有什么特别的情绪体验？比如意外的喜悦、小小的失落或深深的感动？'
    ];
    
    setTimeout(() => {
        res.json({
            success: true,
            guide: guides[Math.floor(Math.random() * guides.length)]
        });
    }, 500);
});

app.post('/api/ai/analyze', async (req, res) => {
    const { content, provider, apiKey, model } = req.body;
    
    // 这里可以集成真实的情绪分析API
    setTimeout(() => {
        res.json({
            success: true,
            analysis: {
                mainEmotion: 'happy',
                emotions: [
                    { name: 'happy', count: 3 },
                    { name: 'excited', count: 1 }
                ],
                sentiment: 0.8
            }
        });
    }, 1000);
});

app.post('/api/ai/report', async (req, res) => {
    const { diaries, provider, apiKey, model } = req.body;
    
    // 这里可以集成真实的AI报告生成
    setTimeout(() => {
        res.json({
            success: true,
            report: {
                summary: '您的日记记录了生活的点滴...',
                suggestions: ['继续坚持写日记', '关注情绪变化']
            }
        });
    }, 1500);
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`📝 AI智能日记应用已启动`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`=================================\n`);
});

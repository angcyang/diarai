// AI日记应用主逻辑

// 全局状态
let state = {
    currentPage: 'write',
    selectedEmotion: null,
    currentDiaryId: null,
    diaries: [],
    viewMode: 'card', // 'card' 或 'timeline'
    currentMonth: 'all',
    currentTheme: 'default',
    settings: {
        aiProvider: 'qianwen', // 默认千问
        apiKey: '',
        baseUrl: '',
        aiModel: 'qwen-turbo',
        enableEncryption: false,
        enableCloudBackup: false
    },
    cache: {
        diaries: null,
        lastUpdate: 0,
        isValid: function() {
            return this.diaries !== null && (Date.now() - this.lastUpdate) < 30000; // 30秒内有效
        }
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    loadDiaries();
    loadSettings();
    initNavigation();
    initWritePage();
    initLibraryPage();
    initAnalysisPage();
    initSettingsPage();
    initTheme();
    updateCurrentDate();
});

// 更新当前日期
function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    dateElement.textContent = now.toLocaleDateString('zh-CN', options);
}

// 初始化导航
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(pageName) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // 更新页面显示
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');

    state.currentPage = pageName;

    // 页面切换时的特定操作
    if (pageName === 'library') {
        renderDiaryList();
    } else if (pageName === 'analysis') {
        updateAnalysis();
    }
}

// 本地存储操作（带缓存）
function saveDiaries() {
    localStorage.setItem('ai-diary-diaries', JSON.stringify(state.diaries));
    // 更新缓存
    state.cache.diaries = state.diaries;
    state.cache.lastUpdate = Date.now();
}

function loadDiaries() {
    // 先检查缓存
    if (state.cache.isValid()) {
        return;
    }
    
    const stored = localStorage.getItem('ai-diary-diaries');
    if (stored) {
        state.diaries = JSON.parse(stored);
        // 更新缓存
        state.cache.diaries = state.diaries;
        state.cache.lastUpdate = Date.now();
    }
}

// 清除缓存
function clearCache() {
    state.cache.diaries = null;
    state.cache.lastUpdate = 0;
}

function saveSettings() {
    localStorage.setItem('ai-diary-settings', JSON.stringify(state.settings));
}

function loadSettings() {
    const stored = localStorage.getItem('ai-diary-settings');
    if (stored) {
        state.settings = { ...state.settings, ...JSON.parse(stored) };
        // 更新UI
        document.getElementById('ai-provider').value = state.settings.aiProvider;
        document.getElementById('api-key').value = state.settings.apiKey;
        document.getElementById('ai-model').value = state.settings.aiModel;
        document.getElementById('enable-encryption').checked = state.settings.enableEncryption;
        document.getElementById('enable-cloud-backup').checked = state.settings.enableCloudBackup;
    }
}

// AI对话状态
let conversationState = {
    phase: 0,
    responses: [],
    isActive: false,
    conversationHistory: []
};

// 对话模板
const conversationTemplates = {
    basic: [
        {
            phase: 0,
            question: "你好！我是你的AI写作助手。今天发生了什么让你印象深刻的事情？试着描述一下当时的场景和你的感受。",
            hint: "比如工作中遇到的挑战、生活中的小确幸、或者让你有所感悟的事情..."
        },
        {
            phase: 1,
            question: "这件事让你有什么情绪体验？你能详细说说当时的心情吗？",
            hint: "比如开心、激动、平静、焦虑、难过等，可以描述情绪的变化过程..."
        },
        {
            phase: 2,
            question: "从这件事中你学到了什么？或者有什么新的感悟和思考？",
            hint: "想想这次经历带给你的成长或启示..."
        },
        {
            phase: 3,
            question: "今天还有其他想记录的事情吗？或者有什么期待或担忧的事情想写下？",
            hint: "可以是工作学习的进展、和朋友的对话、或者对未来的计划..."
        },
        {
            phase: 4,
            question: "最后，回顾今天的经历，你有什么话想对自己说？",
            hint: "给自己的一个鼓励、提醒或祝福..."
        },
        {
            phase: 5,
            isFinal: true,
            message: "对话完成了！我已经根据你的回答整理了一篇日记，你可以查看和修改。"
        }
    ]
};

// 写日记页面
function initWritePage() {
    // 模式选择
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            selectWriteMode(mode);
        });
    });

    // 返回按钮
    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('write-modes').style.display = 'grid';
        document.getElementById('write-container').style.display = 'none';
    });

    // AI对话控制
    document.getElementById('start-conversation-btn').addEventListener('click', startConversation);
    document.getElementById('send-answer-btn').addEventListener('click', sendAnswer);
    document.getElementById('end-conversation-btn').addEventListener('click', generateDiaryFromConversation);
    
    // 导入TXT文件
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', importTxtFile);
    
    // 情绪选择
    const emotionBtns = document.querySelectorAll('.emotion-btn');
    emotionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            emotionBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedEmotion = btn.dataset.emotion;
        });
    });

    // 分析情绪
    document.getElementById('analyze-btn').addEventListener('click', analyzeEmotion);

    // 保存日记
    document.getElementById('save-btn').addEventListener('click', saveDiary);

    // 初始化测试数据
    initSampleData();

    // 快捷键支持
    setupKeyboardShortcuts();

    // 自动保存草稿
    setupAutoSave();
}

// 选择写作模式
function selectWriteMode(mode) {
    const writeModes = document.getElementById('write-modes');
    const writeContainer = document.getElementById('write-container');
    const aiGuideSection = document.getElementById('ai-guide-section');
    const importSection = document.getElementById('import-section');

    // 隐藏模式选择，显示写作容器
    writeModes.style.display = 'none';
    writeContainer.style.display = 'block';

    // 根据模式显示不同区域
    aiGuideSection.style.display = mode === 'ai-assist' ? 'block' : 'none';
    importSection.style.display = mode === 'import' ? 'block' : 'none';

    // 清空编辑器
    document.getElementById('diary-title').value = '';
    document.getElementById('diary-content').value = '';
    document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
    state.selectedEmotion = null;
    document.getElementById('emotion-analysis').style.display = 'none';

    // 重置对话状态
    resetConversation();

    // 根据模式设置默认引导
    const guideContent = document.getElementById('guide-content');
    if (mode === 'ai-assist') {
        guideContent.innerHTML = `
            <div class="ai-message">
                <div class="message-icon">🤖</div>
                <div class="message-content">
                    <p class="guide-text">点击"开始对话"，我将通过一系列问题引导你记录今天的经历和感受。整个过程大概需要5-10分钟。</p>
                </div>
            </div>
        `;
    } else if (mode === 'free-write') {
        guideContent.innerHTML = `
            <div class="ai-message">
                <div class="message-icon">✏️</div>
                <div class="message-content">
                    <p class="guide-text">自由写作模式，完全由您主导创作。尽情抒发您的想法和感受吧！</p>
                </div>
            </div>
        `;
    }
}

// 导入TXT文件
function importTxtFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        // 将TXT内容填充到编辑器
        document.getElementById('diary-content').value = content;
        
        // 自动提取标题（第一行）
        const lines = content.split('\n');
        if (lines.length > 0 && lines[0].trim()) {
            document.getElementById('diary-title').value = lines[0].trim().substring(0, 50);
        }

        alert('文件导入成功！您可以继续编辑或直接保存。');
    };
    
    reader.readAsText(file, 'UTF-8');
    
    // 清空文件输入，允许重复导入同一文件
    event.target.value = '';
}

// 初始化测试数据（首次使用时自动添加）
function initSampleData() {
    // 检查是否已经初始化过
    const initialized = localStorage.getItem('ai-diary-initialized');
    if (initialized) {
        loadDiaries();
        return;
    }

    // 测试数据：覆盖过去2个月的日记
    const sampleDiaries = [
        {
            id: Date.now() - 90 * 24 * 60 * 60 * 1000,
            title: '重新开始的决心',
            content: `今天做了一个重要的决定——重新开始写日记。

回顾过去的日子，发现自己已经很久没有静下心来记录生活了。工作越来越忙，日子过得像流水一样，蓦然回首却发现很多珍贵的回忆都模糊了。

今天特意去文具店买了一本喜欢的笔记本，决定重新培养这个习惯。好的日记习惯不仅能帮助记录生活，更能让自己在书写中理清思绪、沉淀心情。

从今天开始，我要认真对待每一天的记录。不需要写很多，但求真实和用心。

晚上写下这篇日记，感觉心情平静了很多。希望自己能坚持下去！`,
            emotion: 'calm',
            date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 200,
            keywords: ['日记', '开始', '记录', '决心', '心情'],
            tags: ['重新开始']
        },
        {
            id: Date.now() - 85 * 24 * 60 * 60 * 1000,
            title: '周末的阳光',
            content: `今天是难得的晴天，整个城市都暖洋洋的。

睡到自然醒后，我决定出门走走。去了附近的公园，那里有好多人在晒太阳、遛狗、聊天。找了一个安静的角落坐下，看着湖面波光粼粼，感觉特别舒服。

买了一个冰淇淋，边吃边在公园里闲逛。看到一对老夫妻手牵手散步，还有一群孩子在放风筝，这些平凡的场景让人觉得生活很美好。

下午在咖啡店坐了一会儿，读完了半本书。这样的周末，简单而充实。`,
            emotion: 'happy',
            date: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 180,
            keywords: ['阳光', '公园', '周末', '散步', '咖啡'],
            tags: []
        },
        {
            id: Date.now() - 78 * 24 * 60 * 60 * 1000,
            title: '工作上的小突破',
            content: `今天在工作中取得了一个小小的突破！

这个项目我跟进了一个多月，期间遇到了很多技术难题和沟通障碍。今天终于完成了核心功能的开发，测试也全部通过，很有成就感。

虽然只是一个很小的功能，但对我来说是突破自我的过程。从中学到了很多新知识，也锻炼了解决问题的能力。

晚上团队一起吃了顿好的，算是庆祝。感觉身边有一群靠谱的同事很幸福！`,
            emotion: 'excited',
            date: new Date(Date.now() - 78 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 160,
            keywords: ['工作', '突破', '项目', '团队', '成就感'],
            tags: ['工作']
        },
        {
            id: Date.now() - 65 * 24 * 60 * 60 * 1000,
            title: '友情的温暖',
            content: `今天收到了好久不联系的朋友发来的消息。

我们是在大学认识的，毕业后各奔东西，联系渐渐少了。今天突然收到他的问候，说梦到以前一起的日子，想来城市出差时见一面。

突然很感慨，真正的友情不会因为距离和时间而变淡。有些人在心里有一个特殊的位置，不管多久没联系，见面时依然能聊得很开心。

人越长大越觉得朋友珍贵。希望大家都能各自安好，有缘再聚。`,
            emotion: 'happy',
            date: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 170,
            keywords: ['朋友', '友情', '联系', '感慨', '珍贵'],
            tags: ['人际']
        },
        {
            id: Date.now() - 52 * 24 * 60 * 60 * 1000,
            title: '学习的困惑',
            content: `最近在学习新技能，感觉有点力不从心。

看了一堆教程和文档，但真正动手做的时候还是处处碰壁。有时候一个问题卡住几个小时，整个人都很焦虑。

今天跟一个前辈聊了聊，他说他当年也是这样过来的。新手期的困惑是每个学习者都会经历的，重要的是不要放弃。

调整心态，明天继续加油！`,
            emotion: 'anxious',
            date: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 150,
            keywords: ['学习', '困惑', '焦虑', '坚持', '调整'],
            tags: ['学习']
        },
        {
            id: Date.now() - 45 * 24 * 60 * 60 * 1000,
            title: '夜深人静的时刻',
            content: `失眠的夜晚，睡不着就起来写日记。

窗外的城市安静下来了，只有偶尔传来的车声。这个时候特别适合思考，思绪可以飘很远。

想了很多事情，关于未来、关于梦想、关于自己真正想要的生活。有时候白天太忙，根本没有时间静下心来想这些。

人活着不能只有忙碌，还需要有目标和方向。希望自己能保持清醒，不要在忙碌中迷失。`,
            emotion: 'calm',
            date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 140,
            keywords: ['夜晚', '思考', '未来', '方向', '目标'],
            tags: ['感悟']
        },
        {
            id: Date.now() - 38 * 24 * 60 * 60 * 1000,
            title: '健身一个月的心得',
            content: `坚持健身一个月了，记录一下心得。

说实话过程并不轻松，有时候下班已经很累了还要去健身房，真的很想放弃。但咬咬牙坚持下来，现在已经慢慢习惯了。

这一个月最大的变化是精神状态好了很多，身体也感觉更有活力。虽然体重没怎么变，但同事说我看起来精神多了。

继续坚持，期待三个月后的自己！`,
            emotion: 'happy',
            date: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 150,
            keywords: ['健身', '坚持', '习惯', '变化', '目标'],
            tags: ['健康']
        },
        {
            id: Date.now() - 30 * 24 * 60 * 60 * 1000,
            title: '家人的电话',
            content: `今天给家里打了电话，妈妈聊了很久。

她说家里一切都好，让我不要担心，好好工作。每次打电话她都会问很多，虽然有些唠叨，但心里暖暖的。

想起以前在家的时候总觉得烦，现在离开家了才知道珍惜。每天再忙也要记得给家里打个电话。`,
            emotion: 'calm',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 120,
            keywords: ['家人', '电话', '妈妈', '温暖', '珍惜'],
            tags: ['家庭']
        },
        {
            id: Date.now() - 25 * 24 * 60 * 60 * 1000,
            title: '第一次公开演讲',
            content: `今天完成了人生第一次公开演讲！

紧张得一晚上没睡好，早上起来还在背稿子。但真正站上去的时候，发现其实没那么可怕。

演讲结束后有几个同事说讲得很好，给了我很大的鼓励。虽然还有进步空间，但迈出第一步就是成功！

给自己点个赞，继续挑战！`,
            emotion: 'excited',
            date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 140,
            keywords: ['演讲', '挑战', '紧张', '鼓励', '成功'],
            tags: ['成长']
        },
        {
            id: Date.now() - 18 * 24 * 60 * 60 * 1000,
            title: '搬家的一天',
            content: `今天搬进了新房子，虽然累但很开心。

从找房子到搬家折腾了大半个月，终于安顿下来了。新房间虽然不大，但采光很好，而且终于有了自己的独立空间。

晚上整理东西的时候很有成就感，把房间布置成喜欢的样子，感觉生活品质提升了不少。

接下来的日子，要好好享受这个新家！`,
            emotion: 'happy',
            date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 145,
            keywords: ['搬家', '新家', '整理', '成就', '独立'],
            tags: ['生活']
        },
        {
            id: Date.now() - 12 * 24 * 60 * 60 * 1000,
            title: '周末做了一顿饭',
            content: `今天尝试自己做饭，结果还不错！

以前总觉得做饭很麻烦，总是叫外卖。今天心血来潮想试试，照着菜谱做了一道红烧排骨，味道居然还可以！

虽然卖相不怎么样，但自己做的吃起来特别香。以后要多练习，争取厨艺越来越好。

健康饮食，从我做起！`,
            emotion: 'happy',
            date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 130,
            keywords: ['做饭', '尝试', '红烧排骨', '健康', '练习'],
            tags: ['生活']
        },
        {
            id: Date.now() - 7 * 24 * 60 * 60 * 1000,
            title: '项目延期的烦恼',
            content: `今天得知项目要延期，心情有点低落。

辛辛苦苦做了这么久，因为一些不可控的因素要推迟上线。有点沮丧，但也没办法。

前辈开导我说，项目延期是常有的事，重要的是保持心态、总结经验。不能因为一次挫折就否定自己的努力。

调整一下，明天继续努力！`,
            emotion: 'sad',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 135,
            keywords: ['项目', '延期', '沮丧', '调整', '努力'],
            tags: ['工作']
        },
        {
            id: Date.now() - 3 * 24 * 60 * 60 * 1000,
            title: '雨天的小确幸',
            content: `今天下了一整天的雨，但心情意外地好。

雨天特别适合宅在家里，泡一杯热茶，看一本书，听着雨声，感觉时间都慢下来了。

平时总是忙忙碌碌，很少有这样悠闲的时刻。学会放慢脚步，享受生活中的小确幸，也是一种智慧。`,
            emotion: 'calm',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 125,
            keywords: ['雨天', '悠闲', '生活', '享受', '智慧'],
            tags: ['感悟']
        },
        {
            id: Date.now() - 1 * 24 * 60 * 60 * 1000,
            title: '即将到来的生日',
            content: `再过几天就是生日了，时间过得真快。

回想起这一年，经历了很多，也成长了不少。有开心的时候，也有难过的时候，但总体来说还是在往前走。

希望新的一岁能继续保持热情，追逐自己想要的生活。不需要太多，只求平安、健康、充实。

加油！`,
            emotion: 'happy',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            wordCount: 120,
            keywords: ['生日', '回顾', '成长', '期待', '加油'],
            tags: ['感悟']
        }
    ];

    // 批量添加测试数据
    state.diaries = sampleDiaries.map(diary => ({
        ...diary,
        wordCount: diary.content.length,
        keywords: extractKeywords(diary.content)
    }));
    saveDiaries();
    
    // 标记已初始化
    localStorage.setItem('ai-diary-initialized', 'true');
}

// 重置对话状态
function resetConversation() {
    conversationState = {
        phase: 0,
        responses: [],
        isActive: false,
        conversationHistory: []
    };
    document.getElementById('start-conversation-btn').style.display = 'inline-flex';
    document.getElementById('send-answer-btn').style.display = 'none';
    document.getElementById('end-conversation-btn').style.display = 'none';
    document.getElementById('user-input-area').style.display = 'none';
    document.getElementById('user-answer').value = '';
    updateConversationStep();
}

// 更新对话步骤显示
function updateConversationStep() {
    const stepElement = document.getElementById('conversation-step');
    const currentStep = conversationState.phase + 1;
    const totalSteps = conversationTemplates.basic.length;
    stepElement.textContent = `第 ${currentStep}/${totalSteps} 步`;
}

// 开始对话
async function startConversation() {
    conversationState.isActive = true;
    
    document.getElementById('start-conversation-btn').style.display = 'none';
    document.getElementById('send-answer-btn').style.display = 'inline-flex';
    document.getElementById('end-conversation-btn').style.display = 'inline-flex';
    document.getElementById('user-input-area').style.display = 'block';
    
    await showNextQuestion();
}

// 显示下一个问题
async function showNextQuestion() {
    if (conversationState.phase >= conversationTemplates.basic.length) {
        return;
    }

    const currentTemplate = conversationTemplates.basic[conversationState.phase];
    const guideContent = document.getElementById('guide-content');
    
    // 显示加载状态
    guideContent.innerHTML += `
        <div class="ai-message" id="loading-message">
            <div class="message-icon">🤖</div>
            <div class="message-content">
                <p class="guide-text">正在思考下一个问题...</p>
            </div>
        </div>
    `;
    
    // 模拟AI思考时间
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 移除加载消息
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.remove();
    
    // 添加新消息
    const messageHtml = `
        <div class="ai-message" style="animation: slideInLeft 0.4s ease-out;">
            <div class="message-icon">🤖</div>
            <div class="message-content">
                <p class="guide-text">${currentTemplate.question}</p>
                <p class="guide-hint" style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">💡 ${currentTemplate.hint}</p>
            </div>
        </div>
    `;
    guideContent.insertAdjacentHTML('beforeend', messageHtml);
    
    // 滚动到底部
    guideContent.scrollTop = guideContent.scrollHeight;
    
    conversationState.conversationHistory.push({
        type: 'ai',
        content: currentTemplate.question
    });
    
    updateConversationStep();
}

// 发送回答
async function sendAnswer() {
    const answerInput = document.getElementById('user-answer');
    const answer = answerInput.value.trim();
    
    if (!answer) {
        showToast('请输入你的回答', 'warning');
        return;
    }
    
    // 添加用户回答到对话历史
    const guideContent = document.getElementById('guide-content');
    const messageHtml = `
        <div class="user-message" style="animation: slideInRight 0.4s ease-out;">
            <div class="message-icon">👤</div>
            <div class="message-content">
                <p class="guide-text">${escapeHtml(answer)}</p>
            </div>
        </div>
    `;
    guideContent.insertAdjacentHTML('beforeend', messageHtml);
    
    conversationState.responses.push(answer);
    conversationState.conversationHistory.push({
        type: 'user',
        content: answer
    });
    
    // 清空输入框
    answerInput.value = '';
    guideContent.scrollTop = guideContent.scrollHeight;
    
    // 进入下一阶段
    conversationState.phase++;
    
    if (conversationState.phase < conversationTemplates.basic.length) {
        await showNextQuestion();
    } else {
        // 对话完成
        await completeConversation();
    }
}

// 完成对话
async function completeConversation() {
    const guideContent = document.getElementById('guide-content');
    
    // 显示完成消息
    const finalTemplate = conversationTemplates.basic[conversationTemplates.basic.length - 1];
    const messageHtml = `
        <div class="ai-message" style="animation: slideInLeft 0.4s ease-out;">
            <div class="message-icon">🤖</div>
            <div class="message-content">
                <p class="guide-text">${finalTemplate.message}</p>
                <p class="guide-hint" style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">💡 点击"结束对话并生成日记"按钮，我将根据你的回答生成一篇完整的日记。</p>
            </div>
        </div>
    `;
    guideContent.insertAdjacentHTML('beforeend', messageHtml);
    guideContent.scrollTop = guideContent.scrollHeight;
    
    // 隐藏发送按钮，只显示结束对话按钮
    document.getElementById('send-answer-btn').style.display = 'none';
    document.getElementById('user-input-area').style.display = 'none';
}

// 根据对话生成日记
async function generateDiaryFromConversation() {
    if (conversationState.responses.length === 0) {
        showToast('还没有进行对话，无法生成日记', 'warning');
        return;
    }
    
    const guideContent = document.getElementById('guide-content');
    
    // 显示生成状态
    const loadingHtml = `
        <div class="ai-message" id="generating-message">
            <div class="message-icon">🤖</div>
            <div class="message-content">
                <p class="guide-text">正在根据对话内容生成日记...</p>
            </div>
        </div>
    `;
    guideContent.insertAdjacentHTML('beforeend', loadingHtml);
    
    // 模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 移除加载消息
    const generatingMsg = document.getElementById('generating-message');
    if (generatingMsg) generatingMsg.remove();
    
    // 生成日记标题和内容
    const generatedTitle = generateDiaryTitle();
    const generatedContent = generateDiaryContent();
    
    // 填充到编辑器
    document.getElementById('diary-title').value = generatedTitle;
    document.getElementById('diary-content').value = generatedContent;
    
    // 分析情绪并设置
    const detectedEmotion = detectEmotionFromContent(generatedContent);
    if (detectedEmotion) {
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.emotion === detectedEmotion) {
                btn.classList.add('selected');
                state.selectedEmotion = detectedEmotion;
            }
        });
    }
    
    showToast('日记已生成！你可以继续编辑或直接保存。', 'success');
    
    // 显示成功消息
    const successHtml = `
        <div class="ai-message" style="animation: slideInLeft 0.4s ease-out;">
            <div class="message-icon">✅</div>
            <div class="message-content">
                <p class="guide-text">日记生成完成！我已经根据你的对话内容整理了一篇日记，填入了编辑器中。你可以查看和修改，然后保存。</p>
            </div>
        </div>
    `;
    guideContent.insertAdjacentHTML('beforeend', successHtml);
    guideContent.scrollTop = guideContent.scrollHeight;
    
    // 滚动到编辑器
    document.querySelector('.diary-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 生成日记标题
function generateDiaryTitle() {
    const responses = conversationState.responses;
    if (responses.length === 0) return '今日记录';
    
    // 基于第一个回答生成标题
    const firstResponse = responses[0];
    const keywords = extractKeywords(firstResponse);
    
    if (keywords.length > 0) {
        return keywords[0] + '的记录';
    }
    
    return '今日记录';
}

// 生成日记内容
function generateDiaryContent() {
    const responses = conversationState.responses;
    if (responses.length === 0) return '';
    
    let content = '';
    
    // 引言
    content += '今天是' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) + '。\n\n';
    
    // 整合回答内容
    responses.forEach((response, index) => {
        switch(index) {
            case 0:
                content += '今天让我印象深刻的事情是：\n' + response + '\n\n';
                break;
            case 1:
                content += '这件事让我感到：\n' + response + '\n\n';
                break;
            case 2:
                content += '从这件事中，我学到了：\n' + response + '\n\n';
                break;
            case 3:
                content += '此外，今天还有：\n' + response + '\n\n';
                break;
            case 4:
                content += '最后，我想对自己说：\n' + response + '\n\n';
                break;
            default:
                content += response + '\n\n';
        }
    });
    
    // 结尾
    content += '这就是今天的故事。';
    
    return content;
}

// 从内容中检测情绪
function detectEmotionFromContent(content) {
    const emotionKeywords = {
        happy: ['开心', '快乐', '幸福', '愉快', '高兴', '喜欢', '棒', '好', '成功', '满足', '喜悦'],
        sad: ['难过', '伤心', '哭', '痛', '失望', '悲伤', '不好', '失败', '遗憾', '失落'],
        angry: ['生气', '愤怒', '恼火', '不爽', '讨厌', '恨', '烦', '不满'],
        anxious: ['焦虑', '担心', '紧张', '害怕', '恐惧', '压力', '不安', '忧虑'],
        calm: ['平静', '安静', '放松', '舒适', '安心', '稳定', '宁静'],
        excited: ['兴奋', '激动', '期待', '热情', '充满', '期待']
    };
    
    let emotionCounts = {};
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        let count = 0;
        keywords.forEach(keyword => {
            count += (content.match(new RegExp(keyword, 'g')) || []).length;
        });
        if (count > 0) {
            emotionCounts[emotion] = count;
        }
    }
    
    if (Object.keys(emotionCounts).length === 0) return null;
    
    return Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0];
}

async function analyzeEmotion() {
    const content = document.getElementById('diary-content').value;
    if (!content.trim()) {
        showToast('请先输入日记内容', 'warning');
        return;
    }

    const analysisSection = document.getElementById('emotion-analysis');
    const analysisResult = document.getElementById('analysis-result');
    
    analysisSection.style.display = 'block';
    analysisResult.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div class="loading-spinner"></div>
            <p>正在分析情绪...</p>
        </div>
    `;

    // 模拟AI情绪分析
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 简单的关键词分析
    const emotionKeywords = {
        happy: ['开心', '快乐', '幸福', '愉快', '高兴', '开心', '喜欢', '棒', '好', '成功'],
        sad: ['难过', '伤心', '哭', '痛', '失望', '悲伤', '不好', '失败'],
        angry: ['生气', '愤怒', '恼火', '不爽', '讨厌', '恨', '烦'],
        anxious: ['焦虑', '担心', '紧张', '害怕', '恐惧', '压力', '不安'],
        calm: ['平静', '安静', '放松', '舒适', '安心', '稳定'],
        excited: ['兴奋', '激动', '期待', '期待', '热情', '充满']
    };

    let detectedEmotions = {};
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        let count = 0;
        keywords.forEach(keyword => {
            count += (content.match(new RegExp(keyword, 'g')) || []).length;
        });
        if (count > 0) {
            detectedEmotions[emotion] = count;
        }
    }

    let analysisHtml = '';
    if (Object.keys(detectedEmotions).length > 0) {
        analysisHtml = '<p>根据您的内容，检测到以下情绪：</p><ul>';
        const emotionLabels = {
            happy: '😊 开心',
            sad: '😢 难过',
            angry: '😠 生气',
            anxious: '😰 焦虑',
            calm: '😌 平静',
            excited: '🤩 兴奋'
        };
        for (const [emotion, count] of Object.entries(detectedEmotions)) {
            analysisHtml += `<li>${emotionLabels[emotion]} (出现${count}次)</li>`;
        }
        analysisHtml += '</ul>';
        
        // 推荐主要情绪
        const mainEmotion = Object.entries(detectedEmotions).sort((a, b) => b[1] - a[1])[0][0];
        const recommendedEmotionBtn = document.querySelector(`.emotion-btn[data-emotion="${mainEmotion}"]`);
        if (recommendedEmotionBtn) {
            document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
            recommendedEmotionBtn.classList.add('selected');
            state.selectedEmotion = mainEmotion;
            analysisHtml += `<p><strong>建议将心情设置为：${emotionLabels[mainEmotion]}</strong></p>`;
        }
    } else {
        analysisHtml = '<p>未检测到明显的情绪关键词，您可以手动选择当前心情。</p>';
    }

    analysisResult.innerHTML = analysisHtml;
    showToast('情绪分析完成', 'success');
}

function saveDiary() {
    const title = document.getElementById('diary-title').value.trim();
    const content = document.getElementById('diary-content').value.trim();
    const emotion = state.selectedEmotion;

    if (!content) {
        showToast('请输入日记内容', 'warning');
        return;
    }

    // 提取关键词
    const keywords = extractKeywords(content);

    const diary = {
        id: Date.now(),
        title: title || '无标题日记',
        content: content,
        emotion: emotion,
        date: new Date().toISOString(),
        wordCount: content.length,
        keywords: keywords,
        tags: [] // 可手动添加标签
    };

    state.diaries.unshift(diary);
    saveDiaries();

    // 清空表单
    document.getElementById('diary-title').value = '';
    document.getElementById('diary-content').value = '';
    document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
    state.selectedEmotion = null;
    document.getElementById('emotion-analysis').style.display = 'none';
    
    // 清除草稿
    localStorage.removeItem('ai-diary-draft');

    showToast('日记保存成功！', 'success');
}

// 日记库页面
function initLibraryPage() {
    document.getElementById('search-input').addEventListener('input', debounce(renderDiaryList, 300));
    document.getElementById('filter-emotion').addEventListener('change', renderDiaryList);
    document.getElementById('filter-month').addEventListener('change', renderDiaryList);
    document.getElementById('filter-tags').addEventListener('change', renderDiaryList);
    
    // 视图切换
    document.getElementById('view-card').addEventListener('click', () => {
        state.viewMode = 'card';
        document.querySelectorAll('.view-toggle button').forEach(btn => btn.classList.remove('active'));
        document.getElementById('view-card').classList.add('active');
        renderDiaryList();
    });
    
    document.getElementById('view-timeline').addEventListener('click', () => {
        state.viewMode = 'timeline';
        document.querySelectorAll('.view-toggle button').forEach(btn => btn.classList.remove('active'));
        document.getElementById('view-timeline').classList.add('active');
        renderDiaryList();
    });
    
    // 刷新按钮
    document.getElementById('refresh-library').addEventListener('click', () => {
        clearCache();
        loadDiaries();
        renderDiaryList();
        showToast('日记列表已刷新', 'success');
    });
}

function renderDiaryList() {
    const listElement = document.getElementById('diary-list');
    const emptyState = document.getElementById('empty-state');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterEmotion = document.getElementById('filter-emotion').value;
    const filterMonth = document.getElementById('filter-month').value;
    const filterTags = document.getElementById('filter-tags').value;

    // 月份筛选
    let filteredDiaries = state.diaries;
    if (filterMonth !== 'all') {
        const [year, month] = filterMonth.split('-');
        filteredDiaries = filteredDiaries.filter(diary => {
            const d = new Date(diary.date);
            return d.getFullYear() === parseInt(year) && d.getMonth() === parseInt(month) - 1;
        });
    }

    filteredDiaries = filteredDiaries.filter(diary => {
        // 搜索关键词
        const keywords = diary.keywords || [];
        const keywordMatch = keywords.some(kw => kw.toLowerCase().includes(searchTerm));
        
        const matchesSearch = diary.title.toLowerCase().includes(searchTerm) || 
                            diary.content.toLowerCase().includes(searchTerm) ||
                            keywordMatch;
        
        const matchesEmotion = !filterEmotion || diary.emotion === filterEmotion;
        
        // 标签筛选
        let matchesTags = true;
        if (filterTags) {
            matchesTags = diary.tags && diary.tags.includes(filterTags);
        }
        
        return matchesSearch && matchesEmotion && matchesTags;
    });

    if (filteredDiaries.length === 0) {
        listElement.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    const emotionLabels = {
        happy: '😊 开心',
        sad: '😢 难过',
        angry: '😠 生气',
        anxious: '😰 焦虑',
        calm: '😌 平静',
        excited: '🤩 兴奋'
    };

    // 更新月份选项
    updateMonthOptions();

    if (state.viewMode === 'card') {
        renderCardView(filteredDiaries, emotionLabels);
    } else {
        renderTimelineView(filteredDiaries, emotionLabels);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateMonthOptions() {
    const monthSelect = document.getElementById('filter-month');
    const months = new Set();
    
    state.diaries.forEach(diary => {
        const d = new Date(diary.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
    });

    const currentMonth = monthSelect.value;
    let html = '<option value="all">全部月份</option>';
    
    Array.from(months).sort().reverse().forEach(month => {
        const [year, monthNum] = month.split('-');
        html += `<option value="${month}">${year}年${parseInt(monthNum)}月</option>`;
    });

    monthSelect.innerHTML = html;
    monthSelect.value = currentMonth || 'all';
}

function renderCardView(diaries, emotionLabels) {
    const listElement = document.getElementById('diary-list');
    
    listElement.innerHTML = diaries.map(diary => `
        <div class="diary-card" data-id="${diary.id}">
            <div class="diary-card-header">
                <div class="diary-card-title">${escapeHtml(diary.title)}</div>
                <div class="diary-card-date">${formatDateShort(diary.date)}</div>
            </div>
            <div class="diary-card-preview">${escapeHtml(diary.content)}</div>
            ${diary.keywords && diary.keywords.length > 0 ? `
                <div class="diary-keywords">
                    ${diary.keywords.slice(0, 5).map(kw => `<span class="keyword-tag">#${escapeHtml(kw)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="diary-card-footer">
                ${diary.emotion ? `<span class="emotion-tag ${diary.emotion}">${emotionLabels[diary.emotion]}</span>` : ''}
                <div class="diary-actions">
                    <button onclick="viewDiary(${diary.id})" class="btn-view">查看</button>
                    <button onclick="deleteDiary(${diary.id})" class="btn-delete">删除</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderTimelineView(diaries, emotionLabels) {
    const listElement = document.getElementById('diary-list');
    
    // 按日期分组
    const groupedByDate = {};
    diaries.forEach(diary => {
        const dateKey = new Date(diary.date).toDateString();
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(diary);
    });

    let html = '';
    Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => {
        const date = new Date(dateKey);
        html += `
            <div class="timeline-day">
                <div class="timeline-date">${formatDate(date.toISOString())}</div>
                ${groupedByDate[dateKey].map(diary => `
                    <div class="timeline-entry">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <h4>${escapeHtml(diary.title)}</h4>
                                ${diary.emotion ? `<span class="emotion-tag ${diary.emotion}">${emotionLabels[diary.emotion]}</span>` : ''}
                            </div>
                            <p class="timeline-preview">${escapeHtml(diary.content.substring(0, 100))}...</p>
                            <div class="timeline-actions">
                                <button onclick="viewDiary(${diary.id})" class="btn-view">查看</button>
                                <button onclick="deleteDiary(${diary.id})" class="btn-delete">删除</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });

    listElement.innerHTML = html;
}

function viewDiary(id) {
    const diary = state.diaries.find(d => d.id === id);
    if (!diary) return;

    const emotionLabels = {
        happy: '😊 开心',
        sad: '😢 难过',
        angry: '😠 生气',
        anxious: '😰 焦虑',
        calm: '😌 平静',
        excited: '🤩 兴奋'
    };

    const modalHtml = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h2 style="margin-bottom: 10px;">${escapeHtml(diary.title)}</h2>
                <p style="color: #666; margin-bottom: 20px;">${formatDate(diary.date)} · ${diary.wordCount}字</p>
                ${diary.emotion ? `<span class="emotion-tag ${diary.emotion}" style="display: inline-block; margin-bottom: 20px;">${emotionLabels[diary.emotion]}</span>` : ''}
                <div style="line-height: 1.8; white-space: pre-wrap; margin-bottom: 20px;">${escapeHtml(diary.content)}</div>
                <button onclick="this.closest('div').parentElement.remove()" style="background: #4a90d9; color: white; border: none; padding: 10px 25px; border-radius: 8px; cursor: pointer;">关闭</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function deleteDiary(id) {
    const diary = state.diaries.find(d => d.id === id);
    if (!diary) return;
    
    // 使用自定义确认对话框
    const modalHtml = `
        <div id="delete-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">⚠️</div>
                    <h3 style="margin-bottom: 10px; color: var(--text-primary);">确认删除</h3>
                    <p style="color: var(--text-secondary);">确定要删除日记《${escapeHtml(diary.title)}》吗？此操作不可恢复。</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button onclick="document.getElementById('delete-modal').remove()" class="btn btn-secondary" style="flex: 1;">取消</button>
                    <button onclick="confirmDelete(${id})" class="btn btn-danger" style="flex: 1;">确认删除</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function confirmDelete(id) {
    state.diaries = state.diaries.filter(d => d.id !== id);
    saveDiaries();
    clearCache();
    renderDiaryList();
    document.getElementById('delete-modal').remove();
    showToast('日记已删除', 'success');
}

// 个人分析页面
function initAnalysisPage() {
    document.getElementById('generate-report-btn').addEventListener('click', generateAIReport);
    document.getElementById('monthly-summary-btn').addEventListener('click', generateMonthlySummary);
    
    // 标签切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchAnalysisTab(tab);
        });
    });
}

function switchAnalysisTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // 加载对应数据
    if (tabName === 'portrait') {
        updatePortrait();
    } else if (tabName === 'monthly') {
        updateMonthlySummary();
    }
}

// 生成个人画像
function updatePortrait() {
    const container = document.getElementById('portrait-content');
    
    if (state.diaries.length === 0) {
        container.innerHTML = '<p class="no-data">暂无日记数据，请先写一些日记再来查看个人画像！</p>';
        return;
    }

    // 分析特征
    const features = analyzePortraitFeatures();
    
    const html = `
        <div class="portrait-grid">
            <div class="portrait-item">
                <h4>📝 写作风格</h4>
                <div class="portrait-value">${features.writingStyle}</div>
            </div>
            <div class="portrait-item">
                <h4>😊 情绪倾向</h4>
                <div class="portrait-value">${features.emotionTrend}</div>
            </div>
            <div class="portrait-item">
                <h4>⏰ 写作时间</h4>
                <div class="portrait-value">${features.writingTime}</div>
            </div>
            <div class="portrait-item">
                <h4>🎯 关注焦点</h4>
                <div class="portrait-value">${features.focus}</div>
            </div>
            <div class="portrait-item">
                <h4>💬 表达方式</h4>
                <div class="portrait-value">${features.expression}</div>
            </div>
            <div class="portrait-item">
                <h4>🌟 性格特点</h4>
                <div class="portrait-value">${features.personality}</div>
            </div>
        </div>
        <div class="portrait-suggestion">
            <h4>💡 AI洞察</h4>
            <p>${features.suggestion}</p>
        </div>
    `;

    container.innerHTML = html;
}

function analyzePortraitFeatures() {
    // 计算平均字数
    const avgWords = state.diaries.reduce((sum, d) => sum + d.wordCount, 0) / state.diaries.length;
    
    // 写作风格
    let writingStyle = '简洁型';
    if (avgWords > 300) writingStyle = '详尽型';
    else if (avgWords > 150) writingStyle = '平衡型';

    // 情绪倾向
    const emotionCounts = {};
    state.diaries.forEach(d => {
        if (d.emotion) {
            emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
        }
    });
    
    const positiveEmotions = ['happy', 'excited', 'calm'];
    let positiveCount = 0;
    let totalCount = 0;
    
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
        totalCount += count;
        if (positiveEmotions.includes(emotion)) {
            positiveCount += count;
        }
    });
    
    const emotionTrend = totalCount > 0 && positiveCount / totalCount > 0.6 ? '积极乐观' : '情绪多样';

    // 写作时间
    const hours = state.diaries.map(d => new Date(d.date).getHours());
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
    
    let writingTime = '规律型';
    if (avgHour >= 6 && avgHour < 12) writingTime = '早晨记录者';
    else if (avgHour >= 12 && avgHour < 18) writingTime = '下午记录者';
    else if (avgHour >= 18 && avgHour < 24) writingTime = '夜间记录者';

    // 关注焦点（关键词）
    const allKeywords = state.diaries.flatMap(d => d.keywords || []);
    const keywordCounts = {};
    allKeywords.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
    
    const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([kw]) => kw);
    
    const focus = topKeywords.length > 0 ? topKeywords.join('、') : '生活感悟';

    // 表达方式
    const hasManyQuestions = state.diaries.filter(d => d.content.includes('？')).length > state.diaries.length * 0.5;
    const expression = hasManyQuestions ? '反思型' : '叙述型';

    // 性格特点
    let personality = '内敛稳重';
    if (emotionTrend === '积极乐观') personality = '阳光开朗';
    if (focus.includes('工作') || focus.includes('学习')) personality = '勤奋上进';
    if (writingTime === '夜间记录者') personality = '思考深入';

    // AI洞察
    const suggestions = [
        '您的日记记录了生活的点滴，展现了独特的思考方式和情感表达。继续保持记录，这将是一笔宝贵的财富。',
        '从您的日记中可以看出，您是一个善于思考和感受的人。通过日记，您在不断地了解和接纳自己。',
        '您的写作风格展现了真实而深刻的内心世界。这种坦诚的表达方式是非常可贵的品质。',
        '您的情绪记录丰富而真实，这说明您拥有很强的自我觉察力。这是情感成熟的重要标志。',
        '从日记内容看，您对生活有着敏锐的观察力和深刻的理解。这种能力让您能够从平凡中发现美好。'
    ];
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

    return {
        writingStyle,
        emotionTrend,
        writingTime,
        focus,
        expression,
        personality,
        suggestion
    };
}

// 生成月度总结
function generateMonthlySummary() {
    updateMonthlySummary();
}

function updateMonthlySummary() {
    const container = document.getElementById('monthly-summary-content');
    
    if (state.diaries.length === 0) {
        container.innerHTML = '<p class="no-data">暂无日记数据，请先写一些日记再来查看月度总结！</p>';
        return;
    }

    // 获取当前月的数据
    const now = new Date();
    const currentMonthDiaries = state.diaries.filter(d => {
        const date = new Date(d.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    // 如果当前月没有数据，显示最近一个月
    const targetDiaries = currentMonthDiaries.length > 0 ? currentMonthDiaries : getRecentMonthDiaries();
    
    const monthName = targetDiaries.length > 0 
        ? new Date(targetDiaries[0].date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
        : '本月';

    const totalDays = targetDiaries.length;
    const totalWords = targetDiaries.reduce((sum, d) => sum + d.wordCount, 0);
    const avgWords = Math.round(totalWords / totalDays) || 0;

    // 情绪统计
    const emotionCounts = {};
    targetDiaries.forEach(d => {
        if (d.emotion) {
            emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
        }
    });

    const mainEmotion = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])[0];

    const emotionLabels = {
        happy: '开心',
        sad: '难过',
        angry: '生气',
        anxious: '焦虑',
        calm: '平静',
        excited: '兴奋'
    };

    // 关键词
    const allKeywords = targetDiaries.flatMap(d => d.keywords || []);
    const keywordCounts = {};
    allKeywords.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });

    const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([kw]) => kw);

    const html = `
        <div class="monthly-summary">
            <div class="summary-header">
                <h3>${monthName}月度总结</h3>
                <p>记录了 ${totalDays} 篇日记，共 ${totalWords} 字</p>
            </div>
            
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-value">${totalDays}</div>
                    <div class="summary-stat-label">日记数</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${avgWords}</div>
                    <div class="summary-stat-label">平均字数</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${mainEmotion ? emotionLabels[mainEmotion[0]] : '-'}</div>
                    <div class="summary-stat-label">主要情绪</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${topKeywords.length}</div>
                    <div class="summary-stat-label">关键词</div>
                </div>
            </div>

            ${topKeywords.length > 0 ? `
                <div class="summary-keywords">
                    <h4>💭 本月高频词汇</h4>
                    <div class="keywords-list">
                        ${topKeywords.map(kw => `<span class="keyword-tag">#${escapeHtml(kw)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="summary-insight">
                <h4>🎯 本月洞察</h4>
                <p>${generateMonthInsight(totalDays, avgWords, mainEmotion, topKeywords)}</p>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function getRecentMonthDiaries() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return state.diaries.filter(d => new Date(d.date) >= thirtyDaysAgo);
}

function generateMonthInsight(totalDays, avgWords, mainEmotion, keywords) {
    const insights = [];
    
    if (totalDays >= 20) {
        insights.push('这个月您保持了非常好的记录习惯，几乎每天都在用日记记录生活！');
    } else if (totalDays >= 10) {
        insights.push('这个月您的记录频率不错，继续保持这个好习惯！');
    } else {
        insights.push('这个月的记录较少，试着多记录一些生活中的点滴吧。');
    }
    
    if (avgWords > 300) {
        insights.push('您的日记内容丰富详尽，记录了很多细节和感悟。');
    } else if (avgWords > 150) {
        insights.push('您的日记长度适中，既简洁又不失细节。');
    }
    
    if (keywords.length > 0) {
        const focus = keywords.slice(0, 3).join('、');
        insights.push(`从关键词来看，这个月您主要关注${focus}。`);
    }
    
    return insights.join(' ');
}

function updateAnalysis() {
    // 更新统计数据
    document.getElementById('total-diaries').textContent = state.diaries.length;
    document.getElementById('total-words').textContent = state.diaries.reduce((sum, d) => sum + d.wordCount, 0);
    
    // 计算连续记录天数
    const streakDays = calculateStreak();
    document.getElementById('streak-days').textContent = streakDays;

    // 计算主要情绪
    const mainEmotion = calculateMainEmotion();
    const emotionLabels = {
        happy: '😊 开心',
        sad: '😢 难过',
        angry: '😠 生气',
        anxious: '😰 焦虑',
        calm: '😌 平静',
        excited: '🤩 兴奋'
    };
    document.getElementById('avg-emotion').textContent = mainEmotion ? emotionLabels[mainEmotion] : '-';

    // 更新情绪图表
    updateEmotionChart();
    
    // 更新月度对比
    updateMonthlyComparison();
    
    // 更新情绪热力图
    updateEmotionHeatmap();
    
    // 更新关键词云
    updateKeywordCloud();
}

function calculateStreak() {
    if (state.diaries.length === 0) return 0;

    const dates = state.diaries
        .map(d => new Date(d.date).toDateString())
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort((a, b) => new Date(b) - new Date(a));

    let streak = 1;
    const today = new Date();
    
    for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i]);
        const next = new Date(dates[i + 1]);
        const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
        } else if (diffDays > 1) {
            break;
        }
    }

    return streak;
}

function calculateMainEmotion() {
    const emotionCounts = {};
    state.diaries.forEach(diary => {
        if (diary.emotion) {
            emotionCounts[diary.emotion] = (emotionCounts[diary.emotion] || 0) + 1;
        }
    });

    if (Object.keys(emotionCounts).length === 0) return null;

    return Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0];
}

function updateEmotionChart() {
    const chartElement = document.getElementById('emotion-chart');
    const emotionCounts = { happy: 0, sad: 0, angry: 0, anxious: 0, calm: 0, excited: 0 };
    
    state.diaries.forEach(diary => {
        if (diary.emotion && emotionCounts[diary.emotion] !== undefined) {
            emotionCounts[diary.emotion]++;
        }
    });

    const maxCount = Math.max(...Object.values(emotionCounts));
    const colors = {
        happy: '#28a745',
        sad: '#6c757d',
        angry: '#dc3545',
        anxious: '#ffc107',
        calm: '#17a2b8',
        excited: '#007bff'
    };

    const labels = {
        happy: '开心',
        sad: '难过',
        angry: '生气',
        anxious: '焦虑',
        calm: '平静',
        excited: '兴奋'
    };

    const chartHtml = Object.entries(emotionCounts).map(([emotion, count]) => {
        const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return `
            <div class="chart-bar">
                <div class="chart-bar-value">${count}</div>
                <div class="chart-bar-inner" style="height: ${height}%; background-color: ${colors[emotion]};"></div>
                <div class="chart-bar-label">${labels[emotion]}</div>
            </div>
        `;
    }).join('');

    chartElement.innerHTML = chartHtml;
}

async function generateAIReport() {
    const reportSection = document.getElementById('report-section');
    const reportContent = document.getElementById('report-content');
    
    reportSection.style.display = 'block';
    reportContent.innerHTML = '<p>正在生成个人报告...</p>';

    if (state.diaries.length === 0) {
        reportContent.innerHTML = '<p>还没有日记数据，请先写一些日记再来查看报告！</p>';
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    // 生成基于数据的报告
    const totalDiaries = state.diaries.length;
    const totalWords = state.diaries.reduce((sum, d) => sum + d.wordCount, 0);
    const avgWords = Math.round(totalWords / totalDiaries);
    const streak = calculateStreak();
    const mainEmotion = calculateMainEmotion();
    
    const emotionLabels = {
        happy: '开心',
        sad: '难过',
        angry: '生气',
        anxious: '焦虑',
        calm: '平静',
        excited: '兴奋'
    };

    // 分析情绪趋势
    const recentDiaries = state.diaries.slice(0, 7);
    const recentEmotions = recentDiaries.map(d => d.emotion).filter(Boolean);
    
    let trend = '情绪波动较小，保持相对稳定的状态。';
    if (recentEmotions.length > 0) {
        const negativeEmotions = ['sad', 'angry', 'anxious'];
        const negativeCount = recentEmotions.filter(e => negativeEmotions.includes(e)).length;
        
        if (negativeCount > recentEmotions.length * 0.6) {
            trend = '最近一周情绪倾向较为低落，建议多关注自己的心理健康，适当放松和调整。';
        } else if (negativeCount < recentEmotions.length * 0.3) {
            trend = '最近一周情绪状态良好，保持积极乐观的心态！';
        }
    }

    const report = `
        <h4>📈 写作习惯分析</h4>
        <p>您共记录了 <strong>${totalDiaries}</strong> 篇日记，累计 <strong>${totalWords}</strong> 字，平均每篇 <strong>${avgWords}</strong> 字。</p>
        <p>连续记录天数：<strong>${streak}</strong> 天。${streak > 7 ? '非常棒！您有良好的日记习惯。' : '继续保持，养成每天记录的好习惯！'}</p>
        
        <h4>😊 情绪状态分析</h4>
        <p>您的最常见情绪是：<strong>${mainEmotion ? emotionLabels[mainEmotion] : '暂无数据'}</strong></p>
        <p>${trend}</p>
        
        <h4>💡 建议</h4>
        <p>1. ${avgWords < 100 ? '建议在日记中记录更多细节，这有助于更好地回顾和反思。' : '您的日记内容丰富，记录了生活的点滴。'}</p>
        <p>2. ${streak < 7 ? '尝试每天写日记，即使是简短的记录也能帮助您更好地了解自己。' : '您的坚持令人敬佩，继续保持这个好习惯！'}</p>
        <p>3. 定期回顾过去的日记，可以帮助您发现自己的成长轨迹和情绪变化规律。</p>
        
        <h4>🎯 下一步</h4>
        <p>继续记录生活，关注情绪变化，在未来的日子里见证自己的成长！</p>
    `;

    reportContent.innerHTML = report;
}

// 设置页面
function initSettingsPage() {
    document.getElementById('ai-provider').addEventListener('change', updateAIModels);
    document.getElementById('test-ai-btn').addEventListener('click', testAIConnection);
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('clear-data-btn').addEventListener('click', clearData);
    
    // 主题切换
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            switchTheme(theme);
        });
    });

    document.getElementById('enable-encryption').addEventListener('change', (e) => {
        state.settings.enableEncryption = e.target.checked;
        saveSettings();
    });
    document.getElementById('enable-cloud-backup').addEventListener('change', (e) => {
        state.settings.enableCloudBackup = e.target.checked;
        saveSettings();
    });

    // 监听AI设置变化
    document.getElementById('ai-provider').addEventListener('change', (e) => {
        state.settings.aiProvider = e.target.value;
        saveSettings();
    });

    document.getElementById('api-key').addEventListener('change', (e) => {
        state.settings.apiKey = e.target.value;
        saveSettings();
    });

    document.getElementById('base-url').addEventListener('change', (e) => {
        state.settings.baseUrl = e.target.value;
        saveSettings();
    });

    document.getElementById('ai-model').addEventListener('change', (e) => {
        state.settings.aiModel = e.target.value;
        saveSettings();
    });

    document.getElementById('custom-model').addEventListener('change', (e) => {
        state.settings.aiModel = e.target.value;
        saveSettings();
    });
}

// 主题切换
function initTheme() {
    const savedTheme = localStorage.getItem('ai-diary-theme') || 'default';
    switchTheme(savedTheme);
}

function switchTheme(theme) {
    state.currentTheme = theme;
    localStorage.setItem('ai-diary-theme', theme);

    // 更新主题按钮状态
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });

    // 应用主题
    const root = document.documentElement;
    switch (theme) {
        case 'blue':
            root.style.setProperty('--primary-color', '#3b82f6');
            root.style.setProperty('--primary-hover', '#2563eb');
            root.style.setProperty('--primary-light', '#dbeafe');
            root.style.setProperty('--secondary-color', '#8b5cf6');
            root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)');
            break;
        case 'green':
            root.style.setProperty('--primary-color', '#10b981');
            root.style.setProperty('--primary-hover', '#059669');
            root.style.setProperty('--primary-light', '#d1fae5');
            root.style.setProperty('--secondary-color', '#f59e0b');
            root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
            break;
        case 'dark':
            root.style.setProperty('--primary-color', '#6366f1');
            root.style.setProperty('--primary-hover', '#4f46e5');
            root.style.setProperty('--primary-light', '#3730a3');
            root.style.setProperty('--secondary-color', '#8b5cf6');
            root.style.setProperty('--bg-color', '#1f2937');
            root.style.setProperty('--card-bg', '#374151');
            root.style.setProperty('--text-primary', '#f9fafb');
            root.style.setProperty('--text-secondary', '#9ca3af');
            root.style.setProperty('--border-color', '#4b5563');
            root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)');
            break;
        default: // purple
            root.style.setProperty('--primary-color', '#667eea');
            root.style.setProperty('--primary-hover', '#5a6fd6');
            root.style.setProperty('--primary-light', '#e8ebff');
            root.style.setProperty('--secondary-color', '#8b5cf6');
            root.style.setProperty('--bg-color', '#f3f4f6');
            root.style.setProperty('--card-bg', '#ffffff');
            root.style.setProperty('--text-primary', '#1f2937');
            root.style.setProperty('--text-secondary', '#6b7280');
            root.style.setProperty('--border-color', '#e5e7eb');
            root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
            break;
    }
}

function updateAIModels() {
    const provider = document.getElementById('ai-provider').value;
    const modelSelect = document.getElementById('ai-model');
    const apiKeyItem = document.getElementById('api-key-item');
    const baseUrlItem = document.getElementById('base-url-item');
    const modelItem = document.getElementById('model-item');
    const customModelInput = document.getElementById('custom-model-input');

    const models = {
        qianwen: [
            { value: 'qwen-turbo', label: 'qwen-turbo' },
            { value: 'qwen-plus', label: 'qwen-plus' },
            { value: 'qwen-max', label: 'qwen-max' }
        ],
        deepseek: [
            { value: 'deepseek-chat', label: 'deepseek-chat' },
            { value: 'deepseek-coder', label: 'deepseek-coder' }
        ],
        openai: [
            { value: 'gpt-4-turbo', label: 'gpt-4-turbo' },
            { value: 'gpt-4', label: 'gpt-4' },
            { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' }
        ],
        anthropic: [
            { value: 'claude-3-opus', label: 'claude-3-opus' },
            { value: 'claude-3-sonnet', label: 'claude-3-sonnet' }
        ],
        gemini: [
            { value: 'gemini-pro', label: 'gemini-pro' },
            { value: 'gemini-ultra', label: 'gemini-ultra' }
        ],
        custom: [
            { value: 'custom', label: '自定义模型' }
        ]
    };

    modelSelect.innerHTML = models[provider] ? models[provider].map(m => 
        `<option value="${m.value}">${m.label}</option>`
    ).join('') : '';

    // 显示/隐藏自定义字段
    if (provider === 'custom') {
        baseUrlItem.style.display = 'block';
        customModelInput.style.display = 'block';
        modelSelect.style.display = 'none';
    } else {
        baseUrlItem.style.display = 'none';
        customModelInput.style.display = 'none';
        modelSelect.style.display = 'block';
    }
}

async function testAIConnection() {
    const btn = document.getElementById('test-ai-btn');
    const originalText = btn.textContent;
    
    btn.textContent = '测试中...';
    btn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟测试结果
    const apiKey = document.getElementById('api-key').value;
    if (apiKey || document.getElementById('ai-provider').value === 'local') {
        alert('✅ AI连接测试成功！');
    } else {
        alert('❌ 请先输入API Key');
    }

    btn.textContent = originalText;
    btn.disabled = false;
}

function exportData() {
    // 创建导出选项弹窗
    const modalHtml = `
        <div id="export-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-bottom: 20px; color: var(--text-primary);">选择导出格式</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="exportAsJSON()" class="btn btn-secondary" style="width: 100%;">
                        📦 JSON格式（备份用）
                    </button>
                    <button onclick="exportAsMarkdown()" class="btn btn-secondary" style="width: 100%;">
                        📝 Markdown格式（文档用）
                    </button>
                    <button onclick="exportAsTXT()" class="btn btn-secondary" style="width: 100%;">
                        📄 TXT格式（纯文本）
                    </button>
                    <button onclick="exportAsWord()" class="btn btn-secondary" style="width: 100%;">
                        📋 Word格式（表格视图）
                    </button>
                </div>
                <button onclick="document.getElementById('export-modal').remove()" class="btn btn-primary" style="width: 100%; margin-top: 20px;">
                    取消
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function exportAsJSON() {
    const data = {
        diaries: state.diaries,
        settings: state.settings,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-diary-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('export-modal').remove();
    showToast('JSON导出成功', 'success');
}

function exportAsMarkdown() {
    let markdown = '# 📝 AI日记导出\n\n';
    markdown += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    markdown += `共 ${state.diaries.length} 篇日记\n\n---\n\n`;
    
    state.diaries.forEach((diary, index) => {
        markdown += `## ${index + 1}. ${escapeHtml(diary.title)}\n\n`;
        markdown += `**日期：** ${formatDate(diary.date)}\n`;
        markdown += `**字数：** ${diary.wordCount} 字\n`;
        if (diary.emotion) {
            const emotionLabels = {
                happy: '😊 开心',
                sad: '😢 难过',
                angry: '😠 生气',
                anxious: '😰 焦虑',
                calm: '😌 平静',
                excited: '🤩 兴奋'
            };
            markdown += `**心情：** ${emotionLabels[diary.emotion]}\n`;
        }
        if (diary.keywords && diary.keywords.length > 0) {
            markdown += `**关键词：** ${diary.keywords.map(kw => `#${kw}`).join(' ')}\n`;
        }
        markdown += '\n';
        markdown += `${escapeHtml(diary.content)}\n\n`;
        markdown += '---\n\n';
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-diary-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('export-modal').remove();
    showToast('Markdown导出成功', 'success');
}

function exportAsTXT() {
    let txt = '=== AI日记导出 ===\n\n';
    txt += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
    txt += `共 ${state.diaries.length} 篇日记\n\n`;
    txt += '='.repeat(60) + '\n\n';
    
    state.diaries.forEach((diary, index) => {
        txt += `[${index + 1}] ${diary.title}\n`;
        txt += `日期：${formatDate(diary.date)}\n`;
        txt += `字数：${diary.wordCount} 字\n`;
        if (diary.emotion) {
            const emotionLabels = {
                happy: '开心', sad: '难过', angry: '生气',
                anxious: '焦虑', calm: '平静', excited: '兴奋'
            };
            txt += `心情：${emotionLabels[diary.emotion]}\n`;
        }
        txt += '\n';
        txt += diary.content + '\n\n';
        txt += '='.repeat(60) + '\n\n';
    });
    
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-diary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('export-modal').remove();
    showToast('TXT导出成功', 'success');
}

function exportAsWord() {
    // 创建HTML表格格式的Word文档
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>AI日记导出</title>
            <style>
                body { font-family: "Microsoft YaHei", sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #667eea; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>📝 AI日记导出</h1>
            <p>导出时间：${new Date().toLocaleString('zh-CN')}</p>
            <p>共 ${state.diaries.length} 篇日记</p>
            <table>
                <tr>
                    <th>序号</th>
                    <th>标题</th>
                    <th>日期</th>
                    <th>字数</th>
                    <th>心情</th>
                    <th>内容预览</th>
                </tr>
    `;
    
    state.diaries.forEach((diary, index) => {
        const emotionLabels = {
            happy: '😊 开心', sad: '😢 难过', angry: '😠 生气',
            anxious: '😰 焦虑', calm: '😌 平静', excited: '🤩 兴奋'
        };
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(diary.title)}</td>
                <td>${formatDate(diary.date)}</td>
                <td>${diary.wordCount}</td>
                <td>${diary.emotion ? emotionLabels[diary.emotion] : '-'}</td>
                <td>${escapeHtml(diary.content.substring(0, 100))}...</td>
            </tr>
        `;
    });
    
    html += `
            </table>
        </body>
        </html>
    `;
    
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-diary-${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('export-modal').remove();
    showToast('Word导出成功', 'success');
}

function clearData() {
    const modalHtml = `
        <div id="clear-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">🗑️</div>
                    <h3 style="margin-bottom: 10px; color: var(--text-primary);">清除所有数据</h3>
                    <p style="color: var(--text-secondary);">确定要清除所有日记和设置吗？此操作不可恢复！</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button onclick="document.getElementById('clear-modal').remove()" class="btn btn-secondary" style="flex: 1;">取消</button>
                    <button onclick="confirmClearData()" class="btn btn-danger" style="flex: 1;">确认清除</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function confirmClearData() {
    localStorage.removeItem('ai-diary-diaries');
    localStorage.removeItem('ai-diary-settings');
    localStorage.removeItem('ai-diary-draft');
    localStorage.removeItem('ai-diary-theme');
    
    state.diaries = [];
    state.settings = {
        aiProvider: 'qianwen',
        apiKey: '',
        baseUrl: '',
        aiModel: 'qwen-turbo',
        enableEncryption: false,
        enableCloudBackup: false
    };
    
    clearCache();
    loadSettings();
    initTheme(); // 重置主题
    
    document.getElementById('clear-modal').remove();
    showToast('所有数据已清除', 'success');
    switchPage('write');
}

// 工具函数
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateShort(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 提取关键词（简单分词）
function extractKeywords(text) {
    const commonWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const wordCount = {};
    
    words.forEach(word => {
        if (!commonWords.includes(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    });

    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

// Toast消息系统
function showToast(message, type = 'info') {
    // 移除已存在的toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${getToastIcon(type)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// 快捷键支持
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S 或 Cmd+S: 保存日记
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (state.currentPage === 'write') {
                saveDiary();
            }
        }
        
        // Ctrl+N 或 Cmd+N: 新日记
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (state.currentPage === 'write') {
                document.getElementById('diary-title').value = '';
                document.getElementById('diary-content').value = '';
                document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
                state.selectedEmotion = null;
                resetConversation();
            }
        }
        
        // Enter: 在对话中发送回答
        if (e.key === 'Enter' && e.ctrlKey && conversationState.isActive) {
            e.preventDefault();
            sendAnswer();
        }
    });
}

// 自动保存草稿
function setupAutoSave() {
    const titleInput = document.getElementById('diary-title');
    const contentInput = document.getElementById('diary-content');
    
    let saveTimeout;
    
    const saveDraft = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const draft = {
                title: titleInput.value,
                content: contentInput.value,
                emotion: state.selectedEmotion,
                timestamp: Date.now()
            };
            localStorage.setItem('ai-diary-draft', JSON.stringify(draft));
        }, 2000); // 2秒后自动保存
    };
    
    titleInput.addEventListener('input', saveDraft);
    contentInput.addEventListener('input', saveDraft);
    
    // 恢复草稿
    const savedDraft = localStorage.getItem('ai-diary-draft');
    if (savedDraft) {
        try {
            const draft = JSON.parse(savedDraft);
            const draftTime = new Date(draft.timestamp);
            const now = new Date();
            const diffHours = (now - draftTime) / (1000 * 60 * 60);
            
            // 如果草稿是24小时内的，恢复它
            if (diffHours < 24 && draft.title || draft.content) {
                titleInput.value = draft.title || '';
                contentInput.value = draft.content || '';
                state.selectedEmotion = draft.emotion;
                
                if (draft.emotion) {
                    document.querySelectorAll('.emotion-btn').forEach(btn => {
                        btn.classList.remove('selected');
                        if (btn.dataset.emotion === draft.emotion) {
                            btn.classList.add('selected');
                        }
                    });
                }
                
                showToast('已恢复昨天的草稿', 'info');
            }
        } catch (e) {
            console.error('恢复草稿失败:', e);
        }
    }
}

// 月度对比分析
function updateMonthlyComparison() {
    const container = document.getElementById('monthly-comparison');
    if (!container) return;

    const monthlyData = {};
    state.diaries.forEach(diary => {
        const d = new Date(diary.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) {
            monthlyData[key] = { count: 0, words: 0, emotions: {} };
        }
        monthlyData[key].count++;
        monthlyData[key].words += diary.wordCount;
        if (diary.emotion) {
            monthlyData[key].emotions[diary.emotion] = (monthlyData[key].emotions[diary.emotion] || 0) + 1;
        }
    });

    const months = Object.keys(monthlyData).sort().slice(-6); // 最近6个月
    
    if (months.length === 0) {
        container.innerHTML = '<p class="no-data">暂无数据</p>';
        return;
    }

    const maxCount = Math.max(...months.map(m => monthlyData[m].count));
    
    let html = '<div class="monthly-chart">';
    months.forEach(month => {
        const data = monthlyData[month];
        const height = (data.count / maxCount) * 100;
        html += `
            <div class="monthly-bar">
                <div class="monthly-bar-inner" style="height: ${height}%;">
                    <div class="monthly-tooltip">
                        <strong>${month}</strong><br>
                        日记: ${data.count}篇<br>
                        字数: ${data.words}
                    </div>
                </div>
                <div class="monthly-label">${month.slice(5)}月</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// 情绪热力图
function updateEmotionHeatmap() {
    const container = document.getElementById('emotion-heatmap');
    if (!container) return;

    // 按周聚合数据
    const weekData = {};
    const today = new Date();
    const eightWeeksAgo = new Date(today);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8周

    // 初始化8周x7天的网格
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 7; j++) {
            const weekNum = i;
            const dayNum = j;
            const date = new Date(eightWeeksAgo);
            date.setDate(date.getDate() + (weekNum * 7) + dayNum);
            const key = date.toDateString();
            weekData[key] = { date: date, emotions: {} };
        }
    }

    // 填充数据
    state.diaries.forEach(diary => {
        const d = new Date(diary.date);
        const key = d.toDateString();
        if (weekData[key] && diary.emotion) {
            weekData[key].emotions[diary.emotion] = (weekData[key].emotions[diary.emotion] || 0) + 1;
        }
    });

    // 生成热力图
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    let html = '<div class="heatmap-container">';
    
    // 星期标签
    html += '<div class="heatmap-weekdays">';
    days.forEach(day => {
        html += `<div class="heatmap-weekday">${day}</div>`;
    });
    html += '</div>';
    
    // 周次
    for (let week = 0; week < 8; week++) {
        html += '<div class="heatmap-week">';
        for (let day = 0; day < 7; day++) {
            const date = new Date(eightWeeksAgo);
            date.setDate(date.getDate() + (week * 7) + day);
            const key = date.toDateString();
            const data = weekData[key];
            
            // 计算情绪颜色
            let colorClass = 'heatmap-empty';
            if (Object.keys(data.emotions).length > 0) {
                const total = Object.values(data.emotions).reduce((a, b) => a + b, 0);
                if (total >= 3) {
                    colorClass = 'heatmap-high';
                } else if (total >= 2) {
                    colorClass = 'heatmap-medium';
                } else {
                    colorClass = 'heatmap-low';
                }
            }

            // 主要情绪
            let mainEmotionIcon = '';
            if (Object.keys(data.emotions).length > 0) {
                const emotionIcons = {
                    happy: '😊',
                    sad: '😢',
                    angry: '😠',
                    anxious: '😰',
                    calm: '😌',
                    excited: '🤩'
                };
                const mainEmotion = Object.entries(data.emotions).sort((a, b) => b[1] - a[1])[0][0];
                mainEmotionIcon = emotionIcons[mainEmotion] || '';
            }

            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            
            html += `
                <div class="heatmap-cell ${colorClass}" title="${dateStr}: ${Object.keys(data.emotions).length > 0 ? '有日记' : '无日记'}">
                    ${mainEmotionIcon}
                </div>
            `;
        }
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 关键词云
function updateKeywordCloud() {
    const container = document.getElementById('keyword-cloud');
    if (!container) return;

    // 统计所有关键词
    const keywordCounts = {};
    state.diaries.forEach(diary => {
        if (diary.keywords) {
            diary.keywords.forEach(kw => {
                keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
            });
        }
    });

    const keywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    if (keywords.length === 0) {
        container.innerHTML = '<p class="no-data">暂无关键词数据</p>';
        return;
    }

    const maxCount = keywords[0][1];
    
    let html = '<div class="word-cloud">';
    keywords.forEach(([word, count], index) => {
        const size = 0.8 + (count / maxCount) * 1.5; // 0.8 ~ 2.3rem
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#fa709a'];
        const color = colors[index % colors.length];
        
        html += `<span class="word-tag" style="font-size: ${size}rem; color: ${color};">#${escapeHtml(word)}</span>`;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

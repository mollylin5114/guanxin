# 观心

> 看见自己真正在说什么 — AI 心理投射分析工具

## 产品简介

用户输入一段话，AI 自动分析其中的**投射**、**真实感受**、**情绪**和**内在需要**，帮助人更清晰地看见自己的内心状态。

## 技术架构

- **前端**：Next.js 16，部署在 Vercel（免费）
- **AI**：DeepSeek API（`deepseek-chat` 模型）
- **限流**：Upstash Redis，每个 IP 每天 5 次
- **历史记录**：存储在用户浏览器 localStorage，不上传服务器
- **Analytics**：Vercel Analytics

## 目录结构

```
guanxin/
├── pages/
│   ├── _app.js              # 全局样式 + Vercel Analytics
│   ├── index.js             # 主页面（侧边栏历史 + 分析界面）
│   └── api/
│       ├── analyze.js       # 分析接口（调用 DeepSeek + 限流）
│       └── remaining.js     # 查询今日剩余次数
├── styles/
│   └── globals.css          # 全局 CSS 变量 + 重置
├── package.json
├── next.config.js
└── README.md
```

## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:3000
```

本地需要创建 `.env.local`：

```
DEEPSEEK_API_KEY=sk-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## 部署到 Vercel

1. 把代码推到 GitHub
2. 打开 [vercel.com](https://vercel.com)，Import 该 repo
3. Settings → Environment Variables，添加以下三个变量：
   - `DEEPSEEK_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy 生效

## 用户使用流程

1. 打开网站，直接输入想分析的文字
2. 点击「开始观心」，AI 返回四维分析结果
3. 左侧侧边栏保存历史记录，点击可回看
4. 每个 IP 每天免费使用 5 次，右上角显示剩余次数

## 成本说明

- Vercel：免费
- Upstash Redis：免费（每天 10,000 次请求额度）
- DeepSeek API：按量付费，每次分析约 ¥0.002，极低

## 自定义

- 修改每日限额：`pages/api/analyze.js` 和 `pages/api/remaining.js` 中的 `DAILY_LIMIT`
- 修改分析提示词：`pages/api/analyze.js` 中的 `systemPrompt`
- 修改配色：`pages/index.js` 中 `TYPE_CONFIG` 和 CSS 变量

# 观心

> 看见自己真正在说什么 — AI 心理投射分析工具

## 产品简介

用户输入一段话，AI 自动分析其中的**投射**、**真实感受**、**情绪**和**内在需要**，帮助人更清晰地看见自己的内心状态。

## 技术架构

- **前端**：Next.js 16，部署在 Cloudflare Workers
- **AI**：DeepSeek API（`deepseek-chat` 模型）
- **限流**：Upstash Redis，每个 IP 每天 5 次
- **历史记录**：存储在用户浏览器 localStorage，不上传服务器
- **部署适配**：OpenNext Cloudflare adapter

## 目录结构

```
guanxin/
├── pages/
│   ├── _app.js              # 全局样式
│   ├── index.js             # 主页面（侧边栏历史 + 分析界面）
│   └── api/
│       ├── analyze.js       # 分析接口（调用 DeepSeek + 限流）
│       └── remaining.js     # 查询今日剩余次数
├── styles/
│   └── globals.css          # 全局 CSS 变量 + 重置
├── wrangler.jsonc           # Cloudflare Workers 部署配置
├── open-next.config.ts      # OpenNext Cloudflare 适配配置
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

## 部署到 Cloudflare Workers

### 方式一：本地命令部署

1. 安装依赖：

```bash
npm install
```

2. 登录 Cloudflare：

```bash
npx wrangler login
```

3. 配置生产环境密钥：

```bash
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

4. 部署：

```bash
npm run deploy
```

部署成功后会得到一个 `*.workers.dev` 地址。正式对外访问建议绑定自己的域名。

### 方式二：Cloudflare 后台连接 GitHub

1. 把代码推到 GitHub
2. 打开 Cloudflare Dashboard → Workers & Pages → Create → Import a repository
3. 选择该仓库，使用以下构建/部署命令：
   - Build command：`npm run deploy`
   - Root directory：项目根目录
4. 在项目的 Variables and Secrets 中添加：
   - `DEEPSEEK_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. 重新部署生效

## 中日访问建议

- 日本访问：Cloudflare Workers 默认全球边缘网络即可。
- 中国大陆访问：建议使用自己的域名接入 Cloudflare DNS，而不要长期使用 `workers.dev` 子域名。
- 如果面向中国大陆用户做稳定商业访问，域名备案、ICP 合规、以及 Cloudflare 中国网络/国内源站方案需要单独评估；普通 Cloudflare 全球网络通常可访问，但不等同于中国大陆优化线路。
- 页面已移除 Vercel Analytics 和 PostHog，避免浏览器额外请求可能在中国大陆慢或不可达的第三方分析域名。

## 用户使用流程

1. 打开网站，直接输入想分析的文字
2. 点击「开始观心」，AI 返回四维分析结果
3. 左侧侧边栏保存历史记录，点击可回看
4. 每个 IP 每天免费使用 5 次，右上角显示剩余次数

## 成本说明

- Cloudflare Workers：按 Cloudflare 当前免费/付费额度
- Upstash Redis：免费（每天 10,000 次请求额度）
- DeepSeek API：按量付费，每次分析约 ¥0.002，极低

## 自定义

- 修改每日限额：`pages/api/analyze.js` 和 `pages/api/remaining.js` 中的 `DAILY_LIMIT`
- 修改分析提示词：`pages/api/analyze.js` 中的 `systemPrompt`
- 修改配色：`pages/index.js` 中 `TYPE_CONFIG` 和 CSS 变量

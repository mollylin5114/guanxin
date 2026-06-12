# 观心

> 看见自己真正在说什么 — AI 心理投射分析工具

## 架构说明

- **前端**：Next.js，部署在 Vercel（免费）
- **API Key**：用户自带，存储在浏览器 localStorage，不经过服务器
- **后端**：单个 Serverless Function（`/api/analyze`），仅做 Anthropic API 的代理转发
- **成本**：服务器零成本，API 费用由用户自己的 Key 承担

## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:3000
```

## 部署到 Vercel（5 分钟上线）

1. 把整个文件夹推到 GitHub（新建一个 repo）
2. 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录
3. 点击 **Add New Project** → 选择你的 repo → **Deploy**
4. 部署完成后 Vercel 会给你一个域名，如 `guanxin.vercel.app`
5. 想用自己的域名：Vercel 控制台 → Domains → 绑定即可

不需要设置任何环境变量，零配置上线。

## 目录结构

```
guanxin/
├── pages/
│   ├── _app.js          # 全局样式注入
│   ├── index.js         # 主页面（Key 设置 + 分析界面）
│   └── api/
│       └── analyze.js   # Serverless Function
├── styles/
│   └── globals.css      # 全局 CSS 变量 + 重置
├── package.json
├── next.config.js
└── README.md
```

## 用户使用流程

1. 用户访问网站，首次进入看到 API Key 填写引导
2. 填入自己的 Anthropic API Key（`sk-ant-...`），点击「开始使用」
3. Key 验证通过后存入 localStorage，进入主界面
4. 输入想分析的文字，点击「开始观心」
5. 分析结果按投射 / 真实感受 / 情绪 / 内在需要分类展示

## 自定义

- 修改分析提示词：`pages/api/analyze.js` 中的 `systemPrompt`
- 修改配色：`styles/globals.css` 中的 CSS 变量
- 修改类型标签：`pages/index.js` 中的 `TYPE_CONFIG`

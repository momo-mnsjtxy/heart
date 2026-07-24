# 心语 (Heart)

隐私优先的 AI 驱动心理咨询平台。

## 核心特性

- **AI 情感支持** — 通过 OpenAI 兼容接口调用真实大模型（支持流式回复）；未配置密钥时会明确提示，不会用模板冒充咨询
- **情绪追踪** — 本地情绪记录与趋势可视化
- **正念练习** — 盒式/4-7-8 呼吸、五感接地、身体扫描与 CBT 应对技巧
- **情绪日记** — 写作提示引导的私密日记，可选关联心情
- **隐私至上** — 数据加密存储在本地，无需注册，零追踪
- **备份恢复** — 导出 JSON 备份，并支持合并/替换导入
- **危机干预** — 内置危机关键词检测与专业求助资源（安全场景下的固定指引）
- **无痕模式** — 支持不保存对话的临时咨询

## 隐私架构

| 特性 | 说明 |
|------|------|
| 本地优先 | 所有数据存储在浏览器 IndexedDB 中 |
| 客户端加密 | 可选 AES-256-GCM：随机数据密钥经密码包裹后存储，密码本身永不落盘；启用/关闭时自动迁移现有数据 |
| 会话解锁 | 启用加密后，刷新页面需输入密码解锁才能读写本地记录 |
| 零追踪 | 无 Cookie 追踪、无分析工具、无第三方数据共享 |
| 无需注册 | 完全匿名使用 |
| 数据主权 | 随时导出、导入恢复或永久删除所有数据 |

## 技术栈

- **框架**: Next.js 15 (App Router) + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **存储**: IndexedDB (idb)
- **加密**: Web Crypto API (AES-256-GCM + PBKDF2 包裹密钥)
- **AI**: OpenAI 兼容 Chat Completions API（需配置密钥；支持流式输出）

> 本项目不使用 `next/image`。`sharp` 被本地 MIT stub 覆盖，以避免引入有漏洞的 libvips / LGPL 二进制依赖。

## 快速开始

```bash
# 安装依赖
npm install

# 配置 AI（必需，否则咨询页无法生成模型回复）
cp .env.example .env.local
# 编辑 .env.local，填入 OPENAI_API_KEY

# 开发模式
npm run dev

# 类型检查 / 测试 / 构建
npm run typecheck
npm test
npm run build
npm start
```

## 环境变量

创建 `.env.local` 文件：

```env
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` 未配置时，咨询接口会返回明确的配置提示，**不会**用关键词模板假装在做心理咨询。  
`OPENAI_API_BASE` 可指向任何兼容 OpenAI Chat Completions 协议的服务。

危机关键词检测仍会返回固定的求助热线文案——这是安全兜底，不是日常对话回复。

## 项目结构

```
src/
├── app/
│   ├── api/chat/     # AI 聊天 API（无日志代理）
│   ├── chat/         # 咨询页面
│   ├── mood/         # 情绪记录页面
│   ├── practice/     # 正念练习与应对工具
│   ├── journal/      # 情绪日记
│   ├── privacy/      # 隐私中心
│   └── page.tsx      # 首页
├── components/       # UI 组件
├── lib/
│   ├── crypto.ts     # 客户端加密
│   ├── storage.ts    # 本地存储层（加密迁移 / 导入导出）
│   ├── practices.ts  # 练习内容与写作提示
│   └── counselor.ts  # 咨询逻辑与危机检测
└── types/            # TypeScript 类型定义
```

## 重要声明

- 心语提供 AI 情感支持，**不能替代**专业心理咨询、诊断或治疗
- 对话内容会发送至 AI 服务进行处理，但**不会存储在服务器上**
- 如遇心理危机，请立即拨打专业求助热线：400-161-9995

## License

MIT

# 心语 (Heart)

隐私优先的 AI 驱动心理咨询平台。

## 核心特性

- **AI 情感支持** — 温暖、专业的 AI 咨询助手，提供情绪引导和心理支持
- **情绪追踪** — 本地情绪记录与趋势可视化
- **隐私至上** — 数据加密存储在本地，无需注册，零追踪
- **危机干预** — 内置危机检测与专业求助资源
- **无痕模式** — 支持不保存对话的临时咨询

## 隐私架构

| 特性 | 说明 |
|------|------|
| 本地优先 | 所有数据存储在浏览器 IndexedDB 中 |
| 客户端加密 | 可选 AES-256-GCM：随机数据密钥经密码包裹后存储，密码本身永不落盘 |
| 零追踪 | 无 Cookie 追踪、无分析工具、无第三方数据共享 |
| 无需注册 | 完全匿名使用 |
| 数据主权 | 随时导出或永久删除所有数据 |

## 技术栈

- **框架**: Next.js 15 (App Router) + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **存储**: IndexedDB (idb)
- **加密**: Web Crypto API (AES-256-GCM + PBKDF2 包裹密钥)
- **AI**: OpenAI API (可选，支持回退模式)

> 本项目不使用 `next/image`。`sharp` 被本地 MIT stub 覆盖，以避免引入有漏洞的 libvips / LGPL 二进制依赖。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
npm start
```

## 环境变量

创建 `.env.local` 文件（可选）：

```env
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

未配置 API Key 时，平台将使用内置的回退响应系统，仍可正常使用。

## 项目结构

```
src/
├── app/
│   ├── api/chat/     # AI 聊天 API（无日志代理）
│   ├── chat/         # 咨询页面
│   ├── mood/         # 情绪记录页面
│   ├── privacy/      # 隐私中心
│   └── page.tsx      # 首页
├── components/       # UI 组件
├── lib/
│   ├── crypto.ts     # 客户端加密
│   ├── storage.ts    # 本地存储层
│   └── counselor.ts  # 咨询逻辑与危机检测
└── types/            # TypeScript 类型定义
```

## 重要声明

- 心语提供 AI 情感支持，**不能替代**专业心理咨询、诊断或治疗
- 对话内容会发送至 AI 服务进行处理，但**不会存储在服务器上**
- 如遇心理危机，请立即拨打专业求助热线：400-161-9995

## License

MIT

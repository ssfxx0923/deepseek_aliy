# Deepseek AI Chat Interface

基于阿里云 API 的 Deepseek 大模型聊天界面，使用 Next.js 和 TypeScript 构建的现代化 Web 应用。

## 特性

- 🚀 基于 Next.js 15.2 和 React 19 构建
- 💬 实时流式响应的聊天界面
- 🎨 现代化深色主题 UI 设计
- ✨ 支持 Markdown 和数学公式渲染
- 🖥️ 代码高亮显示
- 📱 响应式设计，支持各种设备
- 🔒 安全的 API 密钥管理

## 技术栈

- **前端框架**: Next.js 15.2.0
- **UI 框架**: TailwindCSS
- **编程语言**: TypeScript
- **Markdown 渲染**: React Markdown
- **数学公式**: KaTeX
- **代码高亮**: Rehype Highlight
- **API 集成**: 阿里云 DashScope API

## 快速开始

### 前置要求

- Node.js 18.0.0 或更高版本
- 阿里云 DashScope API Key

### 安装步骤

1. 克隆仓库：
```bash
git clone [repository-url]
cd ds-1
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
   创建 `.env.local` 文件并添加以下内容：
```env
DASHSCOPE_API_KEY=your_api_key_here
ENABLE_STREAMING=true
```

4. 启动开发服务器：
```bash
npm run dev
```

现在可以访问 http://localhost:3000 查看应用。

## 部署

### Vercel 部署

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入该仓库
3. 配置环境变量：
   - `DASHSCOPE_API_KEY`
   - `ENABLE_STREAMING`
4. 部署完成后即可访问

## 项目结构

```
ds-1/
├── src/
│   ├── app/
│   │   ├── api/         # API 路由
│   │   ├── layout.tsx   # 应用布局
│   │   └── page.tsx     # 主页面
│   └── components/      # React 组件
├── public/             # 静态资源
├── styles/            # 样式文件
└── package.json       # 项目依赖
```

## 主要功能

- 实时聊天界面
- Markdown 渲染支持
- 数学公式显示
- 代码块语法高亮
- 自动滚动对话
- 响应式设计

## 开发

### 可用的命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 运行生产版本
- `npm run lint` - 运行代码检查

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

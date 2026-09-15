# Weacond

AI Financial Decision Infrastructure · 让投资变得轻松、便捷、稳健。

一个双语（中/英）、面向理性投资教育的 Next.js 网站，电子书内容通过 GitHub Actions 从 Notion 自动同步。

## Features
- 双语界面（中文 / English，语言偏好持久化到 localStorage）
- 投资电子书：内容存于 Notion，经 GitHub Actions 自动拉取为静态 JSON
- 逐页阅读体验：阅读进度条、滚动记忆、目录导航
- 语义化、可访问的导航与页面结构

## Environment Variables
在项目根目录创建 `.env.local`（已被 `.gitignore` 忽略，**切勿提交**）：

| 变量 | 说明 |
| --- | --- |
| `NOTION_API_KEY` | Notion Integration Token（`secret_...`），用于同步电子书 |
| `NOTION_EBOOK_DATABASE_ID` | 电子书数据库 ID |

> 这两个变量同时被 `.github/workflows/sync-notion.yml` 在 GitHub 仓库 Settings → Secrets 中读取。

## Getting Started
```bash
# 安装依赖
npm install

# 本地开发
npm run dev
# 打开 http://localhost:3000
```

## Scripts
| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 生成生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint（需先安装，见下） |

## 电子书同步机制
`.github/workflows/sync-notion.yml` 每小时（也可手动触发 `workflow_dispatch`）调用 Notion API，
把电子书渲染成 `public/data/ebooks/*.json` 并写回 `main` 分支；网站 `getStaticProps` 读取这些文件。
新增/更新电子书只需在 Notion 中编辑，无需改代码。

## Code Quality (可选)
已提供 `.eslintrc.json`（基于 `next/core-web-vitals`）。由于当前 `package.json` 未包含 ESLint 依赖，
安装后即可启用 lint 脚本：
```bash
npm install --save-dev eslint@8 eslint-config-next@14.2.0
```

## Deployment
任意支持 Next.js Pages Router 的平台均可（Vercel / Netlify / 自建 Node 服务器）。
部署前请在平台环境变量中配置 `NOTION_API_KEY` 与 `NOTION_EBOOK_DATABASE_ID`。

## Roadmap
- 更多语言支持
- 搜索与阅读历史
- 个性化学习路径

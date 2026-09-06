# 词雾 · 词汇灵感写作

一个本地运行、偏个人化与设计感的词汇灵感写作训练工具。所有数据（词库、收藏、草稿、历史文章）均保存在浏览器 IndexedDB 中，完全离线，无后端、无登录。

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
```

生产构建 / 预览：

```bash
npm run build      # 类型检查 + 打包到 dist/
npm run preview    # 本地预览构建产物
```

## 功能一览

- **词雾首页**选取已保存文稿/词库，变化时实时更新。
- **双词灵感**（写作台 `#/write`）：左右双词库独立/整体随机，形成「雾气 × 惆怅」词组，可收藏。
- **收藏词组**：点击即可用作今日灵感，可取消收藏。
- **长篇写作**：不限字数、自动增高、字数统计；停止输入约 650ms 自动保存草稿，刷新不丢失。
- **历史写作**：按更新时间倒序、显示开头预览，点击继续编辑、单条删除（带确认）。
- **词组管理**（`#/word-library`）：8 个原生分类 · 编辑模式（双击改名 / 新增词汇查重 / 拖拽到框外删除 / 右下角缩放板块并自动重排 / 新建分类）/ JSON、CSV 批量导入导出。
- **系统设置**（`#/settings`）：导出/导入全部文稿（自动检测重复、不覆盖现有）、词库备份。

## 技术栈

React + TypeScript + Vite + Tailwind CSS + Dexie.js（IndexedDB）+ React Router（Hash 路由，便于本地直接打开）。

## 目录结构

```
src/
├── db/db.ts            # Dexie 数据模型与数据库
├── data/seed.ts        # 8 个原生分类种子词库
├── lib/library.ts      # 词库导入导出逻辑
├── hooks/              # useToast / useWritingDraft（草稿自动保存）
├── components/         # 首页各区块与通用组件
└── pages/              # Home / WordLibrary / Settings
scripts/verify.mjs      # 无头浏览器端到端回归测试（需本机 Chrome）
```

## 数据模型（IndexedDB）

| 表 | 说明 |
|---|---|
| categories | 词库分类（含网格 colSpan/rowSpan 布局） |
| words | 词汇（categoryId 关联分类） |
| collections | 收藏词组 |
| writings | 已保存作品 |
| drafts | 单份写作草稿（id=1） |

## 端到端回归测试

```bash
node scripts/verify.mjs
```

脚本会启动无头 Chrome（需本机安装 Google Chrome），自动跑完「随机 → 收藏 → 写作 → 保存 → 刷新 → 重启浏览器」全流程并逐项断言，用于验证功能与数据持久化。

> 说明：首次打开会自动写入 8 个原生分类与约 192 个预置词汇。清除浏览器站点数据即可重置全部数据。

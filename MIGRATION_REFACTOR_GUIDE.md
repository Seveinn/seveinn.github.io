# seveinn.github.io 网站迁移与重构实施指南

> 目标：使用 `seveinn-site` 的 React/Vite 网站效果替换当前 `seveinn.github.io` 的 Jekyll 页面，同时将旧博客内容迁移为新版网站中的独立 Blog 模块。
>
> 本文档面向 Cursor 落地实施。迁移过程中以 `E:\seveinn.github.io` 为最终仓库，不覆盖或替换其 `.git` 历史。

## 1. 项目索引

### 1.1 目标仓库：当前线上网站

| 项目 | 地址 |
|---|---|
| 本地根目录 | `E:\seveinn.github.io` |
| AIWorkspace 索引地址 | `D:\AIWorkspace\seveinn.github.io` |
| Git 远程仓库 | `https://github.com/Seveinn/seveinn.github.io.git` |
| 当前分支 | `master` |
| 当前站点入口 | `E:\seveinn.github.io\index.html` |
| Jekyll 配置 | `E:\seveinn.github.io\_config.yml` |
| 旧博客内容索引 | `E:\seveinn.github.io\_posts` |
| 旧博客静态资源 | `E:\seveinn.github.io\posts`、`E:\seveinn.github.io\static` |
| 自定义域名配置 | `E:\seveinn.github.io\CNAME` |
| 当前自定义域名 | `fairycode.tech` |

### 1.2 视觉与功能来源项目：seveinn-site

| 项目 | 地址 |
|---|---|
| 本地根目录 | `D:\AIWorkspace\AIProjects\seveinn-site` |
| 页面入口 | `D:\AIWorkspace\AIProjects\seveinn-site\index.html` |
| React 入口 | `D:\AIWorkspace\AIProjects\seveinn-site\src\main.tsx` |
| 应用路由索引 | `D:\AIWorkspace\AIProjects\seveinn-site\src\App.tsx` |
| 页面模块索引 | `D:\AIWorkspace\AIProjects\seveinn-site\src\pages` |
| Blog 模块索引 | `D:\AIWorkspace\AIProjects\seveinn-site\src\pages\Blog` |
| Blog 示例数据 | `D:\AIWorkspace\AIProjects\seveinn-site\public\data\blog\articles.json` |
| 实验项目索引 | `D:\AIWorkspace\AIProjects\seveinn-site\public\experiments` |
| 构建配置 | `D:\AIWorkspace\AIProjects\seveinn-site\vite.config.ts` |
| 依赖配置 | `D:\AIWorkspace\AIProjects\seveinn-site\package.json` |
| 本地开发地址 | `http://localhost:1207` |
| 构建产物目录 | `D:\AIWorkspace\AIProjects\seveinn-site\dist` |

说明：`seveinn-site` 当前没有配置 Git 远程仓库，因此迁移时只把它当作源代码来源，不把它的 `.git`、`node_modules` 或 `dist` 复制到目标仓库。

## 2. 迁移目标与约束

### 2.1 最终目标

1. `E:\seveinn.github.io` 由 Jekyll 项目转为 React 18 + TypeScript + Vite 项目。
2. 首页、导航、作品展示、实验页面等采用 `seveinn-site` 的实现和视觉效果。
3. 旧博客文章保留 Markdown 源文件，迁入独立 Blog 模块。
4. Blog 模块与首页、实验、翻译等业务模块解耦。
5. 保留旧文章的标题、日期、分类、正文、图片和历史 URL 映射。
6. 继续使用 `fairycode.tech`，并适配 GitHub Pages 静态部署。
7. 所有迁移步骤都可分批提交、验证和回滚。

### 2.2 不在本次迁移范围内

1. 不迁移 `seveinn-site` 的 Git 历史。
2. 不沿用 `upload-to-server.bat` 中的腾讯云 SSH 上传流程。
3. 不实现在线后台、用户系统或数据库。
4. 不将浏览器 `localStorage` 作为博客正式内容源。
5. 不在首轮迁移中实现浏览器在线编辑并写回 Git。

## 3. 当前状态与迁移前风险

### 3.1 目标仓库存在未提交文章变更

当前 `_posts` 中同时存在：

- 多个旧英文文件名文章被删除；
- 多个中文文件名文章未跟踪；
- 新增文章和 `todo.md` 未跟踪。

这可能是一次尚未提交的批量重命名。迁移前必须判断删除文件与新增文件是否内容相同，避免把用户已有修改误当成迁移产物。

### 3.2 SPA 路由与 GitHub Pages

`seveinn-site` 使用 `BrowserRouter`。部署到 GitHub Pages 后，直接访问 `/blog/...`、`/experiments` 等路径可能返回 404。落地时必须增加 SPA 回退方案，不能只验证首页。

### 3.3 Blog 当前实现不适合作为正式内容系统

来源项目的 Blog 当前：

- 开发环境读取 `localStorage`；
- 生产环境读取单个 `articles.json`；
- 正文保存为 HTML；
- 使用 `dangerouslySetInnerHTML` 渲染；
- 示例索引只有一篇占位文章。

本次迁移应保留 Blog 的视觉设计，替换其内容管线。

## 4. 推荐的最终目录结构

```text
E:\seveinn.github.io
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
├─ content/
│  └─ blog/
│     ├─ 2021-03-23-vue-notes.md
│     ├─ 2021-03-26-front-end-engineering.md
│     └─ ...
├─ public/
│  ├─ CNAME
│  ├─ robots.txt
│  ├─ sitemap.xml
│  ├─ blog-assets/
│  │  └─ <article-slug>/
│  └─ experiments/
├─ scripts/
│  ├─ migrate-legacy-posts.mjs
│  ├─ build-blog-index.mjs
│  └─ generate-legacy-redirects.mjs
├─ src/
│  ├─ components/
│  ├─ modules/
│  │  └─ blog/
│  │     ├─ components/
│  │     ├─ pages/
│  │     │  ├─ BlogListPage.tsx
│  │     │  └─ BlogArticlePage.tsx
│  │     ├─ services/
│  │     │  └─ blogRepository.ts
│  │     ├─ styles/
│  │     ├─ routes.tsx
│  │     └─ types.ts
│  ├─ pages/
│  │  ├─ Home/
│  │  ├─ Experiments/
│  │  ├─ HexaLife/
│  │  └─ Translations/
│  ├─ App.tsx
│  └─ main.tsx
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
└─ vite.config.ts
```

## 5. Blog 内容模型

### 5.1 Markdown Front Matter 标准

每篇文章使用以下格式：

```yaml
---
title: 前端工程化——代码规范
slug: front-end-engineering-code-style
publishDate: 2021-03-26T14:07:24+08:00
updatedDate: 2021-03-26T14:07:24+08:00
author: Seveinn
categories:
  - 前端
  - 面试
  - Vue
tags: []
excerpt: 文章摘要
status: published
legacyUrl: /posts/2021/03/26/front-structure.html
---
```

字段规则：

| 字段 | 必填 | 规则 |
|---|---:|---|
| `title` | 是 | 保留旧文章标题 |
| `slug` | 是 | 稳定、唯一、URL 安全，迁移后不要随意修改 |
| `publishDate` | 是 | ISO 8601，保留原始时区 |
| `updatedDate` | 否 | 没有历史数据时等于发布时间 |
| `author` | 是 | 默认 `Seveinn` |
| `categories` | 是 | 数组，无分类时为空数组 |
| `tags` | 是 | 数组，不确定时不要自动杜撰 |
| `excerpt` | 是 | 优先人工摘要，否则从纯文本正文截取 |
| `status` | 是 | `published` 或 `draft` |
| `legacyUrl` | 否 | 旧 Jekyll 页面地址，用于生成重定向 |

### 5.2 TypeScript 数据结构

```ts
export interface BlogArticleMeta {
  title: string;
  slug: string;
  publishDate: string;
  updatedDate?: string;
  author: string;
  categories: string[];
  tags: string[];
  excerpt: string;
  status: 'draft' | 'published';
  legacyUrl?: string;
}

export interface BlogArticle extends BlogArticleMeta {
  content: string;
}
```

### 5.3 内容索引策略

推荐使用“Markdown 原文 + 构建时 JSON 索引”：

1. `content/blog/*.md` 是唯一事实来源。
2. `scripts/build-blog-index.mjs` 解析 Front Matter。
3. 构建脚本生成文章列表索引和正文数据。
4. React 页面只通过 `blogRepository` 读取数据。
5. 生产构建只包含 `status: published` 的文章。
6. 草稿可以在开发模式显示，但不得进入 sitemap。

不要手工维护两份文章数据，也不要同时把 Markdown 和 `articles.json` 都当作可编辑源。

## 6. 路由设计

### 6.1 新路由

| 路由 | 页面 |
|---|---|
| `/` | 首页 |
| `/translations` | 翻译模块 |
| `/experiments` | 实验项目索引 |
| `/blog` | 博客列表 |
| `/blog/:slug` | 博客文章 |

不再使用来源项目中的 `/blog/article/:id`。文章 URL 应基于稳定的 `slug`，避免内容索引重新排序后地址变化。

### 6.2 旧 URL 兼容

旧 Jekyll 路由规则为：

```text
/posts/:year/:month/:day/:title.html
```

迁移脚本应读取每篇文章的 `legacyUrl`，为它生成静态跳转页面。例如：

```text
dist/posts/2021/03/26/front-structure.html
```

跳转目标：

```text
/blog/front-end-engineering-code-style
```

跳转页面至少包含：

- `<meta http-equiv="refresh">`；
- canonical 链接；
- JavaScript `location.replace`；
- 可点击的新地址兜底链接。

## 7. 分阶段迁移步骤

## 阶段 0：建立基线

### 操作

1. 在目标仓库运行 `git status --short`。
2. 对 `_posts` 中已删除与未跟踪文件做内容配对。
3. 确认中文文件名是重命名还是新副本。
4. 将用户已有文章调整单独提交，或至少创建完整备份。
5. 记录当前线上首页、分类页、文章页截图。
6. 导出旧文章清单：文件名、标题、日期、分类、旧 URL、图片引用。
7. 创建迁移分支：`codex/migrate-seveinn-site`。

### 完成标准

- 工作区状态可解释；
- 没有来源不明的删除；
- 旧文章数量和资源数量有基线记录；
- 可以从迁移分支安全回退到 `master`。

## 阶段 1：迁入 React/Vite 应用骨架

### 从来源项目复制

```text
src/
public/experiments/
public/robots.txt
public/sitemap.xml（后续重建）
index.html
package.json
package-lock.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```

### 禁止复制

```text
.git/
node_modules/
dist/
.cursor/
.vscode/（除非确认团队需要）
upload-to-server.bat
```

### 操作注意

1. 不得替换目标仓库 `.git`。
2. 先保留旧 Jekyll 文件，等 React 构建验证完成后再清理。
3. 把目标仓库 `CNAME` 复制或移动到 `public/CNAME`。
4. 检查 `vite.config.ts` 的 `base`：自定义域名部署在根路径时使用 `/`。
5. 修正文档中端口描述与实际配置不一致的问题；实际 Vite 端口为 `1207`。

### 验证

```bash
npm ci
npm run build
npm run dev
```

检查首页、导航、作品卡片、弹窗、移动端布局和实验页面。

## 阶段 2：拆分 Blog 独立模块

### 操作

1. 将 `src/pages/Blog` 移动并重构为 `src/modules/blog`。
2. 建立 `types.ts`、`services/blogRepository.ts` 和独立路由定义。
3. Blog 页面不直接读取 `localStorage` 或硬编码 JSON 路径。
4. 列表页只依赖 `BlogArticleMeta[]`。
5. 文章页按 `slug` 加载单篇文章。
6. 使用 Markdown 渲染器渲染正文。
7. 对正文中的原始 HTML采用明确策略：默认禁用，确需支持时增加 HTML 清理。
8. 首轮移除或隐藏 Editor 页面，避免产生无法写回仓库的数据。

### 完成标准

- Blog 模块可以独立替换数据来源；
- 主应用只负责挂载 Blog 路由；
- 没有生产环境 `localStorage` 内容依赖；
- 不再直接渲染未经处理的任意 HTML 字符串。

## 阶段 3：建立博客构建管线

### 推荐依赖

- Front Matter 解析：`gray-matter` 或同类库；
- Markdown：复用项目已有 `react-markdown`，或统一使用 `marked`；
- 代码高亮：根据现有视觉选择轻量高亮库；
- HTML 清理：只有允许 Markdown 内嵌 HTML 时才增加 `rehype-sanitize` 等方案。

不要同时保留两套 Markdown 渲染路线。Cursor 落地时应选定一种并删除未使用依赖。

### 构建流程

```text
prebuild
  ├─ 校验 Markdown 元数据
  ├─ 生成文章索引
  ├─ 复制或生成正文数据
  ├─ 生成旧 URL 重定向
  └─ 生成 sitemap

build
  └─ tsc + vite build
```

### 校验规则

- `slug` 不得重复；
- `publishDate` 必须可解析；
- `status` 必须合法；
- `legacyUrl` 不得重复；
- 图片路径必须存在；
- 生产索引不得包含草稿；
- 构建遇到非法文章时失败，而不是静默忽略。

## 阶段 4：迁移旧文章

### 文章处理顺序

1. 读取 `_posts` 下所有 `.md` 和 `.markdown`。
2. 解析 Jekyll Front Matter。
3. 去掉 `layout` 字段。
4. 保留 `title`、`date`、`categories`。
5. 生成稳定的英文或拼音 `slug`。
6. 根据旧文件名和 `_config.yml` 生成 `legacyUrl`。
7. 保留 Markdown 正文，不转为 HTML 存档。
8. 对没有标准 Front Matter 的文章生成异常报告，手工处理。
9. 将迁移结果写入 `content/blog`。
10. 生成文章迁移对照表。

### 迁移对照表格式

```text
旧文件 | 旧 URL | 新文件 | 新 URL | 图片数 | 状态 | 备注
```

每一篇旧文章都必须在表中出现一次，不能只比较文件总数。

### 摘要策略

优先级：

1. 使用文章已有摘要；
2. 人工填写重要文章摘要；
3. 移除 Markdown 标记、代码块和 HTML 后截取前 120～180 个字符。

不要把代码块内容作为摘要。

## 阶段 5：迁移文章图片与链接

当前已发现：

- `react-lifecycle.png`；
- `vue-render-flow.jpg`。

目标结构示例：

```text
public/blog-assets/react-basic/react-lifecycle.png
public/blog-assets/vue-principle/vue-render-flow.jpg
```

正文统一使用根路径：

```markdown
![React 生命周期](/blog-assets/react-basic/react-lifecycle.png)
```

处理规则：

1. 扫描 Markdown 图片语法和 HTML `<img>`。
2. 解析相对路径时以旧文章实际发布路径和资源目录为依据。
3. 统一文件名大小写，避免 Windows 正常、Linux 部署失败。
4. 检查内部文章链接并更新到 `/blog/:slug`。
5. 外部链接保持不变，但生成失效链接报告。

## 阶段 6：SEO、域名与 SPA 回退

### CNAME

确保存在：

```text
public/CNAME
```

内容：

```text
fairycode.tech
```

构建后必须验证：

```text
dist/CNAME
```

### 页面元数据

使用项目已有 `react-helmet-async`：

- 首页设置站点标题和描述；
- Blog 列表设置博客描述；
- 每篇文章设置独立 title、description、canonical；
- 文章草稿不得生成 canonical 或 sitemap 条目。

### SPA 回退

推荐保留 `BrowserRouter` 和干净 URL，生成适配 GitHub Pages 的 `404.html` 回退页面。验收时必须直接在新标签页访问深层路径并刷新。

如果无法稳定实现回退，再退而使用 `HashRouter`。不要在未验证前默认 GitHub Pages 能处理所有 React 路由。

### sitemap 与 robots

不要继续使用来源项目中的静态占位 sitemap。构建时根据以下内容重新生成：

- 固定页面；
- 已发布文章；
- 需要公开索引的实验页面。

## 阶段 7：GitHub Pages 自动部署

新增 GitHub Actions 工作流：

1. 拉取代码；
2. 安装 Node；
3. 执行 `npm ci`；
4. 执行测试和构建；
5. 上传 `dist`；
6. 部署到 GitHub Pages。

建议 Node 版本固定在当前 LTS，并在本地与 CI 使用同一版本。

在首次切换线上发布方式前，确认仓库 Pages 设置使用 GitHub Actions，而不是继续从 Jekyll 分支目录直接发布。

## 阶段 8：清理旧 Jekyll 代码

只有在新站构建、博客和旧 URL 都通过验收后，才删除：

```text
_includes/
_layouts/
pages/
static/
_config.yml
Gemfile
blog.sh
旧 Jekyll index.html
```

`_posts` 的处理顺序：

1. 完成全部迁移；
2. 对照表逐篇验收；
3. 创建归档提交或迁移标签；
4. 再从主构建目录移除 `_posts`。

## 8. 测试与验收清单

### 8.1 构建质量

- [ ] `npm ci` 成功；
- [ ] TypeScript 检查成功；
- [ ] `npm run build` 成功；
- [ ] 没有未使用的 Blog 旧依赖；
- [ ] 构建产物不包含草稿；
- [ ] `dist/CNAME` 存在；
- [ ] `dist/404.html` 存在；
- [ ] sitemap 内容为新域名和新路由。

### 8.2 页面功能

- [ ] 首页视觉与来源项目一致；
- [ ] 桌面端和移动端导航正常；
- [ ] Translations、Experiments 等页面正常；
- [ ] 所有实验 iframe 或独立页面可访问；
- [ ] Blog 列表按发布时间倒序；
- [ ] 分类、标签显示正确；
- [ ] 文章页代码块、列表、引用和图片正常；
- [ ] 不存在中文乱码；
- [ ] 不存在控制台关键错误。

### 8.3 内容完整性

- [ ] 每篇旧文章均有迁移对照记录；
- [ ] 新旧文章数量一致，异常项有说明；
- [ ] 标题一致；
- [ ] 发布时间一致；
- [ ] 分类没有丢失；
- [ ] 正文没有截断；
- [ ] 图片没有 404；
- [ ] 内部链接已更新。

### 8.4 路由与 SEO

- [ ] `/` 可访问；
- [ ] `/blog` 可访问；
- [ ] `/blog/:slug` 直接打开和刷新都正常；
- [ ] 旧 `/posts/...html` 地址可以跳转；
- [ ] 未知路由进入合理的 404 页面；
- [ ] 页面 title、description、canonical 正确；
- [ ] sitemap 不包含草稿和失效地址。

## 9. 推荐提交批次

每个批次必须能单独审查：

1. `chore: snapshot legacy blog content`
2. `chore: initialize vite react application`
3. `feat: migrate seveinn site pages and styles`
4. `refactor: isolate blog feature module`
5. `feat: add markdown blog content pipeline`
6. `content: migrate legacy jekyll posts`
7. `feat: preserve legacy post redirects`
8. `ci: deploy vite site to github pages`
9. `chore: remove legacy jekyll implementation`

不要把所有迁移内容压成一个提交，否则出现线上问题时无法局部回退。

## 10. 回滚策略

### 代码回滚

- 所有实施在迁移分支完成；
- 合并前为当前线上版本创建 Git 标签；
- 每个阶段独立提交；
- 线上异常时优先回滚部署提交或恢复旧 Pages 发布方式。

### 内容回滚

- 旧 `_posts` 在全部验收前不删除；
- 保留文章迁移对照表；
- 图片迁移使用复制，不在首轮直接移动源文件；
- 只有最终清理阶段才删除旧内容目录。

## 11. Cursor 执行提示词建议

建议按阶段逐条交给 Cursor，不要一次要求完成全部迁移。

第一轮：

```text
阅读 MIGRATION_REFACTOR_GUIDE.md。只执行“阶段 0：建立基线”。
不要修改或删除文章。分析 _posts 中已删除与未跟踪文件是否属于重命名，
输出逐文件对照表、异常项和建议的基线提交内容。
```

第二轮：

```text
阅读 MIGRATION_REFACTOR_GUIDE.md。执行“阶段 1：迁入 React/Vite 应用骨架”。
以 D:\AIWorkspace\AIProjects\seveinn-site 为来源，
以 E:\seveinn.github.io 为最终仓库。不得复制 .git、node_modules、dist，
不得删除旧 Jekyll 博客。完成后运行构建并汇报修改文件和验证结果。
```

第三轮：

```text
阅读 MIGRATION_REFACTOR_GUIDE.md。执行阶段 2 和阶段 3。
将 Blog 重构为独立模块，以 content/blog Markdown 为唯一内容来源。
先实现内容模型、索引生成、校验和路由，不迁移全部旧文章。
使用一篇样例文章完成端到端验证。
```

第四轮：

```text
阅读 MIGRATION_REFACTOR_GUIDE.md。执行阶段 4 和阶段 5。
迁移全部旧 Jekyll 文章和图片，生成逐篇迁移对照表。
不得静默跳过无法解析的文章；异常项必须停止或单独报告。
```

第五轮：

```text
阅读 MIGRATION_REFACTOR_GUIDE.md。执行阶段 6 和阶段 7。
完成 CNAME、SEO、sitemap、GitHub Pages SPA 回退和自动部署配置。
验证所有深层路由可以直接访问和刷新。
```

第六轮：

```text
阅读 MIGRATION_REFACTOR_GUIDE.md。按第 8 节完成全量验收。
只有在所有内容、图片、旧 URL 和构建检查通过后，
才提出旧 Jekyll 文件清理清单。先不要删除，等待人工确认。
```

## 12. 最终完成定义

只有同时满足以下条件，迁移才算完成：

1. 新站视觉和主要功能已替换旧 Jekyll 首页；
2. 全部旧文章已进入独立 Blog 模块；
3. 每篇文章均有可追踪的新旧地址映射；
4. 图片、代码块、中文内容和元数据无损；
5. 新路由直接访问和刷新正常；
6. 旧 URL 不产生大面积 404；
7. `fairycode.tech`、CNAME、sitemap 和 SEO 正常；
8. GitHub Actions 能从干净环境完成构建部署；
9. 旧 Jekyll 内容已归档且可以恢复；
10. 工作区无来源不明的删除、未跟踪文件或构建产物。

# Phase 0 基线报告

- branch: `master`
- generated: 2026-08-11
- 来源站点 `D:\AIWorkspace\AIProjects\seveinn-site`: 存在
- CNAME: `fairycode.tech`
- 旧 permalink: `/posts/:year/:month/:day/:title.html`

## 结论摘要

`_posts` 中 9 个已删除英文文件名文章，与 9 个未跟踪中文文件名文章是**一一对应的重命名**（标题/日期/分类一致）。

- 其中 **8 篇**为纯重命名（正文归一化换行后完全一致，仅 LF→CRLF）。
- **1 篇有正文增补**：`vue-note` → `vue笔记`（约 +16/-3 行，补充了 key 说明、组件通信表述、composition API）。
- 另有 **3 篇旧文章未改名**，仍保持 tracked。
- 另有 **3 个新增/杂项文件**，不是这次重命名的一部分。

## 重命名对照表

| 旧文件 | 新文件 | 内容关系 | 标题 | 日期 | 旧 URL |
|---|---|---|---|---|---|
| `2021-03-23-vue-note.markdown` | `vue笔记.markdown` | 重命名 + **正文有改动** | 前端面试整理 | 2021-03-23 14:07:24 +0800 | `/posts/2021/03/23/vue-note.html` |
| `2021-03-24-vue-advance.markdown` | `vue高级特性.markdown` | 纯重命名（仅 CRLF） | Vue 高级特性 | 2021-03-23 14:07:24 +0800 | `/posts/2021/03/24/vue-advance.html` |
| `2021-03-24-vue-basic.markdown` | `vue基础.markdown` | 纯重命名（仅 CRLF） | Vue 基本使用 | 2021-03-24 14:07:24 +0800 | `/posts/2021/03/24/vue-basic.html` |
| `2021-03-24-vue-principle.markdown` | `vue原理.markdown` | 纯重命名（仅 CRLF） | Vue 原理 | 2021-03-24 14:07:24 +0800 | `/posts/2021/03/24/vue-principle.html` |
| `2021-03-26-vue-exam.markdown` | `vue面试.markdown` | 纯重命名（仅 CRLF） | 前端面试——Vue 真题 | 2021-03-26 15:07:24 +0800 | `/posts/2021/03/26/vue-exam.html` |
| `2021-03-27-vue3-exam.markdown` | `vue3面试.markdown` | 纯重命名（仅 CRLF） | 前端面试——Vue3 真题 | 2021-03-27 15:07:24 +0800 | `/posts/2021/03/27/vue3-exam.html` |
| `2021-03-31-react-advanced.markdown` | `react高级特性.markdown` | 纯重命名（仅 CRLF） | 前端面试——React 高级特性 | 2021-03-31 15:07:24 +0800 | `/posts/2021/03/31/react-advanced.html` |
| `2021-03-31-react-basic.markdown` | `react基础.markdown` | 纯重命名（仅 CRLF） | 前端面试——React 基本使用 | 2021-03-31 15:07:24 +0800 | `/posts/2021/03/31/react-basic.html` |
| `2021-03-31-react-exam.markdown` | `react面试.markdown` | 纯重命名（仅 CRLF） | 前端面试——React | 2021-03-31 15:07:24 +0800 | `/posts/2021/03/31/react-exam.html` |

## 未改名、仍 tracked 的文章

| 文件 | 标题 | 日期 | 旧 URL |
|---|---|---|---|
| `2021-03-26-front-structure.markdown` | 前端工程化——代码规范 | 2021-03-26 14:07:24 +0800 | `/posts/2021/03/26/front-structure.html` |
| `2021-03-26-read-note.markdown` | 前端阅读记录 | 2021-03-26 15:07:24 +0800 | `/posts/2021/03/26/read-note.html` |
| `2021-03-31-react-other.markdown` | 前端面试——Redux/React-router | 2021-03-31 15:07:24 +0800 | `/posts/2021/03/31/react-other.html` |

## 异常 / 杂项未跟踪文件

| 文件 | 大小 | 判定 | 建议 |
|---|---:|---|---|
| `2022-05-13-动画师生存手册.markdown` | 0 | 空文件占位 | 基线提交可排除，或标为 draft 待补正文 |
| `todo.md` | 358 | 个人 TODO，无 Jekyll front matter | **不要当博客文章迁移**；可归档到别处或排除 |
| `面试问题汇总.md` | 676 | 零散笔记，无 front matter | 迁移前需手工补元数据，或标为 draft/notes |

## `vue笔记` 正文改动要点

相对 HEAD 旧版，新增/调整了：

1. `v-for` / `key` 的复用与更新说明
2. 组件通信表述更泛化（props/$emit、vuex/缓存）
3. 新增 `composition API`（setup / ref / reactive）小节

完整 diff 见 `migration-phase0-vue-note.diff`。

## 文章与图片基线

### HEAD 文章数

- 旧 tracked 文章：**12**
- 当前目录可见文章文件：15（含 9 个重命名结果 + 3 个未改名 + 3 个杂项）
- 可迁移正式文章候选：**12**（以旧 12 篇为准，采用中文文件名版本内容，其中 1 篇含用户已有增补）

### 图片资源

| 路径 | 大小 | 被引用处 |
|---|---:|---|
| `posts/2021/03/26/vue-render-flow.jpg` | 86048 | `vue原理.markdown` |
| `posts/2021/03/31/vue-render-flow.jpg` | 86048 | （同图副本） |
| `posts/2021/03/31/react-lifecycle.png` | 49655 | `react基础.markdown` |

正文中的引用：

- `react基础.markdown`: `react-lifecycle.png`
- `vue原理.markdown`: `vue-render-flow.jpg` 与 `./posts/2021/03/26/vue-render-flow.jpg`

### static/

共 16 个文件（css/js/font/img/xml），属旧 Jekyll 主题资源，迁移阶段 8 再清理。

## 风险说明

1. **中文文件名且无 `YYYY-MM-DD-` 前缀**：当前若仍用 Jekyll 发布会失效；迁移到 React Blog 前不要把该工作区状态直接推到线上 Pages。
2. **日期取自 front matter，不取新文件名**：legacyUrl 必须按旧英文 slug 生成。
3. **`vue笔记` 不是无损重命名**：基线提交应保留新内容，并在备注中标明有用户增补。

## 建议的基线提交内容

建议提交信息：`chore: snapshot legacy blog content`

建议纳入：

1. 9 组旧英文删除 + 新中文文件（作为 rename + 1 篇内容更新）
2. 保持 3 篇未改名文章不动
3. 可选：`MIGRATION_REFACTOR_GUIDE.md` 单独 docs 提交，或并入迁移分支首个提交

建议排除或另议：

1. `todo.md`（非文章）
2. 空的 `2022-05-13-动画师生存手册.markdown`
3. `面试问题汇总.md`（缺 front matter，需手工处理）
4. 本报告与临时 diff 文件（`migration-phase0-*`、`scripts/_phase0_*`）

下一步操作建议：

1. 创建分支 `codex/migrate-seveinn-site`
2. 在该分支提交上述基线快照
3. （可选）打标签标记当前线上可回退点，例如 `pre-migrate-jekyll`
4. 再进入阶段 1

## 阶段 0 完成标准核对

- [x] 工作区状态可解释（重命名 + 1 篇增补 + 3 杂项）
- [x] 没有来源不明的删除（9 删均已配对）
- [x] 旧文章数量与图片资源有基线记录（12 文 / 3 图文件）
- [ ] 迁移分支尚未创建（等待确认后创建并提交）

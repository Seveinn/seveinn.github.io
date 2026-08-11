这份文档整理了《符文防线：蒸汽平台版》的核心设计规范。你可以将此内容保存为 `DESIGN_SYSTEM.md` 或直接添加到 `.cursorrules` 中，以便 Cursor 在后续开发中保持 UI/UX 的一致性。

---

# 符文防线 (Rune Defender) - Steam版 UI 设计规范

## 1. 设计哲学 (Design Philosophy)
*   **沉浸感 (Immersive)**：使用深色背景、微光粒子和动态 SVG，营造神秘的魔法/科幻氛围。
*   **主机优先 (Console First)**：UI 布局专为 16:9 大屏设计，交互逻辑适配手柄/键盘（非触屏逻辑）。
*   **流畅性 (Fluidity)**：强调高帧率动画、平滑过渡和即时的操作反馈。
*   **极简主义 (Minimalism)**：无多余装饰，使用半透明毛玻璃材质和细线条分割层级。

## 2. 色彩系统 (Color System)
必须使用 CSS 变量管理颜色，严禁硬编码颜色值。

### 核心调色板
| 变量名 | 色值 (参考) | 用途 |
| :--- | :--- | :--- |
| `--bg-color` | `#0b0c15` | 全局背景底色（极深蓝） |
| `--panel-bg` | `rgba(20, 22, 35, 0.75)` | 面板背景（带透明度） |
| `--glass-border`| `1px solid rgba(255, 255, 255, 0.08)` | 面板/卡片描边 |
| `--text-main` | `#ffffff` | 主要文字 |
| `--text-dim` | `#8a8d9f` | 次要文字、标签、说明 |

### 强调色 (Accents)
| 变量名 | 色值 | 用途 |
| :--- | :--- | :--- |
| `--accent-cyan` | `#4deeea` | **主交互色**。选中状态、升级按钮、雷电/普通技能 |
| `--accent-gold` | `#f9ca24` | **资源色**。金币、高亮、群体/物理技能 |
| `--accent-red` | `#ff4757` | **警示/终极色**。终极技能、危险操作、不可用状态 |
| `--accent-green`| `#00ff00` | **防御色**。护盾、生命值、安全状态 |

## 3. 排印与字体 (Typography)
*   **字体栈**：优先使用无衬线字体，确保中文显示现代感。
    *   `font-family: 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', sans-serif;`
*   **字间距 (Letter Spacing)**：
    *   标题/标签：`letter-spacing: 1px ~ 2px` (增加呼吸感，模拟电影字幕)。
    *   正文：默认或 `0px` (保证长文本可读性)。
*   **层级 (Hierarchy)**：
    *   **Page Title**: N/A (通常隐藏，由视觉中心代替)
    *   **Detail Title**: `42px`, Bold, Uppercase-style.
    *   **Section Header**: `16px`, Color: `--text-dim`, Bottom Border.
    *   **Body Text**: `16px`, Line-height: `1.6` ~ `1.8`, Color: `#ddd` (非纯白).

## 4. 布局与容器 (Layout & Containers)

### 整体结构
*   采用 **Master-Detail (列表-详情)** 布局。
*   **侧边栏 (Sidebar)**：宽度固定 (约 300-350px)，负责导航/选择。
*   **主面板 (Main Panel)**：占据剩余空间 (`flex: 1`)，负责展示与操作。
*   **外边距**：屏幕边缘保留 `4% ~ 5%` 的安全边距 (Safe Area)。

### 材质效果 (Material)
所有面板组件（Card, Sidebar, Modal）需应用 **Glassmorphism**：
```css
background: var(--panel-bg);
backdrop-filter: blur(20px); /* 强模糊 */
border: var(--glass-border);
box-shadow: 0 20px 50px rgba(0,0,0,0.5); /* 深度感阴影 */
border-radius: 6px ~ 12px;
```

## 5. 组件规范 (Component Rules)

### A. 列表项 (List Item)
*   **默认态**：透明背景，低透明度文字。
*   **悬停/选中态 (Active/Hover)**：
    *   背景变亮：`rgba(77, 238, 234, 0.1)`。
    *   **位移**：向右平移 `transform: translateX(8px)`。
    *   **指示条**：左侧出现发光竖条 (`box-shadow` 辉光)。
    *   **图标**：颜色变为 `--accent-cyan`。

### B. 按钮 (Buttons)
*   **形状**：大尺寸，必须使用 **多边形切角 (Clip-path)** 增加科幻感。
    *   `clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);`
*   **颜色**：默认白色/浅灰背景 + 黑色文字（高对比度）。
*   **Hover**：背景变为 `--accent-cyan`，整体放大 `scale(1.05)`。
*   **Click**：微缩 `scale(0.95)`。
*   **Disabled**：背景深灰，鼠标事件禁用，透明度降低。

### C. 符文预览 (Rune Preview)
*   必须使用 SVG `stroke` 描边。
*   必须包含 `stroke-dashoffset` 动画，模拟“手绘过程”。
*   容器背景使用径向渐变 `radial-gradient` 营造聚光灯效果。

### D. 按键提示 (Key Hints)
*   视觉样式：类似实体键盘键帽。
*   背景：`#eee` (浅色)，文字：`#000` (深色)。
*   底部阴影：`box-shadow: 0 2px 0 #999` (立体感)。
*   位置：通常位于按钮内部左侧，或屏幕底部固定栏。

## 6. 动效规范 (Animation & Motion)

| 动效类型 | 描述 | 参数参考 |
| :--- | :--- | :--- |
| **Hover 响应** | 列表项位移、按钮缩放 | `transition: all 0.2s ease` |
| **路径绘制** | SVG 线条生长 | `animation: drawPath 2s ease-in-out infinite` |
| **背景氛围** | 粒子缓慢上升 | `animation: bgMove 60s linear infinite` |
| **模态/切页** | 淡入淡出 | `opacity` + `backdrop-filter` 过渡 |

## 7. 代码实现准则 (Implementation Guidelines)
1.  **用户禁止选择**：全局设置 `user-select: none`，防止拖拽文本破坏沉浸感。
2.  **滚动条隐藏**：保留滚动功能但隐藏原生滚动条样式 (`::-webkit-scrollbar` 设置极细或隐藏)。
3.  **SVG 图标**：优先使用 `currentColor` 作为 `stroke` 或 `fill` 颜色，以便随 CSS 状态改变颜色。
4.  **键盘监听**：所有可点击元素必须支持键盘映射（如 `Enter` 触发 `click`，`ArrowUp/Down` 切换列表焦点）。

---

**给 Cursor 的提示 (Prompt for Cursor):**
> "When generating UI code for this project, strictly adhere to the 'Rune Defender Steam Edition' design system. Use the defined CSS variables, enforce the glassmorphism style, ensure keyboard accessibility, and apply the specific animation curves defined in the documentation."
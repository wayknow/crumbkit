# CrumbKit — 隐私优先的浏览器 Cookie 编辑器

> Chrome 扩展（MV3），MIT 开源。已上架 CWS。

## 项目概览

- **技术栈**：Vanilla JS + ES modules，零框架依赖，CSS 变量驱动主题
- **测试**：`npm test`（76 个测试，Puppeteer e2e + Node 原生 test runner）
- **当前状态**：v1.0.0 已发布 CWS（从 CookieClear 代码库衍生，全新品牌）
- **详细状态**：[STATUS.md](STATUS.md)
- **产品规格**：[PRODUCT.md](PRODUCT.md)
- **商店文案**：[docs/store-listing.md](docs/store-listing.md)

## 关键架构

- popup 通过 `<script type="module" src="popup.js">` 加载，ES module `import` 解析依赖
- 模块关系：`popup.js → cookies.js / classify.js / export.js / import.js / storage.js / undo.js`
- `classify.js` 通过 `chrome.runtime.getURL()` 加载打包的 tracking-domains.json（101 条域名）
- Cookie 分类：name 正则匹配 → domain 匹配追踪器列表 → 隐私评分 0-100
- 撤销栈：内存中维护（popup 会话内有效），最大 50 条
- 域名白名单：`chrome.storage.local` 持久化，批量删除时跳过
- 定价：**完全免费**，无 Pro 层级，作为 ClearJSON/SnapMark 的获客入口
- 定位：免费、开源、零追踪的现代 MV3 cookie 编辑器
- 不做：Pro 付费、订阅、广告、数据收集、云端同步、用户账号

## 项目结构

```
├── manifest.json
├── src/
│   ├── popup/         # popup.html / popup.css / popup.js
│   ├── options/       # options.html / options.css / options.js
│   ├── utils/         # cookies / classify / export / import / storage / undo
│   └── background/    # service-worker.js
├── data/              # tracking-domains.json
├── icons/             # icon16/48/128.png
├── promo/             # CWS 宣传图 (small/large/marquee)
├── screenshots/       # CWS 截图 + 生成脚本
└── docs/              # store-listing.md
```

## 本地测试

- 在 Chrome `chrome://extensions` 中「加载已解压的扩展程序」，选择项目根目录
- 打开任意网站，点击 toolbar 中 CrumbKit 图标即可测试 popup
- 截图生成：`node screenshots/generate.js`

## 商店素材

- 截图：`screenshots/01-popup-list.png` / `02-edit-export.png` / `03-options-whitelist.png`
- 宣传图：`promo/small-tile.png` (440×280) / `large-tile.png` (920×680) / `marquee-tile.png` (1400×560)
- 文案：`docs/store-listing.md`

## 工作约定

- 改动功能或修复问题后更新 PRODUCT.md / STATUS.md 同步状态
- 提交前跑 `npm test`，76 个测试必须全部通过
- 提交信息包含改动说明 + `Co-Authored-By: Claude <noreply@anthropic.com>`
- 推送到 `git@github.com:wayknow/crumbkit.git`，分支 `main`
- 上下文快满时说"做检查点"：更新文档 → git commit → 提示清空重启

## CWS 注意事项

- **禁止在商店元数据中使用竞品名称**（标题、描述、关键词、截图）
- 隐私权规范标签页必须填写所有权限的理由说明
- 截图必须 1280×800，宣传图尺寸见上

## 设计系统

所有 UI 相关任务必须应用此设计系统。

### Chrome 扩展约束
- 技术栈：Vanilla HTML/CSS/JS，零框架，零构建步骤
- 样式：全部写在 `.css` 文件，禁止内联 `style` 属性
- Popup 窗口：最大宽度 400px，紧凑布局，无滚动条溢出
- 图标：内联 SVG 或 PNG，禁止外部字体/图标库（CSP 限制）
- 字体栈：`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- 颜色：暗色主题为主，CSS 变量定义，支持通过 `prefers-color-scheme` 响应
- 禁止：外部 CSS/JS CDN、Google Fonts、第三方 UI 库

### 视觉规范
- 间距：4px 基数系统（4, 8, 12, 16, 24, 32）
- 圆角：按钮/输入框 6px，卡片 12px，模态框 16px
- 阴影：仅用于模态和浮动元素，`0 4px 12px rgba(0,0,0,0.3)`
- 边框：1px `rgba(255,255,255,0.08)` 分隔线
- 主色调：`#3B82F6`（操作按钮）、`#10B981`（成功）、`#EF4444`（危险）
- 背景层级：`#0F0F0F`（底层）→ `#1A1A1A`（卡片）→ `#242424`（悬浮）

### 动画与微交互
- 仅 CSS transition，禁止 JS 动画库
- 时长 ≤ 200ms，使用 `ease-out` 或 `cubic-bezier(0.4, 0, 0.2, 1)`
- 仅操作 `transform` 和 `opacity`，避免触发布局重排
- 按钮 hover：`opacity 0.8 → 1.0`，或 `translateY(-1px)`
- 加载状态：CSS 脉冲动画，禁止 GIF/视频
- 尊重 `prefers-reduced-motion`

### 组件规范
- 按钮：明确 hover/active/focus-visible 状态，focus 用 2px outline
- 输入框：可见标签 + 错误状态，placeholder 颜色 `#6B7280`
- 卡片：一致的内边距（16px），无突兀阴影
- 图标按钮：24×24pt，aria-label 必须
- Toast 通知：底部居中，自动消失（3s），CSS slide-up 进入

### 无障碍
- 所有交互元素可键盘导航（Tab 顺序合理）
- 图标按钮必须有 `aria-label`
- 颜色对比度 ≥ 4.5:1（暗色主题下特别注意）
- 表单错误：文字说明 + 红色边框，不仅靠颜色区分
- 焦点指示器：清晰可见，不依赖 hover

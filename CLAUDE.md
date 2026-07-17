# CrumbKit — 隐私优先的浏览器 Cookie 编辑器

> Chrome 扩展（MV3），MIT 开源。CWS 审核中。

## 项目概览

- **技术栈**：Vanilla JS + ES modules，零框架依赖，CSS 变量驱动主题
- **测试**：`npm test`（76 个测试，Puppeteer e2e + Node 原生 test runner）
- **当前状态**：v1.0.0 全新项目，准备提交 CWS（从 CookieClear 代码库衍生，全新品牌）
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

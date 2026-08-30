# 算得清 Design System Builder（Figma 插件）

一次性构建插件：在 Figma 文件里运行一次，自动生成「算得清 · Design System」全套结构——8 个页面 + SDQ Core 变量集 + 10 类组件。

## 运行步骤

1. Figma 网页或桌面端，**新建一个设计文件**（或打开你想承载 Design System 的文件）
2. 左上角主菜单 → **Plugins → Development → Import plugin from manifest…** → 选择本目录的 `manifest.json`
3. 运行 **算得清 Design System Builder**
4. 等待完成通知（约几秒），左侧页面列表出现 00–07 八个页面

> 重复运行会再生成一套页面（页面名相同但会新建），如需重跑请先删除已生成的 00–07 页面。

## 生成内容

| 页面 | 内容 |
| --- | --- |
| 00｜封面 & 使用说明 | 品牌封面 + 分册导航 |
| 01｜UI Tokens | 品牌蓝 11 阶 + 中性灰 11 阶 + 语义色 swatch、Typography 样例、Radius/Spacing/Motion |
| 02｜Components | Button×3 / Card×2 / Input×2 / Tabs×2 / Navigation / Tag×3 / Avatar×2 / Modal / Toast / EmptyState（全部为 Component） |
| 03｜Data Visualization | 趋势/柱状/环形/毛利桥/结构对照/盈亏平衡/数据状态 七类示意 |
| 04｜Page Templates | Dashboard / Analysis / List / Detail / Form 五个 390×844 线框 |
| 05｜App Screens | 首页/订单/商品/成本卡详情/BOM/经营分析/订单录入/库存/资金/我的 十屏线框 |
| 06｜Prototype | 活原型（app.3dq.site）与深链索引 |
| 07｜Developer Handoff | 文件地图 / 令牌引用 / 质量门禁 / 发布流程 / 评审基线链接 |

另有 **Variables → SDQ Core** 变量集：blue/neutral 50–950 全阶 + semantic 五色 + navy。

## 数据来源

令牌与规格提取自仓库真实代码：`client/src/sd-design-tokens.css`（C1 之后的原色阶+语义层三皮肤）、`client/src/pages/Home.tsx`、`docs/login-page-design-review-2026-08-30.md`、`docs/design-manual/`。生成物的色值/尺寸与生产代码一一对应。

## 注意

- 插件为本地开发插件（不发布社区），仅本机可用
- 重跑前删除已生成的 00–07 页面，避免重复
- Variables 集名为 `SDQ Core`；如已存在同名集合，Figma 会自动命名 SDQ Core 2

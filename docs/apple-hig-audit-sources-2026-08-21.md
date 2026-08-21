# Apple HIG 审计基线

本次审计以 Apple 官方 Human Interface Guidelines 为标准，不将其作为视觉模仿模板，而是用于检验当前移动经营应用的任务聚焦、层级、适配性与可访问性。

| 审计维度 | 官方原则摘要 | 当前审计要点 |
| --- | --- | --- |
| 目的与简洁性 | 每个元素需服务于用户最重要的任务，保持直接、简洁的体验。 | 首屏是否以经营判断与下一步行动为主，而非并列展示过多等权模块。 |
| 熟悉性与反馈 | 视觉和交互应保持一致，并让用户明确知道状态变化。 | Tab、返回、筛选、图表下钻与提醒是否有可预测的反馈。 |
| 布局与层级 | 用对齐、留白和逐步披露建立组织与优先级；关键内容靠近阅读起点。 | 页面边线、标题基线、模块密度、信息排序与底部导航安全区。 |
| 适配性 | 支持不同设备、文本大小、方向和安全区域。 | 375/390/430px、较大字体、内容截断、固定 Tab 对内容的遮挡。 |
| 可访问性 | 自定义小文字需可读；小字文本应达到足够对比度；控制需有足够尺寸及间距。 | 9–10px 财务辅助文字、对比度、图例、44px 触控区、颜色之外的状态提示。 |
| 字体 | iOS 默认与最小文字参考值分别为 17pt 和 11pt；自定义字体需保持相同的可扩展性。 | 页面是否以 8–10px 辅助文字承载关键解释，是否支持系统字体放大。 |
| 动效 | 动效应自然、短时、支持 Reduce Motion，避免干扰或眩晕。 | 图表动效是否只服务数据读取，且在系统减少动态效果时回退。 |
| Tab 导航 | Tab 用于顶层区域导航，不应用于操作；需始终可见、含标签且避免溢出。 | 五个 Tab 是否恰当、稳定、保留标签，并避免把创建或筛选操作混入导航。 |

## 官方来源

1. Apple, [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)，2026-06-08。
2. Apple, [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)。
3. Apple, [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)。
4. Apple, [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)。
5. Apple, [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)。
6. Apple, [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)，2026-06-08。

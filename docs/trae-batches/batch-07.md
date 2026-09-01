# 批次 07：皮肤文件拆分

**元数据**
- 优先级：P0
- 依赖：批次 06
- 预估耗时：1h
- 风险等级：中
- 状态：✅ 已完成（Trae 执行）

## 变更摘要
- 创建 client/src/skins/ 目录，5 种皮肤独立文件
- soft.css / deep.css / aurora.css / midnight.css / forest.css
- 每种皮肤覆盖语义令牌（bg/text/action/border/功能色）
- 创建 skins/index.ts 统一导出
- VisualSkin 类型扩展为 5 种皮肤

## 涉及文件
- client/src/skins/soft.css
- client/src/skins/deep.css
- client/src/skins/aurora.css
- client/src/skins/midnight.css
- client/src/skins/forest.css
- client/src/skins/index.ts

## 验收
- ✅ 三门禁全绿
- ✅ 变更已登记到 docs/change-log.md

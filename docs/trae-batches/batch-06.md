# 批次 06：设计令牌收敛

**元数据**
- 优先级：P0
- 依赖：批次 05
- 预估耗时：1h
- 风险等级：中
- 状态：✅ 已完成（Trae 执行）

## 变更摘要
- 创建 client/src/tokens/primitives.css（基础令牌：颜色/字号/间距/圆角/阴影）
- 创建 client/src/tokens/semantic.css（语义令牌：bg/text/action/border/功能色）
- 创建 client/src/tokens/tailwind-bridge.css（Tailwind 桥接）
- 全局硬编码颜色/字号/间距逐步替换为令牌引用

## 涉及文件
- client/src/tokens/primitives.css
- client/src/tokens/semantic.css
- client/src/tokens/tailwind-bridge.css

## 验收
- ✅ 三门禁全绿
- ✅ 变更已登记到 docs/change-log.md

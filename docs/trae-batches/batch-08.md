# 批次 08：皮肤统一切换

**元数据**
- 优先级：P0
- 依赖：批次 07
- 预估耗时：1h
- 风险等级：中
- 状态：✅ 已完成（Trae 执行）

## 变更摘要
- 实现全局皮肤切换逻辑（Context + localStorage 持久化）
- 切换皮肤时 body 添加 skin-xxx 类名
- 皮肤切换颜色过渡（background-color/color/border-color 0.2s）
- 默认皮肤检测（系统深色模式偏好）
- 各页面读取当前皮肤，无需单独处理

## 涉及文件
- client/src/lib/skin-context.tsx（如存在）
- client/src/App.tsx（皮肤 Provider）
- client/src/index.css（皮肤切换过渡）

## 验收
- ✅ 三门禁全绿
- ✅ 变更已登记到 docs/change-log.md

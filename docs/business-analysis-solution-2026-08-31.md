# 经营分析模块升级重构技术方案
**版本：** 方案稿 v1 ｜ **对应 PRD：** [business-analysis-prd-2026-08-31](business-analysis-prd-2026-08-31.md) ｜ **日期：** 2026-08-31
**目标：** 把现有「洞察」Tab 从"只读经营仪表盘"升级为 PRD 定义的「经营分析」模块——**成本分析（向内算成本、管节流）+ 利润分析（向外算盈利、管开源）**，双 Tab 架构，行业模板参数化。
**不变约束：** 金额以分存储并按两位小数展示；新增内容全部挂在既有机制上（数据迁移链、统一 Store、行业模板、纯函数库、页面栈、tRPC 账本、质量门禁），不引入平行体系；行业切换沿用 `future_only` 保留历史。

## 一、总体架构

沿用现有"统一行业化 Store + 公式纯函数 + 页面薄层"分层，新增一层**参数化计算引擎**，保证"新增行业只配参数、不改代码"：

```
页面层：经营分析入口 → 成本分析 Tab / 利润分析 Tab（8 张业务卡）
计算引擎层（纯函数，新建 client/src/lib/business-analysis/）：
  material.ts     净料单价、物料库增删改查/批量导入
  bom.ts          标准物料成本 = Σ(净料单价×用量)
  package.ts      套餐总物料成本 = Σ(单品成本×份数)
  inventory.ts    实际消耗/理论消耗/损耗差额对账
  margin.ts       毛利/毛利率（物料口径 + 打包附加）
  break-even.ts   综合毛利率、月度/每日保本营业额、诊断文案
  capacity.ts     保本客流、翻台率、产能天花板、开店风险评估
参数层（行业模板扩展）：业务名词 / 采购单位集合 / 告警阈值 / 预置示例物料 / 诊断文案
数据层：兼容现有 BookState + 小程序化云集合
```

**职责边界（PRD 强约束）**：成本分析只产出物料成本，不碰售价/毛利；利润分析只读成本分析产出的物料成本 + 售价 + 固定开支，算毛利/保本/客流。二者通过共享的"产品/套餐成本"数据源联动，不重复录入。

## 二、数据模型（向后兼容，schemaVersion 6 → 7 增量迁移）

**原则：** 现有 `BookState`（schemaVersion 6）继续作为本地/自托管统一载体，采用**增量 schemaVersion 7 迁移**（沿用现有 `normalizeState` / `migrateV2` 机制）；小程序化时按 `wechat-miniapp-foundation.md` 映射为规范化云集合，字段一一对应。

| 新域（state 内） | 核心字段 | 对应 PRD 表 / 云集合 |
|---|---|---|
| `materials: Material[]` | id, workspaceId, industryId, name, purchaseUnit(随模板), purchasePrice, yieldRatePct(出成率), netUnitPrice(=采购价÷出成率, 纯函数算), supplier?, updatedAt | `material` |
| `cards` 扩展 | BOM 行新增可选 `materialId` + `usageQuantity`；未选物料的行保留手填金额（兼容旧数据） | `bom_product` / `bom_item` |
| `packages: PackageGroup[]` | id, workspaceId, industryId, name, items:[{cardId, quantity}], totalMaterialCost(=Σ) | `package_group` |
| `productPrices` 扩展 | 复用现有 `salePrice` + 新增 `packCost`（打包附加成本，可选） | `product_price` |
| `fixedCosts: FixedCost[]` | id, workspaceId, industryId, period(月份), rent, baseSalary, depreciation, platformFee, other, total | `business_fixed_cost` |
| `capacityConfig` | workspaceId, industryId, avgTicket(客单价), seatOrWorkstationCount, personsPerTable / maxPerStation, operatingDaysPerMonth, footTraffic?, conversionRate? | `capacity_config` |
| `inventoryChecks` | id, workspaceId, industryId, period, openingStock, purchaseIn, endingStock, actualConsume, theoreticalConsume(销量×BOM), lossAmount, status | `inventory_check` |
| `dailyBusinessLog` | 会员台账：日期、销售额、订单数、客单价、成本、毛利、备注 | `daily_business_log` |

**数据联动**：`inventory.theoreticalConsume` 读取当月订单销量 × BOM 净料用量（现有 orders→skus→cards 链路已具备）；套餐成本引用 `cards`；毛利/保本引用 `materials→cards→packages` 成本输出。

**旧数据零破坏**：旧成本卡 BOM 行仍是"手填金额"，可继续编辑；仅新增 BOM 行走"选物料 + 填用量"。`calcCard` 扩展为"有 `materialId` 用净料单价×用量，否则沿用原 `amount`"。

## 三、计算引擎公式（参数化，全部纯函数 + 单测）

```
净料单价        = 采购单价 ÷ (出成率 ÷ 100)            [material]
单品标准物料成本 = Σ(净料单价 × 单份用量)               [bom]
套餐总物料成本   = Σ(单品标准物料成本 × 套餐份数)        [package]
毛利金额        = 售价 − 物料成本 − 打包耗材成本        [margin]
销售毛利率      = 毛利金额 ÷ 售价 × 100               [margin]
实际消耗        = 期初库存 + 采购入库 − 期末盘点        [inventory]
损耗差额成本    = (实际消耗 − 理论消耗) × 净料单价      [inventory]
综合加权毛利率   = Σ(产品毛利) ÷ Σ(产品售价)            [break-even]
月度保本营业额   = 月度固定总成本 ÷ 综合加权毛利率       [break-even]
每日保本营业额   = 月度保本营业额 ÷ 每月营业天数         [break-even]
每日保本客流     = 每日保本营业额 ÷ 客单价              [capacity]
翻台率/利用率    = 实际客流 ÷ (座位数×翻台机会)          [capacity]
单日产能天花板   = 座位/工位数 × 单位最大承接量          [capacity]
```

- 全部为纯函数 + 单测（沿用现有 `*.test.ts` 规范与金额"分"精度）。
- 行业阈值（食材成本率/人工占比/房租占比）以**区间参数**入引擎，`[min,max]` 越界返回告警等级与文案；诊断文案模板化。
- 服务端/云函数执行同样纯函数，客户端提交原始输入、不信任客户端结果。

## 四、页面结构（一期）

- **入口**：底部 Tab「洞察」**改名**「经营分析」作为一级入口（决策点 D1，已定稿），页面内双 Tab：成本分析 / 利润分析；顶部固定全局控件条：行业模板下拉 + 导出PDF报表 + 重置模板。
- **成本分析 Tab**（自上而下 4 卡）：
  1. 物料耗材资料库：列表 + 新增/编辑/删除/批量导入；出成率输入后实时显示净料单价。
  2. 产品标准 BOM 成本卡：选物料 + 填用量 → 自动算单品物料成本；保存配方/复制配方/导出 PDF 成本卡；不显示售价/毛利。
  3. 套餐物料成本汇总：勾选单品 + 份数 → 套餐物料合计（只输出物料成本）。
  4. 库存盘点 & 损耗对账（会员，二期）：录入期初/入库/期末，自动带出理论消耗，输出损耗明细 + 异常告警。
- **利润分析 Tab**（自上而下 4 卡）：
  1. 单品 & 套餐毛利核算：选择产品自动带出物料成本，填售价/打包成本 → 毛利金额 + 毛利率 + 行业红线告警。
  2. 门店固定成本设置：房租/底薪/折旧/平台年费/杂费 → 月度固定总成本。
  3. 盈亏保本测算：加权毛利率 × 固定成本 → 月度/每日保本营业额 + 成本占比红黄告警 + 诊断文案。
  4. 客流 & 产能评估：客单价、座位/工位、翻台、过路人流 → 保本客流、产能天花板、开店风险评估。
- **关键数字高亮**：毛利率、保本营业额、保本客流、产能上限等主指标沿用现有金融数字与语义色规范。
- **Tab 切换不丢表单**：复用现有 `subPage` 栈 + URL 序列化；成本分析录入的数据在利润分析 Tab 即时联动（共享 Store）。
- **研究报告约束**（`docs/design-system/ui-upgrade-implementation-record-2026-08-30.md` 同源要求）：FAB 上移 64px + 滚动容器 `padding-bottom: 96px` 避免遮挡；「暂无上期基线」用蓝色「待观察」标签而非红色徽章；瀑布图/图表补齐图例；新模块只用语义 token 色（深蓝=数据快照，亮蓝=操作）。

## 五、行业模板扩展

- 在 `industryTemplates` 增加字段：`purchaseUnits[]`（斤/公斤/个/包/瓶/件…）、`thresholds`（食材/耗材/配件成本率红线区间、人工占比、房租占比）、`presetMaterials[]`、`presetFixedCosts[]`、`diagnosisCopy`。
- 切换模板：两个 Tab 同步换名词/阈值/预置数据/文案，计算引擎不变；沿用 `future_only` 策略，历史数据保留原行业。
- 模板清单与 PRD 7 套的对齐策略见决策点 D2。

## 六、基座适配清单（实现时必须逐条遵守）

| 层 | 适配做法 |
|---|---|
| 数据层 | 走 schemaVersion 6→7 增量迁移；`normalizeState` 为新域补空数组兜底（风格同 `recoverSkusForCards`）；不另建存储 |
| 计算层 | 纯函数库 `client/src/lib/business-analysis/`；金额 `toFen/fromFen`；校验返回 `{ok, reason}`（同 `transaction-validation` 风格）；派生结果 `useMemo`；复用 `skuMetrics`、`breakEvenPrice`、`cost-analysis-summary.ts`、`reports` |
| Store 层 | 扩 `useCostBook`，新增 actions（addMaterial/updateMaterial/removeMaterial/addPackage/saveFixedCost/saveCapacityConfig/...），全部 `setState((current) => ...)` 不可变更新，与现有 actions 同构；不重写 |
| 模板层 | 扩展 `industryTemplates` 字段 + 复用 `switchIndustry` 切换策略，不新建模板机制 |
| 页面层 | 复用 `tab + subPage` 栈 + URL 序列化 + 深链接恢复；表单沿用 `batch2-t6-form-spec` 的 `secondary-form/form-actions` 统一规格；新页面组件拆到 `client/src/pages/business-analysis/` 独立目录，避免撑大 Home.tsx |
| 联动层 | 库存对账"理论消耗" = 新增 `buildTheoreticalConsume(state, period)` 纯函数，复用 orders→skus→cards 链路；无订单时降级"仅报实际消耗"，不伪造 |
| 云端层 | Web 随 `workspaceBooks.state` 走（乐观锁 `revision` 不变，仅 schemaVersion 升 7）；小程序化按 `wechat-miniapp-foundation.md` 映射云集合 |
| 质量门禁 | 每张卡配纯函数单测 + 真实 Home DOM 回归（jsdom 路径断言）+ 多视口 375/390/430/768/1280 + TS + 全量测试 + 生产构建 + 腾讯云验收 |

**三个"防不适配"的坑：**
| 坑 | 适配做法 |
|---|---|
| 旧成本卡手填金额与新物料库并存 | BOM 行双模式：有 `materialId` 自动算，否则手填金额；不强制迁移 |
| 毛利口径冲突（现有含人工/分摊 vs PRD 纯物料） | 双口径并存展示：物料毛利率（PRD）+ 完全成本毛利率（现有），不覆盖 |
| 库存对账依赖订单数据 | 无订单时降级"仅实际消耗"，理论消耗缺口明确披露，不伪造 |

## 七、实施路径与排期（对齐 PRD 三期）

### 一期｜免费版核心（餐饮模板优先）
1. 「经营分析」入口 + 成本分析/利润分析双 Tab 壳 + 顶部全局控件（行业下拉/重置模板）。
2. 物料资料库 + 产品 BOM 成本卡引用物料库（含 schemaVersion 7 迁移，兼容旧成本卡手填金额）。
3. 套餐物料成本汇总。
4. 毛利核算（含打包附加）+ 固定成本设置 + 盈亏保本测算。
5. 客流 & 产能评估。
6. 餐饮行业公式、告警阈值、诊断文案完整配置；纯函数 + DOM 回归 + 多视口 + 生产验收（沿用现有门禁）。

### 二期｜会员增值
1. 库存盘点 & 损耗差异对账报表（与订单销量×BOM 理论消耗打通）。
2. 每日经营台账录入。
3. PDF 经营报表导出（与现有 CSV/XLSX 并存）。

### 三期｜多行业模板
1. 烘焙、美业、汽修、鲜果奶茶、加工厂、自定义通用版模板配置（仅替换名词/阈值/预置数据，不改计算引擎）。
2. 各行业告警阈值与诊断文案回归验收。

## 八、决策点状态

- **D1 入口命名：✅ 已定稿（2026-08-31）**：底部 Tab「洞察」改名为「经营分析」，作为一级入口，页面内双 Tab（成本分析/利润分析）。
- **D2 行业模板：⭐ 推荐方案（2026-08-31 研究）**：**PRD 7 套为主推 + 旧 5 套全保留，旧 3 套归入「更多/通用」分组**。
  - 新增 4 个行业 id：`bakery`(烘焙甜品)、`auto_repair`(汽修保养)、`fruit_tea`(鲜果奶茶)、`processing`(小型加工厂)；新增 `custom`(自定义通用版)。
  - 保留 `canteen`/`beauty`/`retail`/`ecommerce`/`stall`；`beauty` label 对齐 PRD 改「美业美容」。
  - UI 行业下拉分两组：**推荐行业**（PRD 7 套）+ **更多/通用**（零售/电商/小商贩）。
  - 数据零破坏：`IndustryId` union 全保留，新增 id 进所有 `Record<IndustryId,...>`（TS 编译期强制补全）。
  - 经营分析参数层：7 套配专属阈值/名词/预置（一期先配餐饮，符合 PRD 排期）；旧 3 套走通用参数兜底（复用 `custom` 默认值）。
  - 切换仍走 `switchIndustry` + `future_only`，历史数据保留原行业。
  - **为何不用"删除旧 3 套"**：线上已有存量用户（activeIndustryId 指向被删模板会崩溃）、违反 `future_only` 承诺、TS 破坏面大；且零售/电商/小商贩是"进销存/平台费"模型，与经营分析"物料/BOM/出成率"模型不同，硬映射会语义错配。
  - **为何不把旧 3 套强并入 `custom`**：电商佣金/广告/退款、零售进销存是独立行业逻辑，塞进单个 custom 模板会让"自定义通用版"复杂不可维护；独立模板各自清晰，参数化引擎新增即配置。
- **D3 毛利口径**（待确认）：单品/套餐毛利是否采用 PRD 纯物料口径（售价−物料−打包），与现有含人工/分摊的 SKU 贡献毛利并存展示？
- **D4 会员权益**（待确认）：库存对账/台账/PDF 导出的会员门槛如何落地（扩展订阅字段 or 管理后台权益配置）？
- **D5 交付载体**（待确认）：本次升级先在现有 Web App 落地（建议，小程序复用同一计算引擎），还是直接走微信云开发？

## References
[1] [经营分析 PRD V1.0](business-analysis-prd-2026-08-31.md)
[2] [当前洞察页实现与聚合调用](../client/src/pages/Home.tsx)
[3] [数据模型与行业模板](../client/src/lib/cost-book.ts)
[4] [小程序化规划](wechat-miniapp-foundation.md)
[5] [既有成本分析页方案](cost-analysis-page-solution-2026-08-26.md)

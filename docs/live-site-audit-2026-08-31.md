# 线上现状问题调研 · app.3dq.site
**调研时间：** 2026-08-31 16:0x（UTC+8） ｜ **方法：** 真实浏览器打开 + curl 直连实测 + CloudBase 云函数查询 + 本地代码交叉核对
**基线：** 对比同日《全局优化升级研究报告》12 页实测与 C1–C7 上线记录

---

## 一、线上基线实测（本次可复现）

| 项 | 实测值 | 判断 | 说明 |
|---|---|---|---|
| 首页 HTTP | 200 | ✅ | — |
| 首页 TTFB | 0.53s | ✅ 正常 | HTML 直出较快 |
| 首页 HTML 体积 | 368KB | ⚠️ 偏大 | 报告建议 <200KB；405KB→368KB 略降未达标 |
| 主 JS（index-Dvq64s31.js） | 892KB | ⚠️ 偏大 | 单 bundle，无 code splitting（报告 5.4 未实施） |
| 主 CSS（index-D1TPDt6O.css） | 394KB | ⚠️ 偏大 | 未收敛到 <240KB 目标（报告 5.1） |
| Meta（viewport/theme-color/description） | 完备 | ✅ | theme-color #0B1836 深蓝 |
| 登录页 | 正常上线 | ✅ | 方案 A 已上线：密码/验证码双模式 + 语言切换 + 创建店铺/忘记密码 |
| C1–C7 产物 | 已上线 | ✅ | bundle 名与实施记录一致（index-Dvq64s31.js） |

## 二、本次实测发现的现存问题

### P1｜无真实 PWA（报告 P2 项，确认未实施）
- `sw.js`、`manifest.json` 请求均返回 **SPA fallback 的 index.html（假 200）**——静态托管对不存在路径回退首页
- **结论：线上无 Service Worker、无 Web App Manifest，无离线/PWA 能力**；二次访问仍需全量下载 892KB JS + 394KB CSS
- 落点：C15（性能与 PWA）批次，属未开工项

### P1｜CloudBase 冷启动风险仍在（报告 5.2 确认未解决）
- 线上 4 个云函数全部 **Type=Event、ReservedConcurrencyMem=空（无预置并发）**：`initDatabase` / `clearLogs` / `getOpenId` / `aggregateStats`
- 每次冷启动耗时不可控 → 首页"正在连接安全账本…"等待感来源之一
- 落点：后端-P0 分流批次（配置预置并发或函数直传）

### P2｜首屏资源仍大（报告 5.1/5.4 未实施）
- 892KB JS + 394KB CSS + 368KB HTML ≈ **1.6MB 首屏总下载**，移动端弱网明显
- 报告建议：HTML<200KB / 关键 CSS inline / code splitting / WebP+懒加载

### P3｜行业文案仍为旧 5 套（符合预期，未实施）
- description 为"餐饮、零售、电商、美业服务和小商贩"——PRD 7 套新行业模板未落地（D2 定稿待本地实施）

## 三、需登录后实测（本次无测试账号，受限）

| 项 | 依据 | 说明 |
|---|---|---|
| 报告 12 页 UI 问题 | 研究报告 | 工作台/订单/商品/洞察/我的等需登录逐页复核；C1–C7 已修复项按实施记录推断已生效 |
| OTP 验证码链路 | 报告 P0 | **代码层已实现+测试覆盖**（`auth-security.ts` 冷却/限流 + `auth-routes.security.test.ts` 登录/注册/重置三流程断言），但线上是否生效必须登录实测；报告称线上全失败，疑生产版本滞后或 CloudBase OTP 服务侧问题 |
| 店铺切换器 | 报告 P0 | 需登录验证 |

## 四、与研究报告/C1–C7 的对照结论

| 报告问题 | 线上现状 | 结论 |
|---|---|---|
| C1 令牌系统化 | 已上线 | ✅ 已修复 |
| C2 流水扫描效率 | 已上线 | ✅ 已修复 |
| C3 洞察渐进 IA | 已上线 | ✅ 已修复 |
| C4 订单空态 | 已上线 | ✅ 已修复 |
| C5 报表速览 | 已上线 | ✅ 已修复 |
| C6 定价深色收敛 | 已上线 | ✅ 已修复 |
| C7 宽屏策略 | 已上线 | ✅ 已修复 |
| 登录页方案 A | 已上线（本次截图确认） | ✅ 已修复 |
| P2 PWA/性能 | **未实施**（假 200 证实） | ⏳ C15 批次 |
| CloudBase 冷启动 | **未解决**（无预置并发） | ⏳ 后端-P0 批次 |
| OTP 链路 | 代码已实现，线上待验证 | ⏳ 后端-P0 批次 |
| 行业模板升级（D2） | 未实施 | ⏳ C-IA 批次 |

## 五、建议动作（对接已定稿的全局方案批次）

1. **后端-P0 分流批次**：验证线上 OTP 链路（对比生产版本与代码）、给 4 个云函数配预置并发/直传
2. **C15 批次**：真 PWA（sw.js + manifest）、code splitting、CSS 收敛、WebP/懒加载
3. **C-IA 批次**：行业模板 7 套落地后同步更新 description 文案
4. 登录态复核：由本地 PI agent 用测试账号对 12 页逐项复核 C 批次验收锚点

## References
[1] [全局优化升级研究报告（用户 PDF）](../../.sessions/38439472073840898/attachments/全局优化升级研究报告(1).pdf)
[2] [全局 UI/UX 升级优化总方案](ui-ux-optimization-solution-2026-08-31.md)（批次定义）
[3] [C1–C7 UI 升级实施记录](design-system/ui-upgrade-implementation-record-2026-08-30.md)
[4] 线上实测：app.3dq.site（2026-08-31 16:0x）；CloudBase 云函数列表（sdq12 环境）

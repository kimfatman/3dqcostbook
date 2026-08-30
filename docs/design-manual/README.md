# 算得清 · 设计手册与素材包索引

> 来源：`算得清App_完整设计手册与素材包.zip`（2026-08-30 整理归档）。
> 14 张素材图与 `client/public/brand-assets/` 现有文件**字节级一致**（MD5 全同），已在 `client/src/lib/brand-assets.ts` 完整注册，应用可直接引用——本目录只归档**设计文档**与**索引**，不重复存放图片。

## 设计文档（本目录）

| 文档 | 内容 | 适用对象 |
| --- | --- | --- |
| [算得清设计手册_完整版.md](算得清设计手册_完整版.md) | 品牌、产品、运营与传播**一体化总规范**（品牌口号：生意算得清，老板更轻松） | 全员 |
| [算得清品牌设计规范手册.md](算得清品牌设计规范手册.md) | 品牌设计规范：蓝色「店铺+加号+等号+微笑曲线」标志、「算小胖」橘猫吉祥物、四项品牌感知 | 设计/品牌 |
| [算得清UI图标与核心交互动效规范.md](算得清UI图标与核心交互动效规范.md) | 图标系统与核心交互动效规范（iOS/Android/小程序/H5/Web） | 设计/研发 |
| [算得清运营海报文案与视觉排版方案.md](算得清运营海报文案与视觉排版方案.md) | 运营海报文案与排版（公众号封面/朋友圈九宫格/社群海报/私域传播） | 运营/销售 |

## 素材图（14 张，位于 `client/public/brand-assets/`）

视觉总览见 [素材图鉴.html](素材图鉴.html)（浏览器直接打开）。应用内通过 `client/src/lib/brand-assets.ts` 的 `brandAssets` 注册表按 id 引用。

| 分组 | 资产（id → 文件） |
| --- | --- |
| 品牌 brand | viMasterBoard → 整套VI展示板_高清版 · logoMark → Logo_Mark · splashBlue → Splash_Blue |
| 图标/皮肤 ui-reference | iconMotionBoard → UI图标与交互动效规范板 · skinBoard → UI皮肤规范展示板 |
| 应用商店 app-store | appstore_overview/inventory/trend/multistore/reminder → AppStore_01~05 |
| 朋友圈 moments | moments_overview/inventory/trend/multistore/reminder → Moments_01~05 |
| 公众号 wechat | wechat_article_cover → WeChat_ArticleCover_经营总览 |

## 与仓库的关系

- 应用页面引用素材：`import { brandAssets } from "@/lib/brand-assets"` → `asset.path`（如登录页印鉴 `logoMark`）。
- 新增/替换素材时：图片放入 `client/public/brand-assets/`，并在 `brand-assets.ts` 注册（id/kind/usage/尺寸/tags），同步更新 `SDQ_AI_Asset_Manifest.json`。

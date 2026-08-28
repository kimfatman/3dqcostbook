/**
 * 算得清品牌资产索引。
 *
 * 这些资源是设计/运营参考资产，不代表真实经营数据；业务页面只能按明确的场景使用，
 * 不得把宣传图中的示例金额、文案或插画当作运行时数据。
 */
export type BrandAssetKind = "brand" | "ui-reference" | "app-store" | "moments" | "wechat";

export type BrandAsset = {
  id: string;
  path: string;
  kind: BrandAssetKind;
  usage: string;
  width: number;
  height: number;
  tags: readonly string[];
};

const asset = (
  id: string,
  fileName: string,
  kind: BrandAssetKind,
  usage: string,
  width: number,
  height: number,
  tags: readonly string[],
): BrandAsset => ({
  id,
  path: `/brand-assets/${encodeURIComponent(fileName)}`,
  kind,
  usage,
  width,
  height,
  tags,
});

export const brandAssets = {
  viMasterBoard: asset("vi_master_board", "SDQ_整套VI展示板_高清版.png", "brand", "品牌总览、Logo、VI、图标和吉祥物参考", 2176, 1632, ["品牌", "Logo", "VI"]),
  logoMark: asset("logo_mark", "SDQ_Logo_Mark.png", "brand", "顶部栏、店铺身份卡和小尺寸品牌入口图标", 423, 402, ["Logo", "图标", "顶部栏"]),
  splashBlue: asset("splash_blue", "SDQ_Splash_Blue.png", "brand", "蓝色渐变启动页与纵向 Logo 组合", 1440, 2560, ["启动页", "Logo", "算小胖"]),
  iconMotionBoard: asset("icon_motion_board", "SDQ_UI图标与交互动效规范板.png", "ui-reference", "图标结构、状态色和交互动效参考", 2176, 1632, ["图标", "动效", "导航"]),
  skinBoard: asset("skin_board", "SDQ_UI皮肤规范展示板.png", "ui-reference", "清蓝/深蓝皮肤、数据卡、按钮、状态和图表参考", 2176, 1632, ["皮肤", "组件", "图表"]),
  appStoreOverview: asset("appstore_overview", "SDQ_AppStore_01_经营总览.png", "app-store", "应用商店经营总览宣传素材", 1440, 2560, ["经营总览", "收入", "利润"]),
  appStoreInventory: asset("appstore_inventory", "SDQ_AppStore_02_库存提醒.png", "app-store", "应用商店库存提醒宣传素材", 1440, 2560, ["库存", "预警"]),
  appStoreTrend: asset("appstore_trend", "SDQ_AppStore_03_经营趋势.png", "app-store", "应用商店经营趋势宣传素材", 1440, 2560, ["趋势", "图表"]),
  appStoreMultistore: asset("appstore_multistore", "SDQ_AppStore_04_多门店管理.png", "app-store", "应用商店多门店宣传素材", 1440, 2560, ["多门店", "汇总"]),
  appStoreReminder: asset("appstore_reminder", "SDQ_AppStore_05_经营提醒.png", "app-store", "应用商店经营提醒宣传素材", 1440, 2560, ["提醒", "待办"]),
  momentsOverview: asset("moments_overview", "SDQ_Moments_01_经营总览.png", "moments", "朋友圈/社群经营总览宣传素材", 1632, 2176, ["经营总览", "私域"]),
  momentsInventory: asset("moments_inventory", "SDQ_Moments_02_库存预警.png", "moments", "朋友圈/社群库存预警宣传素材", 1632, 2176, ["库存", "私域"]),
  momentsTrend: asset("moments_trend", "SDQ_Moments_03_经营趋势.png", "moments", "朋友圈/社群趋势宣传素材", 1632, 2176, ["趋势", "私域"]),
  momentsMultistore: asset("moments_multistore", "SDQ_Moments_04_多门店管理.png", "moments", "朋友圈/社群多门店宣传素材", 1632, 2176, ["多门店", "私域"]),
  momentsReminder: asset("moments_reminder", "SDQ_Moments_05_经营提醒.png", "moments", "朋友圈/社群经营提醒宣传素材", 1632, 2176, ["提醒", "私域"]),
  wechatArticleCover: asset("wechat_article_cover", "SDQ_WeChat_ArticleCover_经营总览.png", "wechat", "微信公众号经营总览文章封面", 2560, 1440, ["公众号", "文章封面"]),
} as const satisfies Record<string, BrandAsset>;

export type BrandAssetId = keyof typeof brandAssets;

export const brandAssetList = Object.values(brandAssets);

export const brandAssetManifestPath = "/brand-assets/SDQ_AI_Asset_Manifest.json";

export const brandAssetsByKind = (kind: BrandAssetKind) => brandAssetList.filter((item) => item.kind === kind);

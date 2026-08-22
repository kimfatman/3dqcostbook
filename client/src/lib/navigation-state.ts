export type NavigationTab = "home" | "orders" | "cards" | "analysis" | "profile";
export type NavigationSubPage = "notifications" | "industry" | "records" | "record" | "recordDetail" | "cards" | "cardDetail" | "cardForm" | "bomForm" | "pricing" | "budget" | "healthSettings" | "salesTargets" | "reports" | "reportDetail" | "suppliers" | "supplierForm" | "categories" | "categoryForm" | "orders" | "orderForm" | "orderDetail" | "refundForm" | "skus" | "profileSettings" | "avatarStyle" | "storeBrand" | null;
export type RecordNavigationContext = { filter?: string; month?: string; query?: string };
export type NavigationState = { tab: NavigationTab; subPage: NavigationSubPage; recordContext?: RecordNavigationContext };

export const navigationTabs: NavigationTab[] = ["home", "orders", "cards", "analysis", "profile"];
export const navigationSubPages: Exclude<NavigationSubPage, null>[] = ["notifications", "industry", "records", "record", "recordDetail", "cards", "cardDetail", "cardForm", "bomForm", "pricing", "budget", "healthSettings", "salesTargets", "reports", "reportDetail", "suppliers", "supplierForm", "categories", "categoryForm", "orders", "orderForm", "orderDetail", "refundForm", "skus", "profileSettings", "avatarStyle", "storeBrand"];
const parentTabBySubPage: Record<Exclude<NavigationSubPage, null>, NavigationTab> = { notifications: "home", industry: "profile", records: "home", record: "home", recordDetail: "home", cards: "cards", cardDetail: "cards", cardForm: "cards", bomForm: "cards", pricing: "cards", budget: "profile", healthSettings: "analysis", salesTargets: "analysis", reports: "profile", reportDetail: "profile", suppliers: "profile", supplierForm: "profile", categories: "profile", categoryForm: "profile", orders: "orders", orderForm: "orders", orderDetail: "orders", refundForm: "orders", skus: "cards", profileSettings: "profile", avatarStyle: "profile", storeBrand: "profile" };

export function readNavigationState(search: string): NavigationState {
  const params = new URLSearchParams(search);
  const screen = params.get("screen");
  const recordContext: RecordNavigationContext = { filter: params.get("filter") || undefined, month: params.get("month") || undefined, query: params.get("q") || undefined };
  if (navigationTabs.includes(screen as NavigationTab)) return { tab: screen as NavigationTab, subPage: null };
  if (navigationSubPages.includes(screen as Exclude<NavigationSubPage, null>)) { const subPage = screen as Exclude<NavigationSubPage, null>; return { tab: parentTabBySubPage[subPage], subPage, recordContext: ["records", "record", "recordDetail"].includes(subPage) ? recordContext : undefined }; }
  return { tab: "home", subPage: null };
}

export function navigationSearch(state: NavigationState): string {
  const screen = state.subPage || state.tab;
  const params = new URLSearchParams();
  if (screen !== "home") params.set("screen", screen);
  if (["records", "record", "recordDetail"].includes(screen)) {
    if (state.recordContext?.filter && state.recordContext.filter !== "all") params.set("filter", state.recordContext.filter);
    if (state.recordContext?.month && state.recordContext.month !== "all") params.set("month", state.recordContext.month);
    if (state.recordContext?.query) params.set("q", state.recordContext.query);
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function popNavigationStack<T>(stack: T[]) {
  return stack.slice(0, -1);
}

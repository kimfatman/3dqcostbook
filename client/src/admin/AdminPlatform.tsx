import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  Filter,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  X,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  Gauge,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Settings2,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import "./admin.css";

type SectionKey = "overview" | "users" | "workspaces" | "audit" | "migrations" | "configs" | "monitoring" | "backups";

type NavigationItem = { key: SectionKey; label: string; description: string; icon: typeof LayoutDashboard };

const navigation: NavigationItem[] = [
  { key: "overview", label: "系统总览", description: "健康、版本与关键规模", icon: LayoutDashboard },
  { key: "users", label: "用户运营", description: "账号状态与工作区", icon: Users },
  { key: "workspaces", label: "账本工作区", description: "状态与数据质量", icon: BookOpen },
  { key: "audit", label: "审计日志", description: "管理员操作追踪", icon: ClipboardList },
  { key: "migrations", label: "迁移审核", description: "结构变更与回滚", icon: Database },
  { key: "configs", label: "全局配置", description: "版本与发布控制", icon: Settings2 },
  { key: "monitoring", label: "系统监控", description: "性能与运行状态", icon: Gauge },
  { key: "backups", label: "定时备份", description: "计划、队列与结果", icon: Archive },
];

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("zh-CN").format(Number(value ?? 0));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "暂无记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "暂无记录" : date.toLocaleString("zh-CN", { hour12: false });
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "ok" || normalized === "active" || normalized === "enabled" ? "success" : normalized === "degraded" || normalized === "paused" ? "warning" : "neutral";
  return <span className={`admin-status admin-status-${tone}`}><span />{status}</span>;
}

function LoadingPanel({ label = "正在读取管理数据" }: { label?: string }) {
  return <div className="admin-loading"><Loader2 size={18} className="admin-spin" />{label}</div>;
}

function ErrorPanel({ label = "管理数据暂时不可用" }: { label?: string }) {
  return <div className="admin-error"><ShieldAlert size={18} /><span>{label}，请稍后重试或联系平台管理员。</span></div>;
}

function MetricCard({ label, value, hint, tone = "blue" }: { label: string; value: string; hint: string; tone?: string }) {
  return <article className={`admin-metric admin-metric-${tone}`}><div className="admin-metric-label">{label}</div><strong>{value}</strong><span>{hint}</span></article>;
}

function Overview({ onNavigate }: { onNavigate: (section: SectionKey) => void }) {
  const overview = trpc.admin.overview.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const health = trpc.admin.health.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const version = trpc.admin.version.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  if (overview.isLoading || health.isLoading || version.isLoading) return <LoadingPanel />;
  if (overview.isError || health.isError || version.isError) return <ErrorPanel />;

  const data = overview.data;
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">PLATFORM OVERVIEW</p><h2>系统总览</h2><p>面向平台管理员的安全运营视图，所有指标均来自服务端聚合数据。</p></div><div className="admin-heading-meta"><StatusPill status={health.data?.status ?? "unknown"} /><span>检查于 {formatDate(health.data?.checkedAt)}</span></div></div>
    <section className="admin-metric-grid">
      <MetricCard label="注册用户" value={formatNumber(data?.counts.users)} hint="服务端聚合" tone="blue" />
      <MetricCard label="活跃工作区" value={formatNumber(data?.counts.workspaces)} hint="服务端聚合工作区数量" tone="violet" />
      <MetricCard label="审计事件" value={formatNumber(data?.counts.auditEvents)} hint="业务与管理员事件" tone="amber" />
      <MetricCard label="账本快照" value={formatNumber(data?.counts.workspaceBooks)} hint={`最新更新 ${formatDate(data?.data.latestWorkspaceBookUpdatedAt)}`} tone="green" />
    </section>
    <section className="admin-content-grid">
      <article className="admin-panel admin-panel-health"><div className="admin-panel-title"><div><p className="admin-eyebrow">SERVICE HEALTH</p><h3>服务状态</h3></div><Activity size={18} /></div><div className="admin-health-row"><div className="admin-health-icon"><CheckCircle2 size={22} /></div><div><strong>{health.data?.status === "ok" ? "系统运行正常" : "系统需要关注"}</strong><p>响应耗时 {health.data?.checks.database.latencyMs ?? 0} ms</p></div><StatusPill status={health.data?.status ?? "unknown"} /></div><div className="admin-divider" /><div className="admin-detail-line"><span>数据库检查</span><strong>{health.data?.checks.database.status ?? "—"}</strong></div><div className="admin-detail-line"><span>版本标识</span><strong>{version.data?.version ?? "—"}</strong></div></article>
      <article className="admin-panel"><div className="admin-panel-title"><div><p className="admin-eyebrow">RELEASE</p><h3>当前版本</h3></div><Archive size={18} /></div><div className="admin-version-value">{version.data?.version ?? "—"}</div><p className="admin-panel-note">Schema {version.data?.schema ?? "—"} · {version.data?.environment ?? "managed"}</p><button className="admin-link-button" onClick={() => onNavigate("audit")}>查看发布审计 <ChevronRight size={15} /></button></article>
    </section>
    <section className="admin-panel admin-quick-panel"><div className="admin-panel-title"><div><p className="admin-eyebrow">OPERATIONS</p><h3>运营入口</h3></div></div><div className="admin-quick-grid">{navigation.filter(item => item.key !== "overview").map(item => <button key={item.key} className="admin-quick-item" onClick={() => onNavigate(item.key)}><span className="admin-quick-icon"><item.icon size={17} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={16} /></button>)}</div></section>
  </>;
}

function UserOperations() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [selected, setSelected] = useState<{ id: string; name: string; status: "active" | "suspended" } | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const users = trpc.admin.users.list.useQuery({ page, pageSize: 10, query: query || undefined, status: status === "all" ? undefined : status }, { retry: false, refetchOnWindowFocus: false });
  const setUserStatus = trpc.admin.users.setStatus.useMutation({
    onSuccess: async () => {
      setSelected(null);
      setReason("");
      setActionError("");
      await users.refetch();
    },
    onError: () => setActionError("状态变更未完成，请确认理由和权限后重试。"),
  });
  const items = users.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((users.data?.total ?? 0) / 10));
  const nextStatus = selected?.status === "active" ? "suspended" : "active";

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };
  const changeStatus = () => {
    if (!selected || reason.trim().length < 2) return;
    setUserStatus.mutate({ userId: selected.id, status: nextStatus, reason: reason.trim(), confirm: true, requestId: crypto.randomUUID() });
  };

  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">USER OPERATIONS</p><h2>用户运营</h2><p>查看最小运营字段并管理账号状态。邮箱和手机号已由服务端脱敏，所有状态变更均会写入管理员审计。</p></div><div className="admin-heading-meta"><Users size={18} /><span>{formatNumber(users.data?.total)} 个账号</span></div></div>
    <section className="admin-panel admin-user-toolbar"><form className="admin-search-form" onSubmit={submitSearch}><Search size={16} /><input aria-label="搜索用户" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="搜索姓名、邮箱或手机号" maxLength={80} /><button type="submit">搜索</button></form><label className="admin-filter-select"><Filter size={15} /><span>状态</span><select aria-label="用户状态筛选" value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="all">全部</option><option value="active">正常</option><option value="suspended">已暂停</option></select></label><button className="admin-icon-button" title="刷新用户列表" aria-label="刷新用户列表" onClick={() => users.refetch()}><RefreshCw size={15} className={users.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">ACCOUNT DIRECTORY</p><h3>账号目录</h3></div><span className="admin-table-caption">第 {page} / {totalPages} 页</span></div>{users.isLoading ? <LoadingPanel label="正在读取用户目录" /> : users.isError ? <ErrorPanel label="用户目录暂时不可用" /> : items.length === 0 ? <div className="admin-empty"><Users size={22} /><strong>没有匹配的用户</strong><span>请调整关键词或状态筛选。</span></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>工作区</th><th>最后登录</th><th>操作</th></tr></thead><tbody>{items.map(user => <tr key={user.id}><td><div className="admin-user-cell"><div className="admin-table-avatar">{(user.name || "用").slice(0, 1)}</div><div><strong>{user.name || "未命名用户"}</strong><small>{user.email || user.phoneNumber || "联系方式已隐藏"}</small></div></div></td><td><span className="admin-role-tag">{user.role === "admin" ? "管理员" : "成员"}</span></td><td><StatusPill status={user.status === "active" ? "正常" : "已暂停"} /></td><td><strong className="admin-table-number">{formatNumber(user.workspaceCount)}</strong></td><td><span className="admin-table-date">{formatDate(user.lastSignedInAt)}</span></td><td><button className={`admin-row-action ${user.status === "active" ? "is-danger" : "is-safe"}`} disabled={user.role === "admin" && user.status === "active"} onClick={() => { setSelected({ id: user.id, name: user.name || "未命名用户", status: user.status }); setReason(""); setActionError(""); }}>{user.status === "active" ? <><PauseCircle size={15} />暂停</> : <><PlayCircle size={15} />恢复</>}</button></td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(users.data?.total)} 个用户</span><div><button disabled={page <= 1 || users.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</button><button disabled={page >= totalPages || users.isFetching} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>下一页</button></div></div></section>
    {selected && <div className="admin-confirm-backdrop" role="presentation"><section className="admin-confirm-card" role="dialog" aria-modal="true" aria-labelledby="user-status-confirm-title"><button className="admin-confirm-close" aria-label="取消状态变更" onClick={() => setSelected(null)}><X size={17} /></button><p className="admin-eyebrow">CONFIRM ACCOUNT ACTION</p><h3 id="user-status-confirm-title">{nextStatus === "suspended" ? "暂停用户账号" : "恢复用户账号"}</h3><p className="admin-confirm-lead">你将把 <strong>{selected.name}</strong> 的状态变更为“{nextStatus === "suspended" ? "已暂停" : "正常"}”。这会影响该账号后续访问受保护服务的权限。</p><label className="admin-reason-label">变更理由<span>必填</span><textarea aria-label="变更理由" value={reason} onChange={event => setReason(event.target.value)} placeholder="请说明本次状态变更的原因" maxLength={240} /></label>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={setUserStatus.isPending} onClick={() => setSelected(null)}>取消</button><button className="admin-primary-action" disabled={reason.trim().length < 2 || setUserStatus.isPending} onClick={changeStatus}>{setUserStatus.isPending ? <><Loader2 size={15} className="admin-spin" />提交中</> : "确认变更"}</button></div><small className="admin-confirm-note">服务端将执行二次确认、最小权限校验并写入管理员审计。</small></section></div>}
  </>;
}

function SectionPlaceholder({ section }: { section: NavigationItem }) {
  const Icon = section.icon;
  const queries = {
    users: trpc.admin.users.list.useQuery({ page: 1, pageSize: 1 }, { retry: false, refetchOnWindowFocus: false }),
    workspaces: trpc.admin.workspaces.list.useQuery({ page: 1, pageSize: 1 }, { retry: false, refetchOnWindowFocus: false }),
    audit: trpc.admin.audit.list.useQuery({ page: 1, pageSize: 1 }, { retry: false, refetchOnWindowFocus: false }),
    migrations: trpc.admin.migrations.list.useQuery({ page: 1, pageSize: 1 }, { retry: false, refetchOnWindowFocus: false }),
    configs: trpc.admin.configs.list.useQuery({ page: 1, pageSize: 1 }, { retry: false, refetchOnWindowFocus: false }),
    monitoring: trpc.admin.metrics.summary.useQuery(undefined, { retry: false, refetchOnWindowFocus: false }),
    backups: trpc.admin.backups.schedules.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: false }),
  } as const;
  const query = queries[section.key as Exclude<SectionKey, "overview">];
  const loading = query.isLoading;
  const error = query.isError;
  const countValue = section.key === "monitoring" ? "运行中" : section.key === "backups" ? (Array.isArray(query.data) ? query.data.length : 0) : (query.data as { total?: number } | undefined)?.total ?? 0;

  return <div className="admin-page-heading"><div><p className="admin-eyebrow">{section.key.toUpperCase()}</p><h2>{section.label}</h2><p>{section.description}。此模块已连接服务端管理员 API，详细筛选与维护操作将在后续页面迭代中开放。</p></div><div className="admin-section-mark"><Icon size={24} /></div><section className="admin-panel admin-coming-panel">{loading ? <LoadingPanel label="正在验证模块权限与数据连接" /> : error ? <ErrorPanel /> : <><div className="admin-coming-icon"><CheckCircle2 size={24} /></div><h3>模块连接正常</h3><p>服务端返回当前模块可用状态，当前概览值为 <strong>{String(countValue)}</strong>。管理动作仍需在专用表单中完成二次确认。</p></>}</section></div>;
}

export default function AdminPlatform() {
  const [sectionKey, setSectionKey] = useState<SectionKey>("overview");
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const section = useMemo(() => navigation.find(item => item.key === sectionKey) ?? navigation[0], [sectionKey]);

  if (me.isLoading) return <div className="admin-gate"><LoadingPanel label="正在验证管理员身份" /></div>;
  if (me.isError || !me.data) return <div className="admin-gate"><div className="admin-gate-card"><LockKeyhole size={30} /><h1>需要登录</h1><p>请先登录平台账号，再访问管理员维护系统。</p></div></div>;
  if (me.data.role !== "admin" || me.data.status !== "active") return <div className="admin-gate"><div className="admin-gate-card"><XCircle size={30} /><h1>无权访问</h1><p>当前账号没有管理员维护权限。管理入口不会展示普通商家数据。</p></div></div>;

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark"><ShieldAlert size={17} /></span><div><strong>算得清</strong><small>管理维护平台</small></div></div><div className="admin-sidebar-label">平台运营</div><nav>{navigation.map(item => { const Icon = item.icon; return <button key={item.key} className={`admin-nav-item ${sectionKey === item.key ? "is-active" : ""}`} onClick={() => setSectionKey(item.key)}><Icon size={17} /><span>{item.label}</span>{sectionKey === item.key && <span className="admin-nav-dot" />}</button>; })}</nav><div className="admin-sidebar-footer"><div className="admin-user-avatar">{(me.data.name ?? "管").slice(0, 1)}</div><div><strong>{me.data.name ?? "平台管理员"}</strong><small>{me.data.email ?? "已授权管理员"}</small></div></div></aside><main className="admin-main"><header className="admin-topbar"><div><span className="admin-topbar-kicker">ADMIN CONSOLE</span><span className="admin-topbar-divider">/</span><span>{section.label}</span></div><div className="admin-topbar-right"><span className="admin-live-dot" />服务端已授权<span className="admin-topbar-separator" />只读安全模式</div></header><div className="admin-content">{sectionKey === "overview" ? <Overview onNavigate={setSectionKey} /> : sectionKey === "users" ? <UserOperations /> : <SectionPlaceholder section={section} />}</div></main></div>;
}

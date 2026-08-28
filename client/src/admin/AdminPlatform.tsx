import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  AlertTriangle,
  CheckCheck,
  Clock3,
  GitBranch,
  RotateCcw,
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
  Plus,
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

function WorkspaceOperations() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [selected, setSelected] = useState<{ id: string; name: string; status: "active" | "suspended" } | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const workspaces = trpc.admin.workspaces.list.useQuery({ page, pageSize: 10, query: query || undefined, status: status === "all" ? undefined : status }, { retry: false, refetchOnWindowFocus: false });
  const setWorkspaceStatus = trpc.admin.workspaces.setStatus.useMutation({ onSuccess: async () => { setSelected(null); setReason(""); setActionError(""); await workspaces.refetch(); }, onError: () => setActionError("账本状态变更未完成，请确认理由和权限后重试。") });
  const items = workspaces.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((workspaces.data?.total ?? 0) / 10));
  const nextStatus = selected?.status === "active" ? "suspended" : "active";
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setQuery(searchInput.trim()); };
  const changeStatus = () => { if (!selected || reason.trim().length < 2) return; setWorkspaceStatus.mutate({ workspaceId: selected.id, status: nextStatus, reason: reason.trim(), confirm: true, requestId: crypto.randomUUID() }); };
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">WORKSPACE OPERATIONS</p><h2>账本工作区</h2><p>查看工作区与账本结构的最小运营字段。暂停工作区会阻断普通商家端后续访问，所有动作均写入管理员审计。</p></div><div className="admin-heading-meta"><BookOpen size={18} /><span>{formatNumber(workspaces.data?.total)} 个工作区</span></div></div>
    <section className="admin-panel admin-user-toolbar"><form className="admin-search-form" onSubmit={submitSearch}><Search size={16} /><input aria-label="搜索工作区" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="搜索工作区名称或负责人" maxLength={80} /><button type="submit">搜索</button></form><label className="admin-filter-select"><Filter size={15} /><span>状态</span><select aria-label="工作区状态筛选" value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="all">全部</option><option value="active">正常</option><option value="suspended">已暂停</option></select></label><button className="admin-icon-button" title="刷新工作区列表" aria-label="刷新工作区列表" onClick={() => workspaces.refetch()}><RefreshCw size={15} className={workspaces.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">WORKSPACE DIRECTORY</p><h3>工作区目录</h3></div><span className="admin-table-caption">第 {page} / {totalPages} 页</span></div>{workspaces.isLoading ? <LoadingPanel label="正在读取工作区目录" /> : workspaces.isError ? <ErrorPanel label="工作区目录暂时不可用" /> : items.length === 0 ? <div className="admin-empty"><BookOpen size={22} /><strong>没有匹配的工作区</strong><span>请调整关键词或状态筛选。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-workspace-table"><thead><tr><th>工作区</th><th>负责人</th><th>状态</th><th>成员</th><th>账本结构</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{items.map(workspace => <tr key={workspace.id}><td><div className="admin-user-cell"><div className="admin-table-avatar"><BookOpen size={14} /></div><div><strong>{workspace.name}</strong><small>{workspace.industryId || "未设置行业"}</small></div></div></td><td><div className="admin-owner-cell"><strong>{workspace.ownerName || "未命名负责人"}</strong><small>{workspace.ownerEmail || "联系方式已隐藏"}</small></div></td><td><StatusPill status={workspace.status === "active" ? "正常" : "已暂停"} /></td><td><strong className="admin-table-number">{formatNumber(workspace.memberCount)}</strong></td><td>{workspace.book ? <span className="admin-book-version"><GitBranch size={12} />v{workspace.book.schemaVersion} · r{workspace.book.revision}</span> : <span className="admin-muted-value">暂无账本</span>}</td><td><span className="admin-table-date">{formatDate(workspace.updatedAt)}</span></td><td><button className={`admin-row-action ${workspace.status === "active" ? "is-danger" : "is-safe"}`} onClick={() => { setSelected({ id: workspace.id, name: workspace.name, status: workspace.status }); setReason(""); setActionError(""); }}>{workspace.status === "active" ? <><PauseCircle size={15} />暂停</> : <><PlayCircle size={15} />恢复</>}</button></td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(workspaces.data?.total)} 个工作区</span><div><button disabled={page <= 1 || workspaces.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</button><button disabled={page >= totalPages || workspaces.isFetching} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>下一页</button></div></div></section>
    {selected && <div className="admin-confirm-backdrop" role="presentation"><section className="admin-confirm-card" role="dialog" aria-modal="true" aria-labelledby="workspace-status-confirm-title"><button className="admin-confirm-close" aria-label="取消工作区状态变更" onClick={() => setSelected(null)}><X size={17} /></button><p className="admin-eyebrow">CONFIRM WORKSPACE ACTION</p><h3 id="workspace-status-confirm-title">{nextStatus === "suspended" ? "暂停账本工作区" : "恢复账本工作区"}</h3><p className="admin-confirm-lead">你将把 <strong>{selected.name}</strong> 的状态变更为“{nextStatus === "suspended" ? "已暂停" : "正常"}”。暂停后该工作区的普通商家端读取和写入会被服务端阻断。</p><label className="admin-reason-label">变更理由<span>必填</span><textarea aria-label="工作区变更理由" value={reason} onChange={event => setReason(event.target.value)} placeholder="请说明本次工作区状态变更的原因" maxLength={240} /></label>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={setWorkspaceStatus.isPending} onClick={() => setSelected(null)}>取消</button><button className="admin-primary-action" disabled={reason.trim().length < 2 || setWorkspaceStatus.isPending} onClick={changeStatus}>{setWorkspaceStatus.isPending ? <><Loader2 size={15} className="admin-spin" />提交中</> : "确认变更"}</button></div><small className="admin-confirm-note">服务端将执行二次确认、状态校验和管理员审计。</small></section></div>}
  </>;
}

type MigrationSelection = { migrationId: string; title: string; impactSummary: string; rollbackPlan: string; destructive: boolean; status: "pending" | "approved" | "rejected" };

function MigrationReviews() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<MigrationSelection | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [actionError, setActionError] = useState("");
  const reviews = trpc.admin.migrations.list.useQuery({ page, pageSize: 8, status: status === "all" ? undefined : status }, { retry: false, refetchOnWindowFocus: false });
  const reviewMutation = trpc.admin.migrations.review.useMutation({ onSuccess: async () => { setSelected(null); setReviewNote(""); setActionError(""); await reviews.refetch(); }, onError: () => setActionError("迁移审核未提交，请稍后重试或检查管理员权限。") });
  const totalPages = Math.max(1, Math.ceil((reviews.data?.total ?? 0) / 8));
  const submitReview = () => { if (!selected || reviewNote.trim().length < 2) return; reviewMutation.mutate({ migrationId: selected.migrationId, title: selected.title, impactSummary: selected.impactSummary, rollbackPlan: selected.rollbackPlan, destructive: selected.destructive, status: decision, reviewNote: reviewNote.trim(), confirm: true, requestId: crypto.randomUUID() }); };
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">MIGRATION REVIEW</p><h2>迁移审核</h2><p>在数据库变更执行前审阅影响范围、破坏性标记和回滚方案。审核结论只记录审批状态，不会触发生产迁移。</p></div><div className="admin-heading-meta"><GitBranch size={18} /><span>{formatNumber(reviews.data?.total)} 条记录</span></div></div>
    <section className="admin-panel admin-user-toolbar"><label className="admin-filter-select admin-filter-standalone"><Filter size={15} /><span>审核状态</span><select aria-label="迁移审核状态筛选" value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="pending">待审核</option><option value="all">全部</option><option value="approved">已批准</option><option value="rejected">已驳回</option></select></label><button className="admin-icon-button" title="刷新迁移审核" aria-label="刷新迁移审核" onClick={() => reviews.refetch()}><RefreshCw size={15} className={reviews.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">CHANGE CONTROL</p><h3>结构变更记录</h3></div><span className="admin-table-caption">第 {page} / {totalPages} 页</span></div>{reviews.isLoading ? <LoadingPanel label="正在读取迁移审核记录" /> : reviews.isError ? <ErrorPanel label="迁移审核记录暂时不可用" /> : !reviews.data?.items.length ? <div className="admin-empty"><CheckCheck size={22} /><strong>当前没有待审核迁移</strong><span>可切换筛选查看历史审核结果。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-migration-table"><thead><tr><th>迁移</th><th>影响范围</th><th>破坏性</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{reviews.data.items.map(review => <tr key={review.id}><td><div className="admin-migration-id"><GitBranch size={14} /><strong>{review.migrationId}</strong><small>{review.title}</small></div></td><td><span className="admin-impact-text">{review.impactSummary}</span></td><td>{review.destructive ? <span className="admin-danger-label"><AlertTriangle size={13} />是</span> : <span className="admin-safe-label"><CheckCheck size={13} />否</span>}</td><td><StatusPill status={review.status === "pending" ? "待审核" : review.status === "approved" ? "已批准" : "已驳回"} /></td><td><span className="admin-table-date">{formatDate(review.updatedAt)}</span></td><td><button className="admin-row-action is-safe" onClick={() => { setSelected(review); setDecision(review.status === "rejected" ? "approved" : "approved"); setReviewNote(""); setActionError(""); }}>{review.status === "pending" ? "开始审核" : "重新审核"}</button></td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(reviews.data?.total)} 条记录</span><div><button disabled={page <= 1 || reviews.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</button><button disabled={page >= totalPages || reviews.isFetching} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>下一页</button></div></div></section>
    {selected && <div className="admin-confirm-backdrop" role="presentation"><section className="admin-confirm-card admin-review-card" role="dialog" aria-modal="true" aria-labelledby="migration-review-title"><button className="admin-confirm-close" aria-label="取消迁移审核" onClick={() => setSelected(null)}><X size={17} /></button><p className="admin-eyebrow">REVIEW STRUCTURE CHANGE</p><h3 id="migration-review-title">审核 {selected.migrationId}</h3><div className="admin-review-facts"><div><span>变更标题</span><strong>{selected.title}</strong></div><div><span>影响范围</span><p>{selected.impactSummary}</p></div><div><span>回滚方案</span><p>{selected.rollbackPlan}</p></div></div>{selected.destructive && <div className="admin-inline-warning"><AlertTriangle size={15} />该迁移标记为破坏性变更，审核通过后仍需发布 Agent 单独授权执行。</div>}<div className="admin-decision-group"><span>审核结论</span><button className={decision === "approved" ? "is-selected" : ""} onClick={() => setDecision("approved")}><CheckCheck size={14} />批准</button><button className={decision === "rejected" ? "is-selected is-rejected" : ""} onClick={() => setDecision("rejected")}><RotateCcw size={14} />驳回</button></div><label className="admin-reason-label">审核备注<span>必填</span><textarea aria-label="审核备注" value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="请记录审核结论依据" maxLength={500} /></label>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={reviewMutation.isPending} onClick={() => setSelected(null)}>取消</button><button className="admin-primary-action" disabled={reviewNote.trim().length < 2 || reviewMutation.isPending} onClick={submitReview}>{reviewMutation.isPending ? <><Loader2 size={15} className="admin-spin" />提交中</> : "确认提交审核"}</button></div><small className="admin-confirm-note">服务端会校验管理员权限、二次确认并写入审计日志；不会自动执行迁移。</small></section></div>}
  </>;
}

function MonitoringOperations() {
  const [metricKey, setMetricKey] = useState<"all" | "database.latency_ms" | "runtime.heap_used_bytes" | "runtime.rss_bytes">("all");
  const [periodMinutes, setPeriodMinutes] = useState<60 | 360 | 1440>(360);
  const summary = trpc.admin.metrics.summary.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const samples = trpc.admin.metrics.list.useQuery({ page: 1, pageSize: 12, metricKey: metricKey === "all" ? undefined : metricKey, periodMinutes }, { retry: false, refetchOnWindowFocus: false });
  const runtime = summary.data?.runtime;
  const latest = summary.data?.latestSamples ?? [];
  const latestFor = (key: string) => latest.find(sample => sample.metricKey === key);
  const formatBytes = (value?: number) => value === undefined ? "—" : `${(value / 1024 / 1024).toFixed(1)} MB`;
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">SYSTEM OBSERVABILITY</p><h2>系统监控</h2><p>查看服务端健康、运行时资源和最近性能样本。页面只显示脱敏指标，不展示主机路径、环境变量或凭据。</p></div><div className="admin-heading-meta"><Gauge size={18} /><span>{summary.data?.database === "ok" ? "数据库正常" : "数据库不可用"}</span></div></div>
    <section className="admin-metric-grid"><MonitoringMetricCard label="数据库" value={summary.isLoading ? "读取中" : summary.data?.database === "ok" ? "正常" : "不可用"} hint={summary.data?.database === "ok" ? "SELECT 1 检查通过" : "等待服务恢复"} tone={summary.data?.database === "ok" ? "safe" : "warning"} icon={<Database size={17} />} /><MonitoringMetricCard label="进程运行时长" value={runtime ? formatDuration(runtime.uptimeSeconds) : "—"} hint={runtime ? `Node ${runtime.nodeMajor}` : "暂无数据"} icon={<Activity size={17} />} /><MonitoringMetricCard label="堆内存" value={formatBytes(runtime?.heapUsedBytes)} hint={runtime ? `上限 ${formatBytes(runtime.heapTotalBytes)}` : "暂无数据"} icon={<Gauge size={17} />} /><MonitoringMetricCard label="数据库延迟" value={latestFor("database.latency_ms") ? `${latestFor("database.latency_ms")!.value.toFixed(0)} ms` : "—"} hint="最近一次样本" icon={<Clock3 size={17} />} /></section>
    <section className="admin-panel admin-user-toolbar"><label className="admin-filter-select admin-filter-standalone"><Filter size={15} /><span>指标</span><select aria-label="性能指标筛选" value={metricKey} onChange={event => setMetricKey(event.target.value as typeof metricKey)}><option value="all">全部指标</option><option value="database.latency_ms">数据库延迟</option><option value="runtime.heap_used_bytes">堆内存</option><option value="runtime.rss_bytes">RSS 内存</option></select></label><label className="admin-filter-select"><Clock3 size={15} /><span>窗口</span><select aria-label="指标时间窗口" value={periodMinutes} onChange={event => setPeriodMinutes(Number(event.target.value) as typeof periodMinutes)}><option value="60">近 1 小时</option><option value="360">近 6 小时</option><option value="1440">近 24 小时</option></select></label><button className="admin-icon-button" title="刷新监控数据" aria-label="刷新监控数据" onClick={() => { summary.refetch(); samples.refetch(); }}><RefreshCw size={15} className={summary.isFetching || samples.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">METRIC SAMPLES</p><h3>性能指标样本</h3></div><span className="admin-table-caption">最近 {periodMinutes >= 1440 ? "24 小时" : periodMinutes === 360 ? "6 小时" : "1 小时"}</span></div>{samples.isLoading ? <LoadingPanel label="正在读取指标样本" /> : samples.isError ? <ErrorPanel label="指标样本暂时不可用" /> : !samples.data?.items.length ? <div className="admin-empty"><Gauge size={22} /><strong>当前没有指标样本</strong><span>可切换时间窗口或等待下一次采样。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-metrics-table"><thead><tr><th>指标</th><th>数值</th><th>单位</th><th>采样时间</th></tr></thead><tbody>{samples.data.items.map(sample => <tr key={sample.id}><td><span className="admin-metric-key">{sample.metricKey}</span></td><td><strong className="admin-table-number">{sample.value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</strong></td><td><span className="admin-unit-label">{sample.unit}</span></td><td><span className="admin-table-date">{formatDate(sample.recordedAt)}</span></td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(samples.data?.total)} 条样本</span><span className="admin-data-note">数据由服务端采集并脱敏</span></div></section>
  </>;
}

function AuditOperations() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");
  const [outcome, setOutcome] = useState<"all" | "success" | "failure" | "cancelled">("all");
  const [targetType, setTargetType] = useState("all");
  const audit = trpc.admin.audit.list.useQuery({ page, pageSize: 12, action: action === "all" ? undefined : action, outcome: outcome === "all" ? undefined : outcome, targetType: targetType === "all" ? undefined : targetType }, { retry: false, refetchOnWindowFocus: false });
  const totalPages = Math.max(1, Math.ceil((audit.data?.total ?? 0) / 12));
  const resetPage = <T,>(setter: (value: T) => void, value: T) => { setter(value); setPage(1); };
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">AUDIT TRAIL</p><h2>审计日志</h2><p>查询管理员操作的时间、目标和结果。详情由服务端脱敏，日志页面不显示 Token、密码、验证码或连接信息。</p></div><div className="admin-heading-meta"><ClipboardList size={18} /><span>{formatNumber(audit.data?.total)} 条事件</span></div></div>
    <section className="admin-panel admin-user-toolbar"><label className="admin-filter-select admin-filter-standalone"><Filter size={15} /><span>结果</span><select aria-label="审计结果筛选" value={outcome} onChange={event => resetPage(setOutcome, event.target.value as typeof outcome)}><option value="all">全部结果</option><option value="success">成功</option><option value="failure">失败</option><option value="cancelled">已取消</option></select></label><label className="admin-filter-select"><span>目标</span><select aria-label="审计目标筛选" value={targetType} onChange={event => resetPage(setTargetType, event.target.value)}><option value="all">全部目标</option><option value="user">用户</option><option value="workspace">工作区</option><option value="migration">迁移</option><option value="config">配置</option><option value="backup_run">备份</option></select></label><label className="admin-filter-select"><span>动作</span><input className="admin-filter-input" aria-label="审计动作筛选" value={action === "all" ? "" : action} onChange={event => setAction(event.target.value || "all")} onKeyDown={event => { if (event.key === "Enter") setPage(1); }} placeholder="如 user.status.change" maxLength={80} /></label><button className="admin-icon-button" title="刷新审计日志" aria-label="刷新审计日志" onClick={() => audit.refetch()}><RefreshCw size={15} className={audit.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">ADMIN EVENTS</p><h3>管理员操作记录</h3></div><span className="admin-table-caption">第 {page} / {totalPages} 页</span></div>{audit.isLoading ? <LoadingPanel label="正在读取审计日志" /> : audit.isError ? <ErrorPanel label="审计日志暂时不可用" /> : !audit.data?.items.length ? <div className="admin-empty"><ClipboardList size={22} /><strong>没有匹配的审计事件</strong><span>请调整筛选条件。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-audit-table"><thead><tr><th>时间</th><th>动作</th><th>目标</th><th>结果</th><th>请求标识</th><th>详情</th></tr></thead><tbody>{audit.data.items.map(event => <tr key={event.id}><td><span className="admin-table-date">{formatDate(event.createdAt)}</span></td><td><span className="admin-audit-action">{event.action}</span></td><td><div className="admin-audit-target"><strong>{event.targetType}</strong><small>{event.targetId ? `${event.targetId.slice(0, 8)}…` : "—"}</small></div></td><td><StatusPill status={event.outcome === "success" ? "成功" : event.outcome === "failure" ? "失败" : "已取消"} /></td><td><span className="admin-request-id">{event.requestId ? `${event.requestId.slice(0, 8)}…` : "系统"}</span></td><td>{event.details && Object.keys(event.details).length > 0 ? <details className="admin-audit-details"><summary>查看脱敏详情</summary><pre>{JSON.stringify(event.details, null, 2)}</pre></details> : <span className="admin-muted-value">无详情</span>}</td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(audit.data?.total)} 条事件</span><div><button disabled={page <= 1 || audit.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</button><button disabled={page >= totalPages || audit.isFetching} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>下一页</button></div></div></section>
  </>;
}

function MonitoringMetricCard({ label, value, hint, icon, tone }: { label: string; value: string; hint: string; icon: React.ReactNode; tone?: "safe" | "warning" }) { return <div className={`admin-metric-card ${tone === "warning" ? "is-warning" : ""}`}><div className="admin-metric-card-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours} 小时 ${minutes} 分` : `${minutes} 分钟`; }

function ConfigOperations() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const [configKey, setConfigKey] = useState("");
  const [selected, setSelected] = useState<{ id: string; configKey: string; version: number; payload: Record<string, unknown>; changeSummary: string; status: "draft" | "published" | "archived" } | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [draftPayload, setDraftPayload] = useState('{\n  "enabled": true\n}');
  const [changeSummary, setChangeSummary] = useState("");
  const [actionError, setActionError] = useState("");
  const configs = trpc.admin.configs.list.useQuery({ page, pageSize: 10, configKey: configKey.trim() || undefined, status: status === "all" ? undefined : status }, { retry: false, refetchOnWindowFocus: false });
  const saveDraft = trpc.admin.configs.saveDraft.useMutation({ onSuccess: async () => { setDraftOpen(false); setActionError(""); setDraftKey(""); setDraftPayload('{\n  "enabled": true\n}'); setChangeSummary(""); await configs.refetch(); }, onError: error => setActionError(error.message || "配置草稿保存失败，请检查字段和权限。") });
  const publish = trpc.admin.configs.publish.useMutation({ onSuccess: async () => { setSelected(null); setActionError(""); await configs.refetch(); }, onError: error => setActionError(error.message || "配置发布失败，请稍后重试。") });
  const items = configs.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((configs.data?.total ?? 0) / 10));
  const submitDraft = () => { if (!draftKey.trim() || changeSummary.trim().length < 2) return; try { const payload = JSON.parse(draftPayload) as unknown; if (!payload || Array.isArray(payload) || typeof payload !== "object") throw new Error("配置必须是对象"); saveDraft.mutate({ configKey: draftKey.trim(), payload: payload as Record<string, string | number | boolean | null>, changeSummary: changeSummary.trim() }); } catch { setActionError("配置内容必须是仅含字符串、数字、布尔值或 null 的 JSON 对象。"); } };
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">VERSIONED CONFIGURATION</p><h2>全局配置</h2><p>管理版本化配置草稿与发布状态。仅允许白名单字段，服务端会拒绝密码、Token、密钥和连接信息。</p></div><div className="admin-heading-meta"><Settings2 size={18} /><span>{formatNumber(configs.data?.total)} 个版本</span></div></div>
    <section className="admin-panel admin-user-toolbar"><label className="admin-filter-select admin-filter-standalone"><Filter size={15} /><span>状态</span><select aria-label="配置状态筛选" value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="all">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已归档</option></select></label><form className="admin-search-form" onSubmit={event => { event.preventDefault(); setPage(1); setConfigKey((event.currentTarget.elements.namedItem("configKey") as HTMLInputElement).value.trim()); }}><Search size={16} /><input name="configKey" aria-label="搜索配置键" placeholder="搜索配置键" maxLength={80} /><button type="submit">搜索</button></form><button className="admin-primary-action admin-toolbar-action" onClick={() => { setDraftOpen(true); setActionError(""); }}><Plus size={15} />新建草稿</button><button className="admin-icon-button" title="刷新配置" aria-label="刷新配置" onClick={() => configs.refetch()}><RefreshCw size={15} className={configs.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">CONFIG VERSIONS</p><h3>配置版本</h3></div><span className="admin-table-caption">第 {page} / {totalPages} 页</span></div>{configs.isLoading ? <LoadingPanel label="正在读取配置版本" /> : configs.isError ? <ErrorPanel label="配置版本暂时不可用" /> : items.length === 0 ? <div className="admin-empty"><Settings2 size={22} /><strong>没有匹配的配置版本</strong><span>可新建一个经过白名单校验的配置草稿。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-config-table"><thead><tr><th>配置键</th><th>版本</th><th>状态</th><th>变更摘要</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><span className="admin-config-key">{item.configKey}</span></td><td><strong className="admin-table-number">v{item.version}</strong></td><td><StatusPill status={item.status === "draft" ? "草稿" : item.status === "published" ? "已发布" : "已归档"} /></td><td><span className="admin-config-summary">{item.changeSummary}</span></td><td><span className="admin-table-date">{formatDate(item.updatedAt)}</span></td><td><div className="admin-row-actions"><button className="admin-row-action is-safe" onClick={() => { setSelected(item); setActionError(""); }}>查看</button>{item.status === "draft" && <button className="admin-row-action is-primary" onClick={() => { setSelected(item); setActionError(""); }}>发布</button>}</div></td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(configs.data?.total)} 个版本</span><div><button disabled={page <= 1 || configs.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</button><button disabled={page >= totalPages || configs.isFetching} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>下一页</button></div></div></section>
    {draftOpen && <div className="admin-confirm-backdrop"><section className="admin-confirm-card admin-config-dialog" role="dialog" aria-modal="true" aria-labelledby="config-draft-title"><button className="admin-confirm-close" aria-label="取消新建配置草稿" onClick={() => setDraftOpen(false)}><X size={17} /></button><p className="admin-eyebrow">NEW CONFIG DRAFT</p><h3 id="config-draft-title">新建配置草稿</h3><label className="admin-reason-label">配置键<span>必填</span><input aria-label="配置键" value={draftKey} onChange={event => setDraftKey(event.target.value)} placeholder="例如 onboarding.banner" maxLength={80} /></label><label className="admin-reason-label">配置内容<span>白名单 JSON</span><textarea aria-label="配置内容" value={draftPayload} onChange={event => setDraftPayload(event.target.value)} rows={7} /></label><label className="admin-reason-label">变更摘要<span>必填</span><input aria-label="变更摘要" value={changeSummary} onChange={event => setChangeSummary(event.target.value)} placeholder="说明本次配置变更" maxLength={240} /></label>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={saveDraft.isPending} onClick={() => setDraftOpen(false)}>取消</button><button className="admin-primary-action" disabled={!draftKey.trim() || changeSummary.trim().length < 2 || saveDraft.isPending} onClick={submitDraft}>{saveDraft.isPending ? <><Loader2 size={15} className="admin-spin" />保存中</> : "保存草稿"}</button></div><small className="admin-confirm-note">服务端会再次校验配置键与敏感字段，保存动作会写入管理员审计。</small></section></div>}
    {selected && <div className="admin-confirm-backdrop"><section className="admin-confirm-card admin-config-dialog" role="dialog" aria-modal="true" aria-labelledby="config-view-title"><button className="admin-confirm-close" aria-label="关闭配置详情" onClick={() => setSelected(null)}><X size={17} /></button><p className="admin-eyebrow">CONFIG VERSION DETAIL</p><h3 id="config-view-title">{selected.configKey} · v{selected.version}</h3><div className="admin-review-facts"><div><span>状态</span><strong>{selected.status === "draft" ? "草稿" : selected.status === "published" ? "已发布" : "已归档"}</strong></div><div><span>变更摘要</span><strong>{selected.changeSummary}</strong></div></div><pre className="admin-config-payload">{JSON.stringify(selected.payload, null, 2)}</pre>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={publish.isPending} onClick={() => setSelected(null)}>关闭</button>{selected.status === "draft" && <button className="admin-primary-action" disabled={publish.isPending} onClick={() => publish.mutate({ configId: selected.id, confirm: true, requestId: crypto.randomUUID() })}>{publish.isPending ? <><Loader2 size={15} className="admin-spin" />发布中</> : "二次确认并发布"}</button>}</div><small className="admin-confirm-note">发布会归档同配置键的旧版本，且会写入管理员审计。</small></section></div>}
  </>;
}

function BackupOperations() {
  const [runsPage, setRunsPage] = useState(1);
  const [runStatus, setRunStatus] = useState<"all" | "queued" | "running" | "succeeded" | "failed" | "cancelled">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [action, setAction] = useState<{ type: "pause" | "resume" | "run"; id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "每日备份", cadence: "daily" as "daily" | "weekly", runAt: "02:30", timezone: "Asia/Shanghai", retentionDays: "30" });
  const [actionError, setActionError] = useState("");
  const schedules = trpc.admin.backups.schedules.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const runs = trpc.admin.backups.runs.useQuery({ page: runsPage, pageSize: 10, status: runStatus === "all" ? undefined : runStatus }, { retry: false, refetchOnWindowFocus: false });
  const create = trpc.admin.backups.schedules.create.useMutation({ onSuccess: async () => { setCreateOpen(false); setActionError(""); await schedules.refetch(); }, onError: error => setActionError(error.message || "备份计划创建失败，请检查参数。") });
  const setStatus = trpc.admin.backups.schedules.setStatus.useMutation({ onSuccess: async () => { setAction(null); setActionError(""); await schedules.refetch(); }, onError: error => setActionError(error.message || "备份计划状态变更失败。") });
  const runNow = trpc.admin.backups.schedules.runNow.useMutation({ onSuccess: async () => { setAction(null); setActionError(""); await runs.refetch(); }, onError: error => setActionError(error.message || "备份任务排队失败。") });
  const items = schedules.data ?? [];
  const totalPages = Math.max(1, Math.ceil((runs.data?.total ?? 0) / 10));
  const submitCreate = () => { if (!form.name.trim() || !/^\\d{2}:\\d{2}$/.test(form.runAt) || Number(form.retentionDays) < 1) return; create.mutate({ name: form.name.trim(), cadence: form.cadence, runAt: form.runAt, timezone: form.timezone, retentionDays: Number(form.retentionDays), confirm: true, requestId: crypto.randomUUID() }); };
  const confirmAction = () => { if (!action) return; if (action.type === "run") runNow.mutate({ scheduleId: action.id, confirm: true, requestId: crypto.randomUUID() }); else setStatus.mutate({ scheduleId: action.id, status: action.type === "pause" ? "paused" : "enabled", confirm: true, requestId: crypto.randomUUID() }); };
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">BACKUP OPERATIONS</p><h2>定时备份</h2><p>管理备份计划与运行记录。手动执行只会排队，实际备份由受控 worker 执行；页面不接触任何凭据。</p></div><div className="admin-heading-meta"><Archive size={18} /><span>{items.filter(item => item.status === "enabled").length} 个计划运行中</span></div></div>
    <section className="admin-panel admin-user-toolbar"><label className="admin-filter-select admin-filter-standalone"><Filter size={15} /><span>运行状态</span><select aria-label="备份运行状态筛选" value={runStatus} onChange={event => { setRunStatus(event.target.value as typeof runStatus); setRunsPage(1); }}><option value="all">全部</option><option value="queued">已排队</option><option value="running">执行中</option><option value="succeeded">已完成</option><option value="failed">失败</option><option value="cancelled">已取消</option></select></label><button className="admin-primary-action admin-toolbar-action" onClick={() => { setCreateOpen(true); setActionError(""); }}><Plus size={15} />新建计划</button><button className="admin-icon-button" title="刷新备份数据" aria-label="刷新备份数据" onClick={() => { schedules.refetch(); runs.refetch(); }}><RefreshCw size={15} className={schedules.isFetching || runs.isFetching ? "admin-spin" : ""} /></button></section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">BACKUP SCHEDULES</p><h3>备份计划</h3></div><span className="admin-table-caption">{items.length} 个计划</span></div>{schedules.isLoading ? <LoadingPanel label="正在读取备份计划" /> : schedules.isError ? <ErrorPanel label="备份计划暂时不可用" /> : items.length === 0 ? <div className="admin-empty"><Archive size={22} /><strong>还没有备份计划</strong><span>新建计划后，worker 才会在下一个窗口排队运行。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-backup-table"><thead><tr><th>计划</th><th>时间</th><th>保留</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><div className="admin-user-cell"><div className="admin-table-avatar"><Archive size={14} /></div><div><strong>{item.name}</strong><small>{item.cadence === "daily" ? "每天" : "每周"} · {item.timezone}</small></div></div></td><td><span className="admin-config-key">{item.runAt}</span></td><td><strong className="admin-table-number">{item.retentionDays}</strong><span className="admin-unit-label"> 天</span></td><td><StatusPill status={item.status === "enabled" ? "运行中" : "已暂停"} /></td><td><div className="admin-row-actions"><button className={`admin-row-action ${item.status === "enabled" ? "is-danger" : "is-safe"}`} onClick={() => { setAction({ type: item.status === "enabled" ? "pause" : "resume", id: item.id, name: item.name }); setActionError(""); }}>{item.status === "enabled" ? <><PauseCircle size={15} />暂停</> : <><PlayCircle size={15} />恢复</>}</button><button className="admin-row-action is-primary" disabled={item.status !== "enabled"} onClick={() => { setAction({ type: "run", id: item.id, name: item.name }); setActionError(""); }}><RotateCcw size={15} />立即排队</button></div></td></tr>)}</tbody></table></div>}</section>
    <section className="admin-panel admin-table-panel"><div className="admin-table-head"><div><p className="admin-eyebrow">BACKUP RUNS</p><h3>运行记录</h3></div><span className="admin-table-caption">第 {runsPage} / {totalPages} 页</span></div>{runs.isLoading ? <LoadingPanel label="正在读取运行记录" /> : runs.isError ? <ErrorPanel label="备份运行记录暂时不可用" /> : !runs.data?.items.length ? <div className="admin-empty"><CheckCheck size={22} /><strong>没有匹配的运行记录</strong><span>已排队的任务会在受控 worker 领取后更新状态。</span></div> : <div className="admin-table-wrap"><table className="admin-table admin-backup-table"><thead><tr><th>状态</th><th>计划 ID</th><th>开始/完成</th><th>写入量</th><th>错误摘要</th></tr></thead><tbody>{runs.data.items.map(item => <tr key={item.id}><td><StatusPill status={item.status === "queued" ? "已排队" : item.status === "running" ? "执行中" : item.status === "succeeded" ? "已完成" : item.status === "failed" ? "失败" : "已取消"} /></td><td><span className="admin-config-key">{item.scheduleId.slice(0, 8)}…</span></td><td><span className="admin-table-date">{formatDate(item.startedAt)} → {formatDate(item.completedAt)}</span></td><td><strong className="admin-table-number">{item.bytesWritten == null ? "—" : `${formatNumber(item.bytesWritten)} B`}</strong></td><td>{item.errorSummary ? <span className="admin-error-summary">{item.errorSummary}</span> : <span className="admin-muted-value">—</span>}</td></tr>)}</tbody></table></div>}<div className="admin-pagination"><span>共 {formatNumber(runs.data?.total)} 条运行记录</span><div><button disabled={runsPage <= 1 || runs.isFetching} onClick={() => setRunsPage(value => Math.max(1, value - 1))}>上一页</button><button disabled={runsPage >= totalPages || runs.isFetching} onClick={() => setRunsPage(value => Math.min(totalPages, value + 1))}>下一页</button></div></div></section>
    {createOpen && <div className="admin-confirm-backdrop"><section className="admin-confirm-card" role="dialog" aria-modal="true" aria-labelledby="backup-create-title"><button className="admin-confirm-close" aria-label="取消新建备份计划" onClick={() => setCreateOpen(false)}><X size={17} /></button><p className="admin-eyebrow">NEW BACKUP SCHEDULE</p><h3 id="backup-create-title">新建备份计划</h3><p className="admin-confirm-lead">计划只保存调度元数据，实际备份由受控 worker 执行，不会在浏览器中接触凭据。</p><label className="admin-reason-label">计划名称<span>必填</span><input aria-label="备份计划名称" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={120} /></label><div className="admin-form-grid"><label className="admin-reason-label">频率<select aria-label="备份频率" value={form.cadence} onChange={event => setForm({ ...form, cadence: event.target.value as typeof form.cadence })}><option value="daily">每天</option><option value="weekly">每周</option></select></label><label className="admin-reason-label">执行时间<input aria-label="备份执行时间" value={form.runAt} onChange={event => setForm({ ...form, runAt: event.target.value })} placeholder="02:30" /></label></div><div className="admin-form-grid"><label className="admin-reason-label">时区<input aria-label="备份时区" value={form.timezone} onChange={event => setForm({ ...form, timezone: event.target.value })} /></label><label className="admin-reason-label">保留天数<input aria-label="备份保留天数" type="number" min={1} max={365} value={form.retentionDays} onChange={event => setForm({ ...form, retentionDays: event.target.value })} /></label></div>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={create.isPending} onClick={() => setCreateOpen(false)}>取消</button><button className="admin-primary-action" disabled={create.isPending} onClick={submitCreate}>{create.isPending ? <><Loader2 size={15} className="admin-spin" />保存中</> : "确认创建"}</button></div><small className="admin-confirm-note">服务端将再次校验时间、时区、保留期和管理员权限，并写入审计。</small></section></div>}
    {action && <div className="admin-confirm-backdrop"><section className="admin-confirm-card" role="dialog" aria-modal="true" aria-labelledby="backup-action-title"><button className="admin-confirm-close" aria-label="取消备份操作" onClick={() => setAction(null)}><X size={17} /></button><p className="admin-eyebrow">CONFIRM BACKUP ACTION</p><h3 id="backup-action-title">{action.type === "run" ? "立即排队备份" : action.type === "pause" ? "暂停备份计划" : "恢复备份计划"}</h3><p className="admin-confirm-lead">计划 <strong>{action.name}</strong> 将{action.type === "run" ? "创建一条已排队运行记录，稍后由 worker 执行" : action.type === "pause" ? "暂停后续自动排队" : "恢复后继续按计划排队"}。</p>{actionError && <div className="admin-inline-error"><ShieldAlert size={15} />{actionError}</div>}<div className="admin-confirm-actions"><button className="admin-cancel-button" disabled={setStatus.isPending || runNow.isPending} onClick={() => setAction(null)}>取消</button><button className="admin-primary-action" disabled={setStatus.isPending || runNow.isPending} onClick={confirmAction}>{setStatus.isPending || runNow.isPending ? <><Loader2 size={15} className="admin-spin" />处理中</> : "确认并继续"}</button></div><small className="admin-confirm-note">操作会写入管理员审计；“立即排队”不会伪装为备份已完成。</small></section></div>}
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

  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark"><ShieldAlert size={17} /></span><div><strong>算得清</strong><small>管理维护平台</small></div></div><div className="admin-sidebar-label">平台运营</div><nav>{navigation.map(item => { const Icon = item.icon; return <button key={item.key} className={`admin-nav-item ${sectionKey === item.key ? "is-active" : ""}`} onClick={() => setSectionKey(item.key)}><Icon size={17} /><span>{item.label}</span>{sectionKey === item.key && <span className="admin-nav-dot" />}</button>; })}</nav><div className="admin-sidebar-footer"><div className="admin-user-avatar">{(me.data.name ?? "管").slice(0, 1)}</div><div><strong>{me.data.name ?? "平台管理员"}</strong><small>{me.data.email ?? "已授权管理员"}</small></div></div></aside><main className="admin-main"><header className="admin-topbar"><div><span className="admin-topbar-kicker">ADMIN CONSOLE</span><span className="admin-topbar-divider">/</span><span>{section.label}</span></div><div className="admin-topbar-right"><span className="admin-live-dot" />服务端已授权<span className="admin-topbar-separator" />只读安全模式</div></header><div className="admin-content">{sectionKey === "overview" ? <Overview onNavigate={setSectionKey} /> : sectionKey === "users" ? <UserOperations /> : sectionKey === "workspaces" ? <WorkspaceOperations /> : sectionKey === "migrations" ? <MigrationReviews /> : sectionKey === "monitoring" ? <MonitoringOperations /> : sectionKey === "audit" ? <AuditOperations /> : sectionKey === "configs" ? <ConfigOperations /> : sectionKey === "backups" ? <BackupOperations /> : <SectionPlaceholder section={section} />}</div></main></div>;
}

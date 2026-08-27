import { FormEvent, ReactNode, useState } from "react";
import { ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Store } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function SelfHostedAccessGate({ children }: { children: ReactNode }) {
  const setup = trpc.auth.setupStatus.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [industryId, setIndustryId] = useState<"canteen" | "retail" | "ecommerce" | "beauty" | "stall">("ecommerce");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const bootstrap = trpc.auth.bootstrap.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); await utils.auth.setupStatus.invalidate(); } });
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const register = trpc.auth.registerAndCreateWorkspace.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });

  if (setup.isLoading || me.isLoading) return <div className="selfhost-loading"><ShieldCheck size={20} />正在连接安全账本…</div>;
  if (me.data) return <>{children}</>;

  const isBootstrap = Boolean(setup.data?.needsBootstrap);
  const isRegistering = !isBootstrap && mode === "register";
  const isPending = bootstrap.isPending || login.isPending || register.isPending;
  const title = isBootstrap ? "初始化管理员" : isRegistering ? "创建你的店铺" : "欢迎回到店铺";
  const intro = isBootstrap ? "使用仅在服务器环境中保存的初始化令牌，完成首个管理员工作区设置。" : isRegistering ? "一分钟创建你的专属账本。店铺数据默认只对你可见。" : "登录后继续查看利润、成本和经营提醒。";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (isBootstrap && !bootstrapToken.trim()) return setError("请输入初始化令牌");
    if ((isBootstrap || isRegistering) && !name.trim()) return setError("请输入您的姓名");
    if ((isBootstrap || isRegistering) && !workspaceName.trim()) return setError("请输入店铺名称");
    if (!email.trim()) return setError("请输入邮箱地址");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("请输入正确的邮箱地址");
    if (!password) return setError("请输入密码");
    if ((isBootstrap || isRegistering) && password.length < 8) return setError("密码至少需要 8 个字符");
    try {
      if (isBootstrap) await bootstrap.mutateAsync({ token: bootstrapToken, email, password, name, workspaceName });
      else if (mode === "register") await register.mutateAsync({ email, password, name, workspaceName, industryId });
      else await login.mutateAsync({ email, password });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法完成验证，请检查输入后重试");
    }
  };

  return <main className="selfhost-access">
    <section className="selfhost-hero" aria-hidden="true"><div className="selfhost-hero-brand"><span className="selfhost-hero-mark"><Store size={19} /></span><b>算得清</b><em>商家经营账本</em></div><div className="selfhost-hero-copy"><span>今日经营，心中有数</span><strong>每一笔成本<br />都算得清楚</strong></div><div className="selfhost-hero-chips"><span><Check size={12} />专属工作区</span><span><Check size={12} />私有数据</span></div><i className="selfhost-orbit one" /><i className="selfhost-orbit two" /></section>
    <section className="selfhost-access-card">
      <div className="selfhost-card-head"><div className="selfhost-brand"><div className="selfhost-brand-mark"><ShieldCheck size={20} /></div><div><p>算得清</p><small>商家成本管家</small></div></div><span className="selfhost-security"><LockKeyhole size={13} />安全登录</span></div>
      <div className="selfhost-title"><h1>{title}</h1><p>{intro}</p></div>
      <form className="selfhost-access-form" onSubmit={submit} noValidate>
        {isBootstrap && <><Field label="初始化令牌" value={bootstrapToken} onChange={setBootstrapToken} type="password" autoComplete="one-time-code" placeholder="部署时生成的令牌" /><Field label="管理员姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" /><Field label="工作区名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：我的商店" /></>}
        {isRegistering && <><Field label="你的姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" /><Field label="店铺名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：小满商店" /><label className="selfhost-field"><span>经营行业</span><select value={industryId} onChange={event => setIndustryId(event.target.value as typeof industryId)}><option value="canteen">餐饮</option><option value="retail">零售</option><option value="ecommerce">电商</option><option value="beauty">美业服务</option><option value="stall">小商贩</option></select></label></>}
        <Field label="邮箱" value={email} onChange={setEmail} type="email" autoComplete="email" placeholder="name@example.com" icon={<Mail size={17} />} />
        <Field label="密码" value={password} onChange={setPassword} type="password" autoComplete={isBootstrap || isRegistering ? "new-password" : "current-password"} placeholder={isBootstrap || isRegistering ? "至少 8 个字符" : "请输入密码"} minLength={isBootstrap || isRegistering ? 8 : undefined} icon={<LockKeyhole size={17} />} />
        {(isBootstrap || isRegistering) && <p className="selfhost-field-hint">至少 8 位；建议使用长密码短语，并避免常见弱口令。</p>}
        {error && <p role="alert" className="selfhost-access-error">{error}</p>}
        <button type="submit" disabled={isPending} className="selfhost-access-submit"><span>{isPending ? "正在处理…" : isBootstrap ? "创建管理员并进入" : isRegistering ? "创建店铺并进入" : "登录并继续经营"}</span><ArrowRight size={18} /></button>
        {!isBootstrap && <button type="button" className="selfhost-access-switch" onClick={() => { setMode(current => current === "login" ? "register" : "login"); setError(""); }}>{isRegistering ? "已有账号？返回登录" : "还没有账号？创建你的店铺"}</button>}
      </form>
      {!isBootstrap && <p className="selfhost-card-foot">登录即表示你同意仅在授权设备上使用此工作区。</p>}
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", autoComplete, placeholder, minLength, icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; placeholder: string; minLength?: number; icon?: ReactNode }) {
  return <label className="selfhost-field"><span>{label}</span><div className="selfhost-input-wrap">{icon}<input value={value} onChange={event => onChange(event.target.value)} type={type} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} required /></div></label>;
}

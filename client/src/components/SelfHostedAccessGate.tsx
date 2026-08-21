import { FormEvent, ReactNode, useState } from "react";
import { ShieldCheck } from "lucide-react";
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
  const [bootstrapToken, setBootstrapToken] = useState("");
  const bootstrap = trpc.auth.bootstrap.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); await utils.auth.setupStatus.invalidate(); } });
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });

  if (setup.isLoading || me.isLoading) return <div className="selfhost-loading">正在连接安全账本…</div>;
  if (me.data) return <>{children}</>;

  const isBootstrap = Boolean(setup.data?.needsBootstrap);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (isBootstrap) await bootstrap.mutateAsync({ token: bootstrapToken, email, password, name, workspaceName });
      else await login.mutateAsync({ email, password });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法完成验证，请检查输入后重试");
    }
  };

  return <main className="selfhost-access">
    <section className="selfhost-access-card">
      <div className="selfhost-brand"><div className="selfhost-brand-mark"><ShieldCheck size={22} /></div><div><p>算得清</p><small>商家成本管家 · 安全账本</small></div></div>
      <h1>{isBootstrap ? "初始化管理员" : "登录工作区"}</h1>
      <p className="selfhost-access-intro">{isBootstrap ? "首次部署请使用服务器环境中的初始化令牌创建管理员。令牌不会保存到浏览器或账本中。" : "使用管理员为您创建的账号登录，进入专属工作区。"}</p>
      <form className="selfhost-access-form" onSubmit={submit}>
        {isBootstrap && <><Field label="初始化令牌" value={bootstrapToken} onChange={setBootstrapToken} type="password" autoComplete="one-time-code" placeholder="部署时生成的令牌" /><Field label="管理员姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" /><Field label="工作区名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：我的商店" /></>}
        <Field label="邮箱" value={email} onChange={setEmail} type="email" autoComplete="email" placeholder="name@example.com" />
        <Field label="密码" value={password} onChange={setPassword} type="password" autoComplete={isBootstrap ? "new-password" : "current-password"} placeholder={isBootstrap ? "至少 12 个字符" : "请输入密码"} />
        {error && <p role="alert" className="selfhost-access-error">{error}</p>}
        <button type="submit" disabled={bootstrap.isPending || login.isPending} className="selfhost-access-submit">{bootstrap.isPending || login.isPending ? "正在验证…" : isBootstrap ? "创建管理员并进入" : "安全登录"}</button>
      </form>
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", autoComplete, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; placeholder: string }) {
  return <label className="selfhost-field"><span>{label}</span><input value={value} onChange={event => onChange(event.target.value)} type={type} autoComplete={autoComplete} placeholder={placeholder} required /></label>;
}

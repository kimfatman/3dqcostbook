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

  if (setup.isLoading || me.isLoading) return <div className="min-h-screen grid place-items-center bg-[#f5f7fb] text-sm text-slate-500">正在连接安全账本…</div>;
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

  return <main className="min-h-screen bg-[#f5f7fb] px-5 py-10 text-[#0b1836]">
    <section className="mx-auto max-w-md rounded-[28px] bg-white p-6 shadow-[0_20px_50px_rgba(11,24,54,.12)]">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#087ff5] text-white"><ShieldCheck size={22} /></div><div><p className="text-lg font-bold">算得清</p><p className="text-xs text-slate-500">商家成本管家 · 安全账本</p></div></div>
      <h1 className="text-xl font-bold">{isBootstrap ? "初始化管理员" : "登录工作区"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{isBootstrap ? "首次部署请使用服务器环境中的初始化令牌创建管理员。令牌不会保存到浏览器或账本中。" : "使用管理员为您创建的账号登录，进入专属工作区。"}</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {isBootstrap && <><Field label="初始化令牌" value={bootstrapToken} onChange={setBootstrapToken} type="password" autoComplete="one-time-code" placeholder="部署时生成的令牌" /><Field label="管理员姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" /><Field label="工作区名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：我的商店" /></>}
        <Field label="邮箱" value={email} onChange={setEmail} type="email" autoComplete="email" placeholder="name@example.com" />
        <Field label="密码" value={password} onChange={setPassword} type="password" autoComplete={isBootstrap ? "new-password" : "current-password"} placeholder={isBootstrap ? "至少 12 个字符" : "请输入密码"} />
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={bootstrap.isPending || login.isPending} className="h-12 w-full rounded-2xl bg-[#087ff5] text-sm font-semibold text-white transition active:scale-[.98] disabled:opacity-60">{bootstrap.isPending || login.isPending ? "正在验证…" : isBootstrap ? "创建管理员并进入" : "安全登录"}</button>
      </form>
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", autoComplete, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; placeholder: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><input className="h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none transition focus:border-[#087ff5] focus:ring-4 focus:ring-[#087ff5]/10" value={value} onChange={event => onChange(event.target.value)} type={type} autoComplete={autoComplete} placeholder={placeholder} required /></label>;
}

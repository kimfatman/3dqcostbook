import { FormEvent, ReactNode, useState } from "react";
import { ArrowRight, Check, LockKeyhole, Mail, Phone, ShieldCheck, Store } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getCloudbaseAuth } from "@/lib/cloudbase-auth";

type Mode = "login" | "register" | "recover";
type VerificationMethod = "password" | "email" | "sms";
type OtpChallenge = { verifyOtp: (params: { token: string }) => Promise<any> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function otpErrorMessage(error: unknown, fallback: string) {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  if (/rate|频率|too many/i.test(message)) return "获取过于频繁，请 60 秒后再试";
  if (/captcha|人机|安全验证/i.test(message)) return "请先完成安全验证后再获取验证码";
  if (/expired|过期/i.test(message)) return "验证码已过期，请重新获取";
  return fallback;
}

function normalizePhone(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  return /^\+861\d{10}$/.test(compact) ? compact : null;
}

export function SelfHostedAccessGate({ children }: { children: ReactNode }) {
  const setup = trpc.auth.setupStatus.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [industryId, setIndustryId] = useState<"canteen" | "retail" | "ecommerce" | "beauty" | "stall">("ecommerce");
  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<VerificationMethod>("password");
  const [verificationCode, setVerificationCode] = useState("");
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [bootstrapToken, setBootstrapToken] = useState("");
  const bootstrap = trpc.auth.bootstrap.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); await utils.auth.setupStatus.invalidate(); } });
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const register = trpc.auth.registerAndCreateWorkspace.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const loginWithCloudbase = trpc.auth.loginWithCloudbase.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const registerWithCloudbase = trpc.auth.registerWithCloudbase.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const resetPasswordWithCloudbase = trpc.auth.resetPasswordWithCloudbase.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });

  if (setup.isLoading || me.isLoading) return <div className="selfhost-loading"><ShieldCheck size={20} />正在连接安全账本…</div>;
  if (me.data) return <>{children}</>;

  const isBootstrap = Boolean(setup.data?.needsBootstrap);
  const isRegistering = !isBootstrap && mode === "register";
  const isRecovering = !isBootstrap && mode === "recover";
  const isOtp = !isBootstrap && method !== "password";
  const isPending = bootstrap.isPending || login.isPending || register.isPending || loginWithCloudbase.isPending || registerWithCloudbase.isPending || resetPasswordWithCloudbase.isPending;
  const title = isBootstrap ? "初始化管理员" : isRegistering ? "创建你的店铺" : isRecovering ? "重设登录密码" : "欢迎回到店铺";
  const intro = isBootstrap ? "使用仅在服务器环境中保存的初始化令牌，完成首个管理员工作区设置。" : isRegistering ? "先完成邮箱或手机号验证，再创建你的专属账本。" : isRecovering ? "验证已绑定的邮箱或手机号后，即可设置新的登录密码。" : "可使用密码、邮箱验证码或短信验证码安全登录。";
  const canUseOtp = isRegistering || isRecovering || isOtp;
  const identityLabel = method === "sms" ? "手机号" : "邮箱";
  const identityValue = method === "sms" ? phone : email;

  const resetVerificationState = () => {
    setOtpChallenge(null);
    setVerificationCode("");
    setCooldown(0);
    setError("");
  };

  const setScreenMode = (next: Mode) => {
    setMode(next);
    if (next !== "login" && method === "password") setMethod("email");
    resetVerificationState();
  };

  const setVerificationMethod = (next: VerificationMethod) => {
    setMethod(next);
    resetVerificationState();
  };

  const validateRegistrationFields = () => {
    if (!name.trim()) throw new Error("请输入您的姓名");
    if (!workspaceName.trim()) throw new Error("请输入店铺名称");
    if (!password) throw new Error("请设置登录密码");
    if (password.length < 8) throw new Error("密码至少需要 8 个字符");
  };

  const sendOtp = async () => {
    if (method === "email" && !emailPattern.test(email.trim())) throw new Error("请输入正确的邮箱地址");
    const normalizedPhone = method === "sms" ? normalizePhone(phone) : null;
    if (method === "sms" && !normalizedPhone) throw new Error("请输入中国大陆手机号，例如 138 0000 0000");
    if (isRegistering) validateRegistrationFields();
    const auth = getCloudbaseAuth();
    const response = await auth.signInWithOtp(method === "sms"
      ? { phone: normalizedPhone!, options: { shouldCreateUser: true } }
      : { email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    if (response.error || !response.data.verifyOtp) throw new Error(otpErrorMessage(response.error, "验证码发送失败，请稍后再试"));
    setOtpChallenge({ verifyOtp: response.data.verifyOtp });
    setCooldown(60);
    const timer = window.setInterval(() => setCooldown(current => {
      if (current <= 1) {
        window.clearInterval(timer);
        return 0;
      }
      return current - 1;
    }), 1000);
  };

  const completeOtp = async () => {
    if (!otpChallenge) return sendOtp();
    if (!/^\d{6}$/.test(verificationCode)) throw new Error("请输入 6 位验证码");
    if (isRegistering) validateRegistrationFields();
    if (isRecovering) {
      if (!password) throw new Error("请设置新的登录密码");
      if (password.length < 8) throw new Error("密码至少需要 8 个字符");
    }
    const verified = await otpChallenge.verifyOtp({ token: verificationCode });
    const accessToken = verified.data?.session?.access_token;
    if (verified.error || !accessToken) throw new Error(otpErrorMessage(verified.error, "验证码错误或已过期，请重新获取"));
    if (isRegistering) await registerWithCloudbase.mutateAsync({ accessToken, name: name.trim(), password, workspaceName: workspaceName.trim(), industryId });
    else if (isRecovering) await resetPasswordWithCloudbase.mutateAsync({ accessToken, password });
    else await loginWithCloudbase.mutateAsync({ accessToken });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (isBootstrap) {
        if (!bootstrapToken.trim()) throw new Error("请输入初始化令牌");
        if (!name.trim()) throw new Error("请输入您的姓名");
        if (!workspaceName.trim()) throw new Error("请输入店铺名称");
        if (!emailPattern.test(email.trim())) throw new Error("请输入正确的邮箱地址");
        if (!password) throw new Error("请输入密码");
        if (password.length < 8) throw new Error("密码至少需要 8 个字符");
        await bootstrap.mutateAsync({ token: bootstrapToken, email, password, name, workspaceName });
      } else if (canUseOtp) await completeOtp();
      else {
        if (!emailPattern.test(email.trim())) throw new Error("请输入正确的邮箱地址");
        if (!password) throw new Error("请输入密码");
        await login.mutateAsync({ email, password });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法完成验证，请检查输入后重试");
    }
  };

  const primaryLabel = isPending ? "正在处理…" : isBootstrap ? "创建管理员并进入" : !canUseOtp ? "登录并继续经营" : !otpChallenge ? `获取${method === "sms" ? "短信" : "邮箱"}验证码` : isRecovering ? "验证并设置新密码" : isRegistering ? "验证并创建店铺" : "验证并登录";

  return <main className="selfhost-access">
    <section className="selfhost-hero" aria-hidden="true"><div className="selfhost-hero-brand"><span className="selfhost-hero-mark"><Store size={19} /></span><b>算得清</b><em>商家经营账本</em></div><div className="selfhost-hero-copy"><span>今日经营，心中有数</span><strong>每一笔成本<br />都算得清楚</strong></div><div className="selfhost-hero-chips"><span><Check size={12} />专属工作区</span><span><Check size={12} />私有数据</span></div><i className="selfhost-orbit one" /><i className="selfhost-orbit two" /></section>
    <section className="selfhost-access-card">
      <div className="selfhost-card-head"><div className="selfhost-brand"><div className="selfhost-brand-mark"><ShieldCheck size={20} /></div><div><p>算得清</p><small>商家成本管家</small></div></div><span className="selfhost-security"><LockKeyhole size={13} />安全登录</span></div>
      <div className="selfhost-title"><h1>{title}</h1><p>{intro}</p></div>
      {!isBootstrap && <div className="selfhost-methods" aria-label="登录验证方式">
        {!isRegistering && !isRecovering && <button type="button" className={method === "password" ? "is-active" : ""} onClick={() => setVerificationMethod("password")}>密码登录</button>}
        <button type="button" className={method === "email" ? "is-active" : ""} onClick={() => setVerificationMethod("email")}><Mail size={14} />邮箱验证码</button>
        <button type="button" className={method === "sms" ? "is-active" : ""} onClick={() => setVerificationMethod("sms")}><Phone size={14} />短信验证码</button>
      </div>}
      <form className="selfhost-access-form" onSubmit={submit} noValidate>
        {isBootstrap && <><Field label="初始化令牌" value={bootstrapToken} onChange={setBootstrapToken} type="password" autoComplete="one-time-code" placeholder="部署时生成的令牌" /><Field label="管理员姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" /><Field label="工作区名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：我的商店" /></>}
        {isRegistering && <><Field label="你的姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" /><Field label="店铺名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：小满商店" /><label className="selfhost-field"><span>经营行业</span><select value={industryId} onChange={event => setIndustryId(event.target.value as typeof industryId)}><option value="canteen">餐饮</option><option value="retail">零售</option><option value="ecommerce">电商</option><option value="beauty">美业服务</option><option value="stall">小商贩</option></select></label></>}
        {method !== "sms" && <Field label="邮箱" value={email} onChange={setEmail} type="email" autoComplete="email" placeholder="name@example.com" icon={<Mail size={17} />} />}
        {method === "sms" && <Field label="手机号" value={phone} onChange={setPhone} type="tel" autoComplete="tel" inputMode="tel" placeholder="138 0000 0000" icon={<Phone size={17} />} />}
        {(isBootstrap || isRegistering || isRecovering || method === "password") && <Field label={isRecovering ? "新密码" : "密码"} value={password} onChange={setPassword} type="password" autoComplete={isBootstrap || isRegistering || isRecovering ? "new-password" : "current-password"} placeholder={isBootstrap || isRegistering || isRecovering ? "至少 8 个字符" : "请输入密码"} minLength={isBootstrap || isRegistering || isRecovering ? 8 : undefined} icon={<LockKeyhole size={17} />} />}
        {(isBootstrap || isRegistering || isRecovering) && <p className="selfhost-field-hint">至少 8 位；建议使用长密码短语，并避免常见弱口令。</p>}
        {canUseOtp && otpChallenge && <><Field label="6 位验证码" value={verificationCode} onChange={value => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="请输入验证码" /><p className="selfhost-field-hint">验证码已发送至{identityLabel === "邮箱" ? email.trim() : normalizePhone(phone)}，10 分钟内有效。</p></>}
        {error && <p role="alert" className="selfhost-access-error">{error}</p>}
        <button type="submit" disabled={isPending || (canUseOtp && !otpChallenge && cooldown > 0)} className="selfhost-access-submit"><span>{canUseOtp && !otpChallenge && cooldown > 0 ? `${cooldown} 秒后可重发` : primaryLabel}</span><ArrowRight size={18} /></button>
        {canUseOtp && otpChallenge && <button type="button" className="selfhost-access-switch" disabled={cooldown > 0 || isPending} onClick={() => { setOtpChallenge(null); setVerificationCode(""); }}>{cooldown > 0 ? `${cooldown} 秒后可重新获取` : "重新获取验证码"}</button>}
        {!isBootstrap && <div className="selfhost-access-links">{!isRegistering && <button type="button" className="selfhost-access-switch" onClick={() => setScreenMode("register")}>还没有账号？创建你的店铺</button>}{!isRecovering && method === "password" && <button type="button" className="selfhost-access-switch" onClick={() => setScreenMode("recover")}>忘记密码？使用验证码重设</button>}{(isRegistering || isRecovering) && <button type="button" className="selfhost-access-switch" onClick={() => setScreenMode("login")}>已有账号？返回登录</button>}</div>}
      </form>
      {!isBootstrap && <p className="selfhost-card-foot">验证码由 CloudBase 安全服务发送；登录即表示你同意仅在授权设备上使用此工作区。</p>}
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", autoComplete, placeholder, minLength, icon, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; placeholder: string; minLength?: number; icon?: ReactNode; inputMode?: "numeric" | "tel" }) {
  return <label className="selfhost-field"><span>{label}</span><div className="selfhost-input-wrap">{icon}<input value={value} onChange={event => onChange(event.target.value)} type={type} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} inputMode={inputMode} required /></div></label>;
}

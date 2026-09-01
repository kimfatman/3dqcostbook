import { FormEvent, ReactNode, useState } from "react";
import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { brandAssets } from "@/lib/brand-assets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "login" | "register" | "recover";
type VerificationMethod = "password" | "email" | "sms";
type OtpChallenge = { id: string };
type FieldErrors = Partial<Record<"email" | "phone" | "password" | "name" | "workspaceName" | "bootstrapToken", string>>;

/** 密码强度：长度≥8 / 大小写混合 / 数字 / 符号 四项纯前端计算；弱 1 段 / 中 2 段 / 强 3-4 段。 */
function passwordStrength(password: string) {
  if (!password) return { score: 0, segments: 0, label: "", tip: "", level: "" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const segments = Math.min(Math.max(score, 1), 4);
  if (score <= 1) return { score, segments, label: "弱", tip: "建议增加长度，并添加数字与符号", level: "weak" };
  if (score === 2) return { score, segments, label: "中", tip: "建议添加大小写字母与符号", level: "medium" };
  return { score, segments, label: "强", tip: "密码强度良好", level: "strong" };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  return /^\+861\d{10}$/.test(compact) ? compact : null;
}

/** 后端按错误码返回的具体提示；命中这些提示说明验证会话已失效，需要重新获取验证码。 */
const OTP_RESEND_HINTS = ["验证码已过期，请重新获取", "验证会话不存在，请重新获取验证码"];

export function SelfHostedAccessGate({ children }: { children: ReactNode }) {
  const setup = trpc.auth.setupStatus.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
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
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [consentDoc, setConsentDoc] = useState<"terms" | "privacy" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const bootstrap = trpc.auth.bootstrap.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); await utils.auth.setupStatus.invalidate(); } });
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const register = trpc.auth.registerAndCreateWorkspace.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const requestCloudbaseOtp = trpc.auth.requestCloudbaseOtp.useMutation();
  const loginWithCloudbaseOtp = trpc.auth.loginWithCloudbaseOtp.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const registerWithCloudbaseOtp = trpc.auth.registerWithCloudbaseOtp.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const resetPasswordWithCloudbaseOtp = trpc.auth.resetPasswordWithCloudbaseOtp.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });

  if (setup.isLoading || me.isLoading) return <div className="selfhost-loading"><ShieldCheck size={20} />正在连接安全账本…</div>;
  if (me.data) return <>{children}</>;

  const isBootstrap = Boolean(setup.data?.needsBootstrap);
  const isRegistering = !isBootstrap && mode === "register";
  const isRecovering = !isBootstrap && mode === "recover";
  const isOtp = !isBootstrap && method !== "password";
  const isPending = bootstrap.isPending || login.isPending || register.isPending || requestCloudbaseOtp.isPending || loginWithCloudbaseOtp.isPending || registerWithCloudbaseOtp.isPending || resetPasswordWithCloudbaseOtp.isPending;
  const title = isBootstrap ? "初始化管理员" : isRegistering ? "创建你的店铺" : isRecovering ? "重设登录密码" : "欢迎回到店铺";
  const intro = isBootstrap ? "使用仅在服务器环境中保存的初始化令牌，完成首个管理员工作区设置。" : isRegistering ? "先完成邮箱或手机号验证，再创建你的专属账本。" : isRecovering ? "验证已绑定的邮箱或手机号后，即可设置新的登录密码。" : "可使用密码或验证码安全登录，验证码支持邮箱与短信两种方式。";
  const canUseOtp = isRegistering || isRecovering || isOtp;
  const identityLabel = method === "sms" ? "手机号" : "邮箱";
  const identityValue = method === "sms" ? phone : email;

  const resetVerificationState = () => {
    setOtpChallenge(null);
    setVerificationCode("");
    setCooldown(0);
    setError("");
    setOtpError("");
    setFieldErrors({});
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

  const clearFieldError = (key: keyof FieldErrors) => setFieldErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));

  /** 提交/发送时统一收集字段级错误：与全局 role=alert 提示互补，用于输入框下方的定位与红框。 */
  const collectFieldErrors = (): FieldErrors => {
    const fe: FieldErrors = {};
    if (method !== "sms" && !emailPattern.test(email.trim())) fe.email = "请输入正确的邮箱地址";
    if (method === "sms" && !normalizePhone(phone)) fe.phone = "请输入中国大陆手机号，例如 138 0000 0000";
    if ((isBootstrap || isRegistering) && !name.trim()) fe.name = "请输入您的姓名";
    if ((isBootstrap || isRegistering) && !workspaceName.trim()) fe.workspaceName = "请输入店铺名称";
    if ((isBootstrap || isRegistering || isRecovering || method === "password") && !password) fe.password = isBootstrap || isRegistering || isRecovering ? "请设置登录密码" : "请输入密码";
    if ((isBootstrap || isRegistering || isRecovering) && password && password.length < 8) fe.password = "密码至少需要 8 个字符";
    if (isBootstrap && !bootstrapToken.trim()) fe.bootstrapToken = "请输入初始化令牌";
    return fe;
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
    const response = await requestCloudbaseOtp.mutateAsync({
      method: method === "sms" ? "sms" : "email",
      purpose: isRegistering ? "register" : isRecovering ? "recover" : "login",
      ...(method === "sms" ? { phoneNumber: normalizedPhone! } : { email: email.trim().toLowerCase() }),
    });
    setOtpChallenge({ id: response.challengeId });
    setCooldown(60);
    const timer = window.setInterval(() => setCooldown(current => {
      if (current <= 1) {
        window.clearInterval(timer);
        return 0;
      }
      return current - 1;
    }), 1000);
  };

  /** 重新获取验证码：保持当前 mode（不切换登录/注册）与全部表单状态，仅重置验证码会话并重新发送，启动 60s 倒计时。 */
  const resendOtp = async () => {
    setOtpError("");
    setFieldErrors({});
    setOtpChallenge(null);
    setVerificationCode("");
    try {
      await sendOtp();
    } catch (reason) {
      setOtpChallenge(null);
      setVerificationCode("");
      setError(reason instanceof Error ? reason.message : "无法获取验证码，请稍后再试");
    }
  };

  const completeOtp = async () => {
    if (!otpChallenge) return sendOtp();
    if (!/^\d{6}$/.test(verificationCode)) throw new Error("请输入 6 位验证码");
    if (isRegistering) validateRegistrationFields();
    if (isRecovering) {
      if (!password) throw new Error("请设置新的登录密码");
      if (password.length < 8) throw new Error("密码至少需要 8 个字符");
    }
    if (isRegistering) await registerWithCloudbaseOtp.mutateAsync({ challengeId: otpChallenge.id, verificationCode, name: name.trim(), password, workspaceName: workspaceName.trim(), industryId });
    else if (isRecovering) await resetPasswordWithCloudbaseOtp.mutateAsync({ challengeId: otpChallenge.id, verificationCode, password });
    else await loginWithCloudbaseOtp.mutateAsync({ challengeId: otpChallenge.id, verificationCode });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setOtpError("");
    setFieldErrors({});
    try {
      if ((isBootstrap || isRegistering) && !consentAgreed) throw new Error("请先阅读并同意服务协议与隐私政策");
      const fe = collectFieldErrors();
      if (Object.keys(fe).length > 0) setFieldErrors(fe);
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
      const message = reason instanceof Error ? reason.message : "无法完成验证，请检查输入后重试";
      // OTP 验证阶段（已成功获取验证码）的错误内联显示在验证码输入框下方；其余错误走表单底部全局提示。
      if (canUseOtp && otpChallenge) setOtpError(message);
      else setError(message);
    }
  };

  const primaryLabel = isPending ? "正在处理…" : isBootstrap ? "创建管理员并进入" : !canUseOtp ? "登录并继续经营" : !otpChallenge ? `获取${method === "sms" ? "短信" : "邮箱"}验证码` : isRecovering ? "验证并设置新密码" : isRegistering ? "验证并创建店铺" : "验证并登录";
  const sendingOtp = canUseOtp && !otpChallenge && requestCloudbaseOtp.isPending;
  const strength = passwordStrength(password);

  return <main className="selfhost-access">
    <section className="selfhost-hero" aria-hidden="true"><div className="selfhost-hero-brand"><span className="selfhost-hero-mark"><img src={brandAssets.logoMark.path} alt="算得清品牌印鉴" /></span><b>算得清</b><em>商家经营账本</em></div><div className="selfhost-hero-copy"><span>今日经营，心中有数</span><strong>每一笔成本<br />都算得清楚</strong></div><i className="selfhost-orbit one" /><i className="selfhost-orbit two" /></section>
    <section className="selfhost-access-card">
      <div className="selfhost-card-head"><div className="selfhost-brand"><div className="selfhost-brand-mark"><img src={brandAssets.logoMark.path} alt="算得清品牌印鉴" /></div><div><p>算得清</p><small>商家成本管家</small></div></div><span className="selfhost-security"><LockKeyhole size={13} />安全登录</span></div>
      <div className="selfhost-title"><h1>{title}</h1><p>{intro}</p></div>
      {!isBootstrap && <div className="selfhost-methods" aria-label="登录验证方式">
        {!isRegistering && !isRecovering && <button type="button" className={method === "password" ? "is-active" : ""} onClick={() => setVerificationMethod("password")}>密码登录</button>}
        <button type="button" className={method !== "password" ? "is-active" : ""} onClick={() => { if (method === "password") setVerificationMethod("email"); }}>验证码登录</button>
      </div>}
      {!isBootstrap && method !== "password" && <div className="selfhost-methods-sub" role="group" aria-label="验证码接收方式">
        <button type="button" className={method === "email" ? "is-active" : ""} onClick={() => setVerificationMethod("email")}><Mail size={14} />邮箱验证码</button>
        <button type="button" className={method === "sms" ? "is-active" : ""} onClick={() => setVerificationMethod("sms")}><Phone size={14} />短信验证码</button>
      </div>}
      <form className="selfhost-access-form" onSubmit={submit} noValidate>
        {isBootstrap && <><Field label="初始化令牌" value={bootstrapToken} onChange={setBootstrapToken} type="password" autoComplete="one-time-code" placeholder="部署时生成的令牌" error={fieldErrors.bootstrapToken} onClearError={() => clearFieldError("bootstrapToken")} /><Field label="管理员姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" error={fieldErrors.name} onClearError={() => clearFieldError("name")} /><Field label="工作区名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：我的商店" error={fieldErrors.workspaceName} onClearError={() => clearFieldError("workspaceName")} /></>}
        {isRegistering && <><Field label="你的姓名" value={name} onChange={setName} autoComplete="name" placeholder="例如：张三" error={fieldErrors.name} onClearError={() => clearFieldError("name")} /><Field label="店铺名称" value={workspaceName} onChange={setWorkspaceName} placeholder="例如：小满商店" error={fieldErrors.workspaceName} onClearError={() => clearFieldError("workspaceName")} /><label className="selfhost-field"><span>经营行业</span><Select value={industryId} onValueChange={value => setIndustryId(value as typeof industryId)}><SelectTrigger className="selfhost-select-trigger" aria-label="经营行业"><SelectValue placeholder="请选择经营行业" /></SelectTrigger><SelectContent><SelectItem value="canteen">餐饮</SelectItem><SelectItem value="retail">零售</SelectItem><SelectItem value="ecommerce">电商</SelectItem><SelectItem value="beauty">美业服务</SelectItem><SelectItem value="stall">小商贩</SelectItem></SelectContent></Select></label></>}
        {method !== "sms" && <Field label="邮箱" value={email} onChange={setEmail} type="email" autoComplete="email" placeholder="name@example.com" icon={<Mail size={16} />} error={fieldErrors.email} onClearError={() => clearFieldError("email")} />}
        {method === "sms" && <Field label="手机号" value={phone} onChange={setPhone} type="tel" autoComplete="tel" inputMode="tel" placeholder="138 0000 0000" icon={<Phone size={16} />} error={fieldErrors.phone} onClearError={() => clearFieldError("phone")} />}
        {(isBootstrap || isRegistering || isRecovering || method === "password") && <Field label={isRecovering ? "新密码" : "密码"} value={password} onChange={setPassword} type="password" autoComplete={isBootstrap || isRegistering || isRecovering ? "new-password" : "current-password"} placeholder={isBootstrap || isRegistering || isRecovering ? "至少 8 个字符" : "请输入密码"} minLength={isBootstrap || isRegistering || isRecovering ? 8 : undefined} icon={<LockKeyhole size={16} />} error={fieldErrors.password} onClearError={() => clearFieldError("password")} />}
        {(isBootstrap || isRegistering || isRecovering) && (password ? <div className="selfhost-strength" data-level={strength.level} aria-live="polite"><div className="selfhost-strength-track" aria-hidden="true">{[0, 1, 2, 3].map(index => <i key={index} className={index < strength.segments ? "is-on" : ""} />)}</div><p className={`selfhost-strength-text is-${strength.level}`}><CircleAlert size={12} />{strength.label} · {strength.tip}</p></div> : <p className="selfhost-field-hint">至少 8 位；建议使用长密码短语，并避免常见弱口令。</p>)}
        {canUseOtp && otpChallenge && <><Field label="6 位验证码" value={verificationCode} onChange={value => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="请输入验证码" /><p className="selfhost-field-hint">验证码已发送至{identityLabel === "邮箱" ? email.trim() : normalizePhone(phone)}，10 分钟内有效。</p>{otpError && <p role="alert" className="selfhost-otp-error">{otpError}</p>}</>}
        {(isBootstrap || isRegistering) && <label className="selfhost-consent"><input type="checkbox" checked={consentAgreed} onChange={event => setConsentAgreed(event.target.checked)} /><span>我已阅读并同意《<button type="button" onClick={event => { event.preventDefault(); setConsentDoc("terms"); }}>服务协议</button>》与《<button type="button" onClick={event => { event.preventDefault(); setConsentDoc("privacy"); }}>隐私政策</button>》</span></label>}
        {error && <p role="alert" className="selfhost-access-error">{error}</p>}
        <button type="submit" disabled={isPending || (canUseOtp && !otpChallenge && cooldown > 0)} className="selfhost-access-submit">{sendingOtp && <span className="sdq-spinner" aria-hidden="true" />}<span>{canUseOtp && !otpChallenge && cooldown > 0 ? `${cooldown} 秒后可重发` : sendingOtp ? "发送中…" : primaryLabel}</span>{!sendingOtp && <ArrowRight size={18} />}</button>
        {canUseOtp && otpChallenge && <button type="button" className="selfhost-access-switch" disabled={cooldown > 0 || isPending} onClick={resendOtp}>{cooldown > 0 ? `${cooldown} 秒后可重新获取` : "重新获取验证码"}</button>}
        {!isBootstrap && <div className="selfhost-access-links">{!isRegistering && <button type="button" className="selfhost-access-switch" onClick={() => setScreenMode("register")}>还没有账号？创建你的店铺</button>}{!isRegistering && !isRecovering && <button type="button" className="selfhost-access-switch" onClick={() => setScreenMode("recover")}>忘记密码？使用验证码重设</button>}{(isRegistering || isRecovering) && <button type="button" className="selfhost-access-switch" onClick={() => setScreenMode("login")}>已有账号？返回登录</button>}</div>}
      </form>
      {!isBootstrap && <p className="selfhost-card-foot">验证码由 CloudBase 安全服务发送；登录即表示你同意仅在授权设备上使用此工作区。</p>}
      {consentDoc && <div className="selfhost-consent-dialog" role="alertdialog" aria-modal="true" aria-labelledby="selfhost-consent-title" aria-describedby="selfhost-consent-copy"><div className="selfhost-consent-scrim" aria-hidden="true" onClick={() => setConsentDoc(null)} /><div className="selfhost-consent-card"><h2 id="selfhost-consent-title">{consentDoc === "terms" ? "服务协议摘要" : "隐私政策摘要"}</h2><p id="selfhost-consent-copy">{consentDoc === "terms" ? "《服务协议》正式文本将由运营团队提供。当前为占位摘要：本服务为商家成本管理工具，您需确保提交的经营数据真实合法，并对账号下的操作负责。正式协议上线前，本摘要不构成具有约束力的条款。" : "《隐私政策》正式文本将由运营团队提供。当前为占位摘要：我们仅收集提供本服务所必需的信息（账号、邮箱、手机号与经营数据），数据存储于您部署的服务器环境，未经授权不会向第三方披露。正式政策上线前，本摘要不构成具有约束力的条款。"}</p><button type="button" className="selfhost-consent-close" onClick={() => setConsentDoc(null)}>知道了</button></div></div>}
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", autoComplete, placeholder, minLength, icon, inputMode, error, onClearError }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; placeholder: string; minLength?: number; icon?: ReactNode; inputMode?: "numeric" | "tel"; error?: string; onClearError?: () => void }) {
  const [visible, setVisible] = useState(false);
  const isSecret = type === "password" || type === "new-password";
  const handleChange = (next: string) => { onChange(next); onClearError?.(); };
  return <div className={`sdq-field selfhost-field${error ? " sdq-field-error" : ""}`}><label><span>{label}<em className="sdq-required" aria-hidden="true" /></span><div className={`sdq-input-wrap${error ? " sdq-field-error" : ""}`}>{icon}<input className="sdq-input" value={value} onChange={event => handleChange(event.target.value)} type={isSecret && visible ? "text" : type} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} inputMode={inputMode} required aria-invalid={error ? true : undefined} />{isSecret && <button type="button" className="selfhost-field-toggle" aria-label={visible ? "隐藏密码" : "显示密码"} onClick={() => setVisible(current => !current)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>}</div></label>{error && <span className="sdq-field-error-message"><CircleAlert size={12} />{error}</span>}</div>;
}

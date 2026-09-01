// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelfHostedAccessGate } from "./SelfHostedAccessGate";

const trpcMocks = vi.hoisted(() => ({
  setup: { needsBootstrap: false },
  bootstrap: { isPending: false, mutateAsync: vi.fn() },
  login: { isPending: false, mutateAsync: vi.fn() },
  registerAndCreateWorkspace: { isPending: false, mutateAsync: vi.fn() },
  requestCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
  loginWithCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
  registerWithCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
  resetPasswordWithCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      setupStatus: { useQuery: () => ({ data: { needsBootstrap: trpcMocks.setup.needsBootstrap }, isLoading: false }) },
      me: { useQuery: () => ({ data: null, isLoading: false }) },
      bootstrap: { useMutation: () => trpcMocks.bootstrap },
      login: { useMutation: () => trpcMocks.login },
      registerAndCreateWorkspace: { useMutation: () => trpcMocks.registerAndCreateWorkspace },
      requestCloudbaseOtp: { useMutation: () => trpcMocks.requestCloudbaseOtp },
      loginWithCloudbaseOtp: { useMutation: () => trpcMocks.loginWithCloudbaseOtp },
      registerWithCloudbaseOtp: { useMutation: () => trpcMocks.registerWithCloudbaseOtp },
      resetPasswordWithCloudbaseOtp: { useMutation: () => trpcMocks.resetPasswordWithCloudbaseOtp },
    },
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() }, setupStatus: { invalidate: vi.fn() } } }),
  },
}));

const indexCss = readFileSync(resolve(__dirname, "../index.css"), "utf8");

describe("SelfHostedAccessGate 批次13 登录/注册页打磨回归", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trpcMocks.setup.needsBootstrap = false;
    trpcMocks.bootstrap.mutateAsync.mockResolvedValue({});
    trpcMocks.login.mutateAsync.mockResolvedValue({});
    trpcMocks.registerAndCreateWorkspace.mutateAsync.mockResolvedValue({});
    trpcMocks.requestCloudbaseOtp.mutateAsync.mockResolvedValue({ challengeId: "challenge-b13", expiresIn: 600 });
    trpcMocks.loginWithCloudbaseOtp.mutateAsync.mockResolvedValue({ user: { id: "user-1" } });
    trpcMocks.registerWithCloudbaseOtp.mutateAsync.mockResolvedValue({ workspaceId: "workspace-1" });
    trpcMocks.resetPasswordWithCloudbaseOtp.mutateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("CSS 契约：hero 品牌印鉴 64×64/圆角16、输入接入 sdq 体系、入场动画与 reduced-motion 降级", () => {
    expect(indexCss).toContain(".selfhost-hero-mark { display: grid; width: 64px; height: 64px;");
    expect(indexCss).toContain("border-radius: 16px;");
    expect(indexCss).toContain(".selfhost-field .sdq-input { font-size: 16px; }");
    expect(indexCss).toContain(".selfhost-field .sdq-field-error-message { display: inline-flex; gap: 4px; align-items: center; }");
    expect(indexCss).toContain(".selfhost-field input:-webkit-autofill");
    expect(indexCss).toContain(".selfhost-strength-track i.is-on");
    expect(indexCss).toContain(".selfhost-strength-text.is-strong { color: var(--sdq-profit); }");
    expect(indexCss).toContain("@keyframes sdq-rise-in");
    expect(indexCss).toContain(".selfhost-access-card { animation: sdq-rise-in 400ms cubic-bezier(.23, 1, .32, 1) 100ms both; }");
    expect(indexCss).toContain("@media (prefers-reduced-motion: reduce) { .selfhost-hero, .selfhost-access-card { animation: none; } }");
    // P0-5 修复：错误背景色不再使用非法的 var()4f3 拼接
    expect(indexCss).not.toContain("var(--sdq-bg-surface)4f3");
    // 经营行业下拉与输入框等高对齐
    expect(indexCss).toContain(".selfhost-field .selfhost-select-trigger { width: 100%; min-height: var(--sdq-height-control);");
  });

  it("Hero 使用官方品牌印鉴（brandAssets.logoMark），标语收敛无卖点胶囊", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    const heroMark = document.querySelector(".selfhost-hero-mark");
    expect(heroMark).toBeTruthy();
    const img = heroMark!.querySelector("img");
    expect(img?.getAttribute("src")).toContain("SDQ_Logo_Mark.png");
    expect(img?.getAttribute("alt")).toBe("算得清品牌印鉴");
    expect(document.querySelector(".selfhost-hero-chips")).toBeNull();
  });

  it("输入框接入批次12 sdq 体系：sdq-input/sdq-input-wrap/前缀图标/必填星标/眼睛切换", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    const email = screen.getByLabelText("邮箱") as HTMLInputElement;
    expect(email.className).toContain("sdq-input");
    const wrap = email.closest(".sdq-input-wrap");
    expect(wrap).toBeTruthy();
    const field = email.closest(".sdq-field");
    expect(field).toBeTruthy();
    // 前缀图标（16px 由 .sdq-input-wrap > svg 控制）
    expect(wrap!.querySelector("svg")).toBeTruthy();
    // 必填红星（.sdq-required::after 渲染，不进入无障碍名称）
    expect(field!.querySelector(".sdq-required")).toBeTruthy();
    // 密码眼睛切换（44px 触控区由 CSS 保证）
    expect(screen.getByRole("button", { name: "显示密码" })).toBeTruthy();
    expect(screen.getByLabelText("密码")).toBeTruthy();
  });

  it("字段级错误：提交非法邮箱后输入框 aria-invalid + 下方 12px risk 提示，重新输入即消失", async () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    const email = screen.getByLabelText("邮箱") as HTMLInputElement;
    const password = screen.getByLabelText("密码") as HTMLInputElement;
    fireEvent.change(password, { target: { value: "secret123" } });
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "登录并继续经营" }));

    await waitFor(() => expect(email.getAttribute("aria-invalid")).toBe("true"));
    const messages = screen.getAllByText("请输入正确的邮箱地址");
    const fieldMessage = messages.find(node => node.className.includes("sdq-field-error-message"));
    expect(fieldMessage).toBeTruthy();
    // 左侧 12px 警告图标
    expect(fieldMessage!.querySelector("svg")).toBeTruthy();
    // 既有全局 role=alert 通知契约不破
    expect(screen.getByRole("alert")).toBeTruthy();

    // 重新输入后字段级错误消失（全局 alert 保留至下次提交）
    fireEvent.change(email, { target: { value: "owner@example.com" } });
    await waitFor(() => expect(email.getAttribute("aria-invalid")).toBeNull());
    expect(document.querySelectorAll(".sdq-field-error-message").length).toBe(0);
  });

  it("密码强度指示器：注册页弱/中/强三档实时更新（长度+字符种类，纯前端）", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));
    const password = screen.getByLabelText("密码") as HTMLInputElement;

    // 空密码：显示提示文案，无强度条
    expect(document.querySelector(".selfhost-strength")).toBeNull();
    expect(screen.getByText(/至少 8 位/)).toBeTruthy();

    // 弱：仅长度不达标，1 段 risk
    fireEvent.change(password, { target: { value: "abc" } });
    let strength = document.querySelector(".selfhost-strength");
    expect(strength?.getAttribute("data-level")).toBe("weak");
    expect(strength!.querySelectorAll("i.is-on").length).toBe(1);
    expect(screen.getByText(/弱/)).toBeTruthy();

    // 中：长度+数字，2 段 cost(warning)
    fireEvent.change(password, { target: { value: "abcdefg1" } });
    strength = document.querySelector(".selfhost-strength");
    expect(strength?.getAttribute("data-level")).toBe("medium");
    expect(strength!.querySelectorAll("i.is-on").length).toBe(2);

    // 强：长度+大小写+数字+符号，4 段 success
    fireEvent.change(password, { target: { value: "Abcdef12!" } });
    strength = document.querySelector(".selfhost-strength");
    expect(strength?.getAttribute("data-level")).toBe("strong");
    expect(strength!.querySelectorAll("i.is-on").length).toBe(4);
    expect(screen.getByText(/强/)).toBeTruthy();
  });

  it("登录页（密码模式）不显示密码强度指示器", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    expect(screen.getByLabelText("密码")).toBeTruthy();
    expect(document.querySelector(".selfhost-strength")).toBeNull();
  });

  it("验证码按钮三态：发送后倒计时 disabled → 倒计时结束恢复可重新获取", async () => {
    vi.useFakeTimers();
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    await act(async () => { await Promise.resolve(); });

    // 已发送：验证码输入框出现，重新获取按钮进入 60s 倒计时 disabled
    expect(screen.getByLabelText("6 位验证码")).toBeTruthy();
    const resend = screen.getByRole("button", { name: /秒后可重新获取/ }) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);

    // 倒计时结束：恢复可点击
    act(() => { vi.advanceTimersByTime(60_000); });
    const again = screen.getByRole("button", { name: "重新获取验证码" }) as HTMLButtonElement;
    expect(again.disabled).toBe(false);
  });

  it("验证码发送失败：全局提示 + 发送按钮恢复可重试（不出现验证码输入框）", async () => {
    trpcMocks.requestCloudbaseOtp.mutateAsync.mockRejectedValue(new Error("获取过于频繁，请 60 秒后再试"));
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));

    expect((await screen.findByRole("alert")).textContent).toContain("获取过于频繁，请 60 秒后再试");
    expect(screen.queryByLabelText("6 位验证码")).toBeNull();
    expect(screen.getByRole("button", { name: "获取邮箱验证码" })).toBeTruthy();
  });
});

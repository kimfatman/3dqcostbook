// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("SelfHostedAccessGate CloudBase 服务端验证码入口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trpcMocks.setup.needsBootstrap = false;
    trpcMocks.bootstrap.mutateAsync.mockResolvedValue({});
    trpcMocks.login.mutateAsync.mockResolvedValue({});
    trpcMocks.registerAndCreateWorkspace.mutateAsync.mockResolvedValue({});
    trpcMocks.requestCloudbaseOtp.mutateAsync.mockResolvedValue({ challengeId: "6d9f7029-39e6-4f8b-8eb2-4ebcd992afe5", expiresIn: 600 });
    trpcMocks.loginWithCloudbaseOtp.mutateAsync.mockResolvedValue({ user: { id: "user-1" } });
    trpcMocks.registerWithCloudbaseOtp.mutateAsync.mockResolvedValue({ workspaceId: "workspace-1" });
    trpcMocks.resetPasswordWithCloudbaseOtp.mutateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("通过本站代理请求邮箱验证码，发送成功后展示六位输入框并以 challenge 完成登录", async () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "Owner@Example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));

    await waitFor(() => expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ method: "email", purpose: "login", email: "owner@example.com" }));
    expect(await screen.findByLabelText("6 位验证码")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("6 位验证码"), { target: { value: "12x34567" } });
    fireEvent.click(screen.getByRole("button", { name: "验证并登录" }));

    await waitFor(() => expect(trpcMocks.loginWithCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ challengeId: "6d9f7029-39e6-4f8b-8eb2-4ebcd992afe5", verificationCode: "123456" }));
  });

  it("将中国大陆手机号规范为 +86 格式后请求短信验证码", async () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    fireEvent.click(screen.getByRole("button", { name: "短信验证码" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "138 0000 0000" } });
    fireEvent.click(screen.getByRole("button", { name: "获取短信验证码" }));

    await waitFor(() => expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ method: "sms", purpose: "login", phoneNumber: "+8613800000000" }));
    expect(await screen.findByLabelText("6 位验证码")).toBeTruthy();
  });

  it("展示服务端提供的中文限流提示，并且不显示未经成功创建的验证码输入框", async () => {
    trpcMocks.requestCloudbaseOtp.mutateAsync.mockRejectedValue(new Error("获取过于频繁，请 60 秒后再试"));
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));

    expect((await screen.findByRole("alert")).textContent).toContain("获取过于频繁，请 60 秒后再试");
    expect(screen.queryByLabelText("6 位验证码")).toBeNull();
  });

  it("登录方式合并为「密码登录 / 验证码登录」两维度，验证码模式下出现邮箱/短信子切换", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    expect(screen.getByRole("button", { name: "密码登录" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "验证码登录" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "邮箱验证码" })).toBeNull();
    expect(screen.queryByRole("button", { name: "短信验证码" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    expect(screen.getByRole("button", { name: "邮箱验证码" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "短信验证码" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "验证码接收方式" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "密码登录" }));
    expect(screen.queryByRole("button", { name: "邮箱验证码" })).toBeNull();
    expect(screen.queryByRole("button", { name: "短信验证码" })).toBeNull();
  });

  it("密码字段提供显示/隐藏切换，且不触发表单提交", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    const input = screen.getByLabelText("密码") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(screen.getByRole("button", { name: "显示密码" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "显示密码" }));
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "隐藏密码" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(input.type).toBe("password");
  });

  it("注册表单未勾选服务协议时提交被拦截并提示，勾选后可通过", async () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));
    fireEvent.change(screen.getByLabelText("你的姓名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByLabelText("店铺名称"), { target: { value: "小满商店" } });
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret-pass-123" } });

    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    expect((await screen.findByRole("alert")).textContent).toContain("请先阅读并同意服务协议与隐私政策");
    expect(trpcMocks.requestCloudbaseOtp.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    await waitFor(() => expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ method: "email", purpose: "register", email: "owner@example.com" }));
  });

  it("初始化管理员表单同样要求同意服务协议，勾选后可通过", async () => {
    trpcMocks.setup.needsBootstrap = true;
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    expect(screen.getByRole("heading", { name: "初始化管理员" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "创建管理员并进入" }));
    expect((await screen.findByRole("alert")).textContent).toContain("请先阅读并同意服务协议与隐私政策");
    expect(trpcMocks.bootstrap.mutateAsync).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("初始化令牌"), { target: { value: "boot-token-123" } });
    fireEvent.change(screen.getByLabelText("管理员姓名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByLabelText("工作区名称"), { target: { value: "小满商店" } });
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret-pass-123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "创建管理员并进入" }));

    await waitFor(() => expect(trpcMocks.bootstrap.mutateAsync).toHaveBeenCalledWith({ token: "boot-token-123", email: "owner@example.com", password: "secret-pass-123", name: "张三", workspaceName: "小满商店" }));
  });

  it("点击《服务协议》弹出占位摘要对话框并可关闭", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));
    fireEvent.click(screen.getByRole("button", { name: "服务协议" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "服务协议摘要" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "知道了" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("验证码登录模式下找回密码入口可见，点击后进入重设流程并保持验证码方式", () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    expect(screen.getByRole("button", { name: "忘记密码？使用验证码重设" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "忘记密码？使用验证码重设" }));
    expect(screen.getByRole("heading", { name: "重设登录密码" })).toBeTruthy();
    expect(screen.getByLabelText("邮箱")).toBeTruthy();
    expect(screen.getByLabelText("新密码")).toBeTruthy();
  });

  it("找回密码 recover 流程回归：密码模式下进入自动切换为邮箱验证码并可完成重设", async () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "忘记密码？使用验证码重设" }));
    expect(screen.getByRole("heading", { name: "重设登录密码" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    await waitFor(() => expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ method: "email", purpose: "recover", email: "owner@example.com" }));
    expect(await screen.findByLabelText("6 位验证码")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("6 位验证码"), { target: { value: "654321" } });
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "new-secret-456" } });
    fireEvent.click(screen.getByRole("button", { name: "验证并设置新密码" }));

    await waitFor(() => expect(trpcMocks.resetPasswordWithCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ challengeId: "6d9f7029-39e6-4f8b-8eb2-4ebcd992afe5", verificationCode: "654321", password: "new-secret-456" }));
  });

  it("验证码错误时在内联区域显示具体提示，验证码输入框保留可重新输入", async () => {
    trpcMocks.registerWithCloudbaseOtp.mutateAsync.mockRejectedValue(new Error("验证码错误，请重新输入"));
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));
    fireEvent.change(screen.getByLabelText("你的姓名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByLabelText("店铺名称"), { target: { value: "小满商店" } });
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret-pass-123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    await screen.findByLabelText("6 位验证码");
    fireEvent.change(screen.getByLabelText("6 位验证码"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "验证并创建店铺" }));

    await waitFor(() => expect(screen.getByText("验证码错误，请重新输入")).toBeTruthy());
    const inline = screen.getByText("验证码错误，请重新输入");
    expect(inline.className).toContain("selfhost-otp-error");
    // 表单底部不出现重复的全局错误，验证码输入框保留
    expect(screen.getByLabelText("6 位验证码")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBe(inline);
  });

  it("验证码过期时展示过期提示并保留重新获取入口", async () => {
    trpcMocks.loginWithCloudbaseOtp.mutateAsync.mockRejectedValue(new Error("验证码已过期，请重新获取"));
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "验证码登录" }));
    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    await screen.findByLabelText("6 位验证码");
    fireEvent.change(screen.getByLabelText("6 位验证码"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "验证并登录" }));

    await waitFor(() => expect(screen.getByText("验证码已过期，请重新获取")).toBeTruthy());
    expect(screen.getByRole("button", { name: /重新获取/ })).toBeTruthy();
  });

  it("重新获取验证码保留注册表单状态、不切换模式，并以 register 重新发送", async () => {
    vi.useFakeTimers();
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));
    fireEvent.change(screen.getByLabelText("你的姓名"), { target: { value: "张三" } });
    fireEvent.change(screen.getByLabelText("店铺名称"), { target: { value: "小满商店" } });
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret-pass-123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByLabelText("6 位验证码")).toBeTruthy();
    expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledTimes(1);

    // 等待 60s 倒计时结束后点击重新获取
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByRole("button", { name: "重新获取验证码" }));
    await act(async () => { await Promise.resolve(); });

    // 模式仍为注册，全部表单状态保留
    expect(screen.getByRole("heading", { name: "创建你的店铺" })).toBeTruthy();
    expect((screen.getByLabelText("你的姓名") as HTMLInputElement).value).toBe("张三");
    expect((screen.getByLabelText("店铺名称") as HTMLInputElement).value).toBe("小满商店");
    expect((screen.getByLabelText("邮箱") as HTMLInputElement).value).toBe("owner@example.com");
    expect((screen.getByLabelText("密码") as HTMLInputElement).value).toBe("secret-pass-123");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    // 以 register 再次发送，旧验证码清空，60s 倒计时启动
    expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledTimes(2);
    expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenLastCalledWith({ method: "email", purpose: "register", email: "owner@example.com" });
    expect((screen.getByLabelText("6 位验证码") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: /秒后可重新获取/ })).toBeTruthy();
  });
  it("注册页经营行业替换为自定义下拉：展开显示全部行业并可选中", async () => {
    const user = userEvent.setup();
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));

    const trigger = screen.getByRole("combobox", { name: "经营行业" });
    expect(trigger).toBeTruthy();

    await user.click(trigger);
    expect(await screen.findByRole("option", { name: "餐饮" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "零售" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "电商" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "美业服务" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "小商贩" })).toBeTruthy();

    await user.click(screen.getByRole("option", { name: "餐饮" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "经营行业" }).textContent).toContain("餐饮"));
  });

  it("注册页行业下拉支持键盘打开并导航到选项", async () => {
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);
    fireEvent.click(screen.getByRole("button", { name: "还没有账号？创建你的店铺" }));

    const trigger = screen.getByRole("combobox", { name: "经营行业" }) as HTMLElement;
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(await screen.findByRole("option", { name: "餐饮" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "零售" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "小商贩" })).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelfHostedAccessGate } from "./SelfHostedAccessGate";
const trpcMocks = vi.hoisted(() => ({
  mutation: () => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) }),
  verifyOtp: vi.fn(),
  signInWithOtp: vi.fn(),
  loginWithCloudbase: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) },
  registerWithCloudbase: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) },
  resetPasswordWithCloudbase: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      setupStatus: { useQuery: () => ({ data: { needsBootstrap: false }, isLoading: false }) },
      me: { useQuery: () => ({ data: null, isLoading: false }) },
      bootstrap: { useMutation: trpcMocks.mutation },
      login: { useMutation: trpcMocks.mutation },
      registerAndCreateWorkspace: { useMutation: trpcMocks.mutation },
      loginWithCloudbase: { useMutation: () => trpcMocks.loginWithCloudbase },
      registerWithCloudbase: { useMutation: () => trpcMocks.registerWithCloudbase },
      resetPasswordWithCloudbase: { useMutation: () => trpcMocks.resetPasswordWithCloudbase },
    },
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() }, setupStatus: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("@/lib/cloudbase-auth", () => ({ getCloudbaseAuth: () => ({ signInWithOtp: trpcMocks.signInWithOtp }) }));

describe("SelfHostedAccessGate CloudBase 验证码入口", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("使用邮箱验证码登录，并只将 CloudBase access token 交给服务端桥接", async () => {
    trpcMocks.signInWithOtp.mockResolvedValue({ data: { verifyOtp: trpcMocks.verifyOtp }, error: null });
    trpcMocks.verifyOtp.mockResolvedValue({ data: { session: { access_token: "cloudbase-access-token" } }, error: null });
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "Owner@Example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));

    await waitFor(() => expect(trpcMocks.signInWithOtp).toHaveBeenCalledWith({ email: "owner@example.com", options: { shouldCreateUser: true } }));
    fireEvent.change(await screen.findByLabelText("6 位验证码"), { target: { value: "12x34567" } });
    fireEvent.click(screen.getByRole("button", { name: "验证并登录" }));

    await waitFor(() => expect(trpcMocks.verifyOtp).toHaveBeenCalledWith({ token: "123456" }));
    await waitFor(() => expect(trpcMocks.loginWithCloudbase.mutateAsync).toHaveBeenCalledWith({ accessToken: "cloudbase-access-token" }));
  });

  it("将中国大陆手机号规范为 +86 格式后请求短信验证码", async () => {
    trpcMocks.signInWithOtp.mockResolvedValue({ data: { verifyOtp: trpcMocks.verifyOtp }, error: null });
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "短信验证码" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "138 0000 0000" } });
    fireEvent.click(screen.getByRole("button", { name: "获取短信验证码" }));

    await waitFor(() => expect(trpcMocks.signInWithOtp).toHaveBeenCalledWith({ phone: "+8613800000000", options: { shouldCreateUser: true } }));
  });

  it("将 CloudBase 的原始英文限流错误转换为中文重试提示", async () => {
    trpcMocks.signInWithOtp.mockResolvedValue({ data: { verifyOtp: null }, error: { message: "rate limit exceeded" } });
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));

    expect((await screen.findByRole("alert")).textContent).toContain("获取过于频繁，请 60 秒后再试");
  });
});

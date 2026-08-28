// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelfHostedAccessGate } from "./SelfHostedAccessGate";

const trpcMocks = vi.hoisted(() => ({
  mutation: () => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) }),
  requestCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
  loginWithCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
  registerWithCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
  resetPasswordWithCloudbaseOtp: { isPending: false, mutateAsync: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      setupStatus: { useQuery: () => ({ data: { needsBootstrap: false }, isLoading: false }) },
      me: { useQuery: () => ({ data: null, isLoading: false }) },
      bootstrap: { useMutation: trpcMocks.mutation },
      login: { useMutation: trpcMocks.mutation },
      registerAndCreateWorkspace: { useMutation: trpcMocks.mutation },
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

    fireEvent.click(screen.getByRole("button", { name: "短信验证码" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "138 0000 0000" } });
    fireEvent.click(screen.getByRole("button", { name: "获取短信验证码" }));

    await waitFor(() => expect(trpcMocks.requestCloudbaseOtp.mutateAsync).toHaveBeenCalledWith({ method: "sms", purpose: "login", phoneNumber: "+8613800000000" }));
    expect(await screen.findByLabelText("6 位验证码")).toBeTruthy();
  });

  it("展示服务端提供的中文限流提示，并且不显示未经成功创建的验证码输入框", async () => {
    trpcMocks.requestCloudbaseOtp.mutateAsync.mockRejectedValue(new Error("获取过于频繁，请 60 秒后再试"));
    render(<SelfHostedAccessGate><div>私有内容</div></SelfHostedAccessGate>);

    fireEvent.click(screen.getByRole("button", { name: "邮箱验证码" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "获取邮箱验证码" }));

    expect((await screen.findByRole("alert")).textContent).toContain("获取过于频繁，请 60 秒后再试");
    expect(screen.queryByLabelText("6 位验证码")).toBeNull();
  });
});

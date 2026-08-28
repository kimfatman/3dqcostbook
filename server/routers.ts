import { z } from "zod";
import { getAppUserByCloudbaseSubject, getAppUserByEmail, getAppUserByPhoneNumber, getWorkspaceBook, hasAnyAppUsers, linkCloudbaseIdentity, listWorkspacesForUser, markSignedIn, createInitialAdmin, recentAuditEvents, registerAndCreateWorkspace, registerCloudbaseUserAndCreateWorkspace, saveWorkspaceBook, updateAppUserPassword, updateAppUserProfile, updateWorkspaceProfile } from "./db";
import { localSessionCookieOptions, LOCAL_SESSION_COOKIE, hashPassword, signSession, verifyPassword } from "./local-auth";
import { assertAuthAttemptAllowed, assertOtpSendAllowed, assertPasswordPolicy, clearAuthFailures, createAuthRateLimitKeys, recordAuthFailure, recordOtpSend } from "./auth-security";
import { completeCloudbaseOtpChallenge, requestCloudbaseOtpChallenge, type CloudbaseOtpMethod, type CloudbaseOtpPurpose, type CloudbaseVerifiedIdentity } from "./cloudbase-auth";
import { protectedProcedure, publicProcedure, router, adminProcedure } from "./_core/trpc";
import { getAdminHealth, getAdminOverview, getAdminVersion } from "./admin";
import { listAdminUsers, listAdminWorkspaces, setAdminUserStatus, setAdminWorkspaceStatus } from "./admin-data";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(8, "密码至少需要 8 个字符").max(128, "密码不能超过 128 个字符");
const state = z.record(z.string(), z.unknown());
const industryId = z.enum(["canteen", "retail", "ecommerce", "beauty", "stall"]);
const avatarPreset = z.enum(["classic", "retail", "ecommerce", "canteen", "beauty", "stall"]).nullable().optional();
const logoPreset = z.enum(["store", "retail", "ecommerce", "canteen", "beauty", "stall"]).nullable().optional();
const cloudbaseOtpMethod = z.enum(["email", "sms"]);
const cloudbaseOtpPurpose = z.enum(["login", "register", "recover"]);
const cloudbaseChallengeId = z.string().uuid();
const cloudbaseVerificationCode = z.string().regex(/^\d{6}$/, "请输入 6 位验证码");
const phoneNumber = z.string().regex(/^\+861\d{10}$/, "请输入中国大陆手机号，例如 138 0000 0000");
const adminPageInput = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  query: z.string().trim().max(80).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});
const adminStatusChangeInput = z.object({
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(2).max(240),
  confirm: z.literal(true, "必须完成二次确认后才能执行状态变更"),
  requestId: z.string().uuid().optional(),
});

async function getLinkedCloudbaseUser(identity: CloudbaseVerifiedIdentity) {
  return (await getAppUserByCloudbaseSubject(identity.subject))
    ?? (identity.email ? await getAppUserByEmail(identity.email) : undefined)
    ?? (identity.phoneNumber ? await getAppUserByPhoneNumber(identity.phoneNumber) : undefined);
}

/** 仅处理服务端已完成验证码验证的身份，不接受浏览器提交的 access token 或资料字段。 */
async function authenticateCloudbaseIdentity(ctx: { req: Parameters<typeof createAuthRateLimitKeys>[1] }, identity: CloudbaseVerifiedIdentity) {
  const pendingKeys = createAuthRateLimitKeys("cloudbase", ctx.req, "pending-cloudbase-identity");
  assertAuthAttemptAllowed(pendingKeys);
  try {
    const identityKeys = createAuthRateLimitKeys("cloudbase", ctx.req, identity.subject);
    assertAuthAttemptAllowed(identityKeys);
    clearAuthFailures(pendingKeys);
    return { identity, identityKeys };
  } catch (error) {
    recordAuthFailure(pendingKeys);
    throw error;
  }
}

export const appRouter = router({
  auth: router({
    setupStatus: publicProcedure.query(async () => ({ needsBootstrap: !(await hasAnyAppUsers()) })),
    bootstrap: publicProcedure.input(z.object({ token: z.string().min(24), email, name: z.string().trim().min(1).max(120), password, workspaceName: z.string().trim().min(1).max(120) })).mutation(async ({ input, ctx }) => {
      const rateLimitKeys = createAuthRateLimitKeys("bootstrap", ctx.req, input.email);
      assertAuthAttemptAllowed(rateLimitKeys);
      assertPasswordPolicy(input.password);
      const expected = process.env.BOOTSTRAP_ADMIN_TOKEN;
      if (!expected || input.token !== expected) {
        recordAuthFailure(rateLimitKeys);
        throw new Error("无法完成初始化，请检查输入后重试");
      }
      if (await hasAnyAppUsers()) throw new Error("管理员已经初始化");
      const result = await createInitialAdmin({ email: input.email, name: input.name, passwordHash: await hashPassword(input.password), workspaceName: input.workspaceName });
      clearAuthFailures(rateLimitKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(result.userId), localSessionCookieOptions());
      return { workspaceId: result.workspaceId };
    }),
    registerAndCreateWorkspace: publicProcedure.input(z.object({ email, name: z.string().trim().min(1).max(120), password, workspaceName: z.string().trim().min(1).max(120), industryId })).mutation(async ({ input, ctx }) => {
      const rateLimitKeys = createAuthRateLimitKeys("register", ctx.req, input.email);
      assertAuthAttemptAllowed(rateLimitKeys);
      assertPasswordPolicy(input.password);
      if (await getAppUserByEmail(input.email)) {
        recordAuthFailure(rateLimitKeys);
        throw new Error("无法创建账号，请检查输入后重试");
      }
      const result = await registerAndCreateWorkspace({ ...input, passwordHash: await hashPassword(input.password) });
      clearAuthFailures(rateLimitKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(result.userId), localSessionCookieOptions());
      return { workspaceId: result.workspaceId };
    }),
    login: publicProcedure.input(z.object({ email, password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
      const rateLimitKeys = createAuthRateLimitKeys("login", ctx.req, input.email);
      assertAuthAttemptAllowed(rateLimitKeys);
      const user = await getAppUserByEmail(input.email);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        recordAuthFailure(rateLimitKeys);
        throw new Error("邮箱或密码错误");
      }
      await markSignedIn(user.id);
      clearAuthFailures(rateLimitKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(user.id), localSessionCookieOptions());
      return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }),
    requestCloudbaseOtp: publicProcedure.input(z.object({
      method: cloudbaseOtpMethod,
      purpose: cloudbaseOtpPurpose,
      email: email.optional(),
      phoneNumber: phoneNumber.optional(),
    }).superRefine((value, context) => {
      if (value.method === "email" && !value.email) context.addIssue({ code: "custom", message: "请输入正确的邮箱地址", path: ["email"] });
      if (value.method === "sms" && !value.phoneNumber) context.addIssue({ code: "custom", message: "请输入中国大陆手机号，例如 138 0000 0000", path: ["phoneNumber"] });
    })).mutation(async ({ input, ctx }) => {
      const target = input.method === "email" ? input.email! : input.phoneNumber!;
      const rateLimitKeys = createAuthRateLimitKeys("cloudbase", ctx.req, `send:${input.purpose}:${target}`);
      assertAuthAttemptAllowed(rateLimitKeys);
      assertOtpSendAllowed(rateLimitKeys);
      try {
        const challenge = await requestCloudbaseOtpChallenge({ method: input.method as CloudbaseOtpMethod, purpose: input.purpose as CloudbaseOtpPurpose, target });
        recordOtpSend(rateLimitKeys);
        clearAuthFailures(rateLimitKeys);
        return challenge;
      } catch (error) {
        recordAuthFailure(rateLimitKeys);
        throw error;
      }
    }),
    loginWithCloudbaseOtp: publicProcedure.input(z.object({ challengeId: cloudbaseChallengeId, verificationCode: cloudbaseVerificationCode })).mutation(async ({ input, ctx }) => {
      const identity = await completeCloudbaseOtpChallenge({ ...input, purpose: "login" });
      const { identityKeys } = await authenticateCloudbaseIdentity(ctx, identity);
      const user = await getLinkedCloudbaseUser(identity);
      if (!user) {
        recordAuthFailure(identityKeys);
        throw new Error("验证已完成，请继续创建店铺");
      }
      const linked = user.cloudbaseSubject === identity.subject ? user : await linkCloudbaseIdentity(user.id, identity);
      if (!linked) {
        recordAuthFailure(identityKeys);
        throw new Error("无法完成验证码登录，请稍后再试");
      }
      await markSignedIn(linked.id);
      clearAuthFailures(identityKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(linked.id), localSessionCookieOptions());
      return { user: { id: linked.id, email: linked.email, phoneNumber: linked.phoneNumber, name: linked.name, role: linked.role } };
    }),
    registerWithCloudbaseOtp: publicProcedure.input(z.object({
      challengeId: cloudbaseChallengeId,
      verificationCode: cloudbaseVerificationCode,
      name: z.string().trim().min(1).max(120),
      password,
      workspaceName: z.string().trim().min(1).max(120),
      industryId,
    })).mutation(async ({ input, ctx }) => {
      assertPasswordPolicy(input.password);
      const identity = await completeCloudbaseOtpChallenge({ challengeId: input.challengeId, verificationCode: input.verificationCode, purpose: "register" });
      const { identityKeys } = await authenticateCloudbaseIdentity(ctx, identity);
      if (await getLinkedCloudbaseUser(identity)) {
        recordAuthFailure(identityKeys);
        throw new Error("无法创建账号，请检查输入后重试");
      }
      const result = await registerCloudbaseUserAndCreateWorkspace({ ...identity, ...input, passwordHash: await hashPassword(input.password) });
      clearAuthFailures(identityKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(result.userId), localSessionCookieOptions());
      return { workspaceId: result.workspaceId };
    }),
    resetPasswordWithCloudbaseOtp: publicProcedure.input(z.object({ challengeId: cloudbaseChallengeId, verificationCode: cloudbaseVerificationCode, password })).mutation(async ({ input, ctx }) => {
      assertPasswordPolicy(input.password);
      const identity = await completeCloudbaseOtpChallenge({ challengeId: input.challengeId, verificationCode: input.verificationCode, purpose: "recover" });
      const { identityKeys } = await authenticateCloudbaseIdentity(ctx, identity);
      const user = await getLinkedCloudbaseUser(identity);
      if (!user) {
        recordAuthFailure(identityKeys);
        throw new Error("无法完成密码重置，请检查验证方式后重试");
      }
      const linked = user.cloudbaseSubject === identity.subject ? user : await linkCloudbaseIdentity(user.id, identity);
      if (!linked) {
        recordAuthFailure(identityKeys);
        throw new Error("无法完成密码重置，请稍后再试");
      }
      await updateAppUserPassword(linked.id, await hashPassword(input.password));
      clearAuthFailures(identityKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(linked.id), localSessionCookieOptions());
      return { success: true as const };
    }),
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...localSessionCookieOptions(), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  admin: router({
    health: adminProcedure.query(() => getAdminHealth()),
    version: adminProcedure.query(() => getAdminVersion()),
    overview: adminProcedure.query(() => getAdminOverview()),
    users: router({
      list: adminProcedure.input(adminPageInput).query(({ input }) => listAdminUsers(input)),
      setStatus: adminProcedure.input(adminStatusChangeInput.extend({ userId: z.string().uuid() })).mutation(({ input, ctx }) => setAdminUserStatus({ ...input, targetUserId: input.userId, actorUserId: ctx.user.id })),
    }),
    workspaces: router({
      list: adminProcedure.input(adminPageInput).query(({ input }) => listAdminWorkspaces(input)),
      setStatus: adminProcedure.input(adminStatusChangeInput.extend({ workspaceId: z.string().uuid() })).mutation(({ input, ctx }) => setAdminWorkspaceStatus({ ...input, actorUserId: ctx.user.id })),
    }),
  }),
  profile: router({
    updateMe: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), avatarAssetId: z.string().uuid().nullable().optional(), avatarPreset })).mutation(({ input, ctx }) => updateAppUserProfile(ctx.user.id, input)),
  }),
  workspace: router({
    list: protectedProcedure.query(({ ctx }) => listWorkspacesForUser(ctx.user.id)),
    book: protectedProcedure.input(z.object({ workspaceId: z.string().uuid() })).query(({ input, ctx }) => getWorkspaceBook(input.workspaceId, ctx.user.id)),
    saveBook: protectedProcedure.input(z.object({ workspaceId: z.string().uuid(), expectedRevision: z.number().int().nonnegative(), schemaVersion: z.number().int().positive().max(100), state })).mutation(({ input, ctx }) => saveWorkspaceBook({ ...input, userId: ctx.user.id })),
    audit: protectedProcedure.input(z.object({ workspaceId: z.string().uuid() })).query(({ input, ctx }) => recentAuditEvents(input.workspaceId, ctx.user.id)),
    updateProfile: protectedProcedure.input(z.object({ workspaceId: z.string().uuid(), name: z.string().trim().min(1).max(120), industryId, contactName: z.string().trim().max(120), logoAssetId: z.string().uuid().nullable().optional(), logoPreset })).mutation(({ input, ctx }) => updateWorkspaceProfile({ ...input, userId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;

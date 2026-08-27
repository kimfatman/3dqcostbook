import { z } from "zod";
import { getAppUserByCloudbaseSubject, getAppUserByEmail, getAppUserByPhoneNumber, getWorkspaceBook, hasAnyAppUsers, linkCloudbaseIdentity, listWorkspacesForUser, markSignedIn, createInitialAdmin, recentAuditEvents, registerAndCreateWorkspace, registerCloudbaseUserAndCreateWorkspace, saveWorkspaceBook, updateAppUserPassword, updateAppUserProfile, updateWorkspaceProfile } from "./db";
import { localSessionCookieOptions, LOCAL_SESSION_COOKIE, hashPassword, signSession, verifyPassword } from "./local-auth";
import { assertAuthAttemptAllowed, assertPasswordPolicy, clearAuthFailures, createAuthRateLimitKeys, recordAuthFailure } from "./auth-security";
import { verifyCloudbaseAccessToken, type CloudbaseVerifiedIdentity } from "./cloudbase-auth";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(8, "密码至少需要 8 个字符").max(128, "密码不能超过 128 个字符");
const state = z.record(z.string(), z.unknown());
const industryId = z.enum(["canteen", "retail", "ecommerce", "beauty", "stall"]);
const avatarPreset = z.enum(["classic", "retail", "ecommerce", "canteen", "beauty", "stall"]).nullable().optional();
const logoPreset = z.enum(["store", "retail", "ecommerce", "canteen", "beauty", "stall"]).nullable().optional();
const cloudbaseAccessToken = z.string().trim().min(24).max(8192);

async function getLinkedCloudbaseUser(identity: CloudbaseVerifiedIdentity) {
  return (await getAppUserByCloudbaseSubject(identity.subject))
    ?? (identity.email ? await getAppUserByEmail(identity.email) : undefined)
    ?? (identity.phoneNumber ? await getAppUserByPhoneNumber(identity.phoneNumber) : undefined);
}

/** 先对来源限流、再回源验证 token，任何失败均不信任浏览器提供的身份字段。 */
async function authenticateCloudbase(ctx: { req: Parameters<typeof createAuthRateLimitKeys>[1] }, accessToken: string) {
  const pendingKeys = createAuthRateLimitKeys("cloudbase", ctx.req, "pending-cloudbase-identity");
  assertAuthAttemptAllowed(pendingKeys);
  try {
    const identity = await verifyCloudbaseAccessToken(accessToken);
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
    loginWithCloudbase: publicProcedure.input(z.object({ accessToken: cloudbaseAccessToken })).mutation(async ({ input, ctx }) => {
      const { identity, identityKeys } = await authenticateCloudbase(ctx, input.accessToken);
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
    registerWithCloudbase: publicProcedure.input(z.object({
      accessToken: cloudbaseAccessToken,
      name: z.string().trim().min(1).max(120),
      password,
      workspaceName: z.string().trim().min(1).max(120),
      industryId,
    })).mutation(async ({ input, ctx }) => {
      assertPasswordPolicy(input.password);
      const { identity, identityKeys } = await authenticateCloudbase(ctx, input.accessToken);
      if (await getLinkedCloudbaseUser(identity)) {
        recordAuthFailure(identityKeys);
        throw new Error("无法创建账号，请检查输入后重试");
      }
      const result = await registerCloudbaseUserAndCreateWorkspace({ ...identity, ...input, passwordHash: await hashPassword(input.password) });
      clearAuthFailures(identityKeys);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(result.userId), localSessionCookieOptions());
      return { workspaceId: result.workspaceId };
    }),
    resetPasswordWithCloudbase: publicProcedure.input(z.object({ accessToken: cloudbaseAccessToken, password })).mutation(async ({ input, ctx }) => {
      assertPasswordPolicy(input.password);
      const { identity, identityKeys } = await authenticateCloudbase(ctx, input.accessToken);
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

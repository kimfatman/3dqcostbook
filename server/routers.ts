import { z } from "zod";
import { getAppUserByEmail, getWorkspaceBook, hasAnyAppUsers, listWorkspacesForUser, markSignedIn, createInitialAdmin, recentAuditEvents, registerAndCreateWorkspace, saveWorkspaceBook, updateAppUserProfile, updateWorkspaceProfile } from "./db";
import { localSessionCookieOptions, LOCAL_SESSION_COOKIE, hashPassword, signSession, verifyPassword } from "./local-auth";
import { assertAuthAttemptAllowed, assertPasswordPolicy, clearAuthFailures, createAuthRateLimitKeys, recordAuthFailure } from "./auth-security";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(8, "密码至少需要 8 个字符").max(128, "密码不能超过 128 个字符");
const state = z.record(z.string(), z.unknown());
const industryId = z.enum(["canteen", "retail", "ecommerce", "beauty", "stall"]);
const avatarPreset = z.enum(["classic", "retail", "ecommerce", "canteen", "beauty", "stall"]).nullable().optional();
const logoPreset = z.enum(["store", "retail", "ecommerce", "canteen", "beauty", "stall"]).nullable().optional();

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

import { z } from "zod";
import { getAppUserByEmail, getWorkspaceBook, hasAnyAppUsers, listWorkspacesForUser, markSignedIn, createInitialAdmin, recentAuditEvents, saveWorkspaceBook } from "./db";
import { localSessionCookieOptions, LOCAL_SESSION_COOKIE, hashPassword, signSession, verifyPassword } from "./local-auth";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(12, "密码至少需要 12 个字符").max(128);
const state = z.record(z.string(), z.unknown());

export const appRouter = router({
  auth: router({
    setupStatus: publicProcedure.query(async () => ({ needsBootstrap: !(await hasAnyAppUsers()) })),
    bootstrap: publicProcedure.input(z.object({ token: z.string().min(24), email, name: z.string().trim().min(1).max(120), password, workspaceName: z.string().trim().min(1).max(120) })).mutation(async ({ input, ctx }) => {
      const expected = process.env.BOOTSTRAP_ADMIN_TOKEN;
      if (!expected || input.token !== expected) throw new Error("首次初始化令牌无效");
      if (await hasAnyAppUsers()) throw new Error("管理员已经初始化");
      const result = await createInitialAdmin({ email: input.email, name: input.name, passwordHash: await hashPassword(input.password), workspaceName: input.workspaceName });
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(result.userId), localSessionCookieOptions());
      return { workspaceId: result.workspaceId };
    }),
    login: publicProcedure.input(z.object({ email, password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
      const user = await getAppUserByEmail(input.email);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new Error("邮箱或密码错误");
      await markSignedIn(user.id);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, signSession(user.id), localSessionCookieOptions());
      return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }),
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...localSessionCookieOptions(), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    list: protectedProcedure.query(({ ctx }) => listWorkspacesForUser(ctx.user.id)),
    book: protectedProcedure.input(z.object({ workspaceId: z.string().uuid() })).query(({ input, ctx }) => getWorkspaceBook(input.workspaceId, ctx.user.id)),
    saveBook: protectedProcedure.input(z.object({ workspaceId: z.string().uuid(), expectedRevision: z.number().int().nonnegative(), schemaVersion: z.number().int().positive().max(100), state })).mutation(({ input, ctx }) => saveWorkspaceBook({ ...input, userId: ctx.user.id })),
    audit: protectedProcedure.input(z.object({ workspaceId: z.string().uuid() })).query(({ input, ctx }) => recentAuditEvents(input.workspaceId, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;

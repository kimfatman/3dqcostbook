import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import { getAppUserById, type LocalUser } from "../db";
import { LOCAL_SESSION_COOKIE, verifySession } from "../local-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: LocalUser | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const token = parse(opts.req.headers.cookie || "")[LOCAL_SESSION_COOKIE];
  const payload = verifySession(token);
  const user = payload ? await getAppUserById(payload.sub) : undefined;
  return { req: opts.req, res: opts.res, user: user || null };
}

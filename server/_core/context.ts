import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import { getAppUserById, type LocalUser } from "../db";
import { LOCAL_SESSION_COOKIE, verifySession } from "../local-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: LocalUser | null;
};

export async function getLocalUserFromRequest(req: Pick<CreateExpressContextOptions["req"], "headers">) {
  const token = parse(req.headers.cookie || "")[LOCAL_SESSION_COOKIE];
  const payload = verifySession(token);
  const user = payload ? await getAppUserById(payload.sub) : undefined;
  return user || null;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const user = await getLocalUserFromRequest(opts.req);
  return { req: opts.req, res: opts.res, user };
}

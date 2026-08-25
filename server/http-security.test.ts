import { describe, expect, it } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import { MEDIA_REQUEST_BODY_LIMIT, PUBLIC_REQUEST_BODY_LIMIT, registerPublicRequestBodyParsers } from "./http-security";

async function requestWithBody(contentType: string, body: string | Uint8Array, configure?: (app: express.Express) => void) {
  const app = express();
  registerPublicRequestBodyParsers(app);
  configure?.(app);
  app.post("/payload", (_req, res) => res.status(204).end());
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status ?? 500).end());
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port");
  try {
    return await fetch(`http://127.0.0.1:${address.port}/payload`, { method: "POST", headers: { "content-type": contentType }, body });
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("public request body boundary", () => {
  it("limits JSON and URL-encoded public payloads to 1MB", async () => {
    const oversizedJson = JSON.stringify({ payload: "x".repeat(1_050_000) });
    const oversizedForm = `payload=${"x".repeat(1_050_000)}`;
    await expect(requestWithBody("application/json", oversizedJson)).resolves.toMatchObject({ status: 413 });
    await expect(requestWithBody("application/x-www-form-urlencoded", oversizedForm)).resolves.toMatchObject({ status: 413 });
    expect(PUBLIC_REQUEST_BODY_LIMIT).toBe("1mb");
  });

  it("keeps a separately registered 5MB media route available for binary uploads", async () => {
    const response = await requestWithBody("image/jpeg", new Uint8Array(1_500_000), app => {
      app.post("/payload", express.raw({ type: () => true, limit: MEDIA_REQUEST_BODY_LIMIT }), (_req, res) => res.status(201).end());
    });
    expect(response.status).toBe(201);
    expect(MEDIA_REQUEST_BODY_LIMIT).toBe("5mb");
  });
});

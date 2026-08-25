import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const caddyfile = readFileSync(join(root, "deploy", "Caddyfile"), "utf8");
const dockerfile = readFileSync(join(root, "deploy", "Dockerfile"), "utf8");

describe("生产部署安全基线", () => {
  it("为应用与 API 站点启用同一组最小安全响应头", () => {
    expect(caddyfile).toContain("(security_headers)");
    expect(caddyfile).toMatch(/Strict-Transport-Security "max-age=31536000; includeSubDomains"/);
    expect(caddyfile).toContain('X-Content-Type-Options "nosniff"');
    expect(caddyfile).toContain('X-Frame-Options "DENY"');
    expect(caddyfile).toContain('Referrer-Policy "strict-origin-when-cross-origin"');
    expect(caddyfile).toContain("frame-ancestors 'none'");
    expect(caddyfile).toContain("object-src 'none'");
    expect(caddyfile.match(/import security_headers/g)).toHaveLength(2);
  });

  it("在构建完成后以受限专用用户运行应用与迁移命令", () => {
    expect(dockerfile).toContain("groupadd --system --gid 10001 costbook");
    expect(dockerfile).toContain("useradd --system --uid 10001 --gid costbook");
    expect(dockerfile).toContain("chown -R costbook:costbook /app");
    expect(dockerfile).toMatch(/USER costbook\s+CMD \["node", "dist\/index\.js"\]/s);
  });
});

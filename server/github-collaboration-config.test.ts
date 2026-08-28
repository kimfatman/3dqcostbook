import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("GitHub 三账号协作配置", () => {
  it("在 GitHub 识别路径中为 UI、后端与高风险目录提供安全回退的代码归属", async () => {
    const codeowners = await readFile(path.join(projectRoot, ".github", "CODEOWNERS"), "utf8");

    expect(codeowners).toContain("* @kimfatman");
    expect(codeowners).toContain("/client/** @kimfatman");
    expect(codeowners).toContain("/server/** @kimfatman");
    expect(codeowners).toContain("/drizzle/** @kimfatman");
    expect(codeowners).toContain("/deploy/** @kimfatman");
    expect(codeowners).toContain("/.github/** @kimfatman");
    expect(codeowners).toContain("它不能区分 Agent");
    expect(codeowners).not.toMatch(/^\s*\/[^#\n]*@</m);
  });

  it("提供统一的 PR 验证、数据安全与多 Agent 验收交接模板", async () => {
    const template = await readFile(path.join(projectRoot, ".github", "PULL_REQUEST_TEMPLATE.md"), "utf8");

    expect(template).toContain("pnpm check");
    expect(template).toContain("pnpm test");
    expect(template).toContain("pnpm build");
    expect(template).toContain("金额的 fen 存储");
    expect(template).toContain("Agent 交接与独立验收");
    expect(template).toContain("GitHub 的同一账号审批不能替代独立 Agent 复核");
    expect(template).toContain("未提交 `.env`、密钥、Token、验证码");
  });
});

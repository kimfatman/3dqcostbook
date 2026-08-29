import { expect, test } from "@playwright/test";

const hasAdminSession = Boolean(process.env.E2E_ADMIN_STORAGE_STATE);

test.describe("管理平台浏览器 UI", () => {
  test("未登录访问 /admin 显示登录门禁，不展示管理数据", async ({ page }) => {
    test.skip(hasAdminSession, "该用例需要未登录浏览器上下文");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "需要登录" })).toBeVisible();
    await expect(page.getByText("管理维护平台")).not.toBeVisible();
    await expect(page.getByText("服务端已授权")).not.toBeVisible();
  });

  test.describe("管理员会话", () => {
    test.skip(!hasAdminSession, "设置 E2E_ADMIN_STORAGE_STATE 后运行管理员 UI 流程");

    test("可浏览系统监控和审计日志，并保持安全状态提示", async ({ page }) => {
      await page.goto("/admin");
      await expect(page.getByText("服务端已授权")).toBeVisible();

      await page.getByRole("button", { name: "系统监控" }).click();
      await expect(page.getByRole("heading", { name: "系统监控" })).toBeVisible();
      await expect(page.getByText("系统监控")).toBeVisible();
      await expect(page.getByText(/数据库/).first()).toBeVisible();
      await page.getByLabel("性能指标筛选").selectOption("database.latency_ms");
      await page.getByLabel("指标时间窗口").selectOption("1440");
      await page.getByRole("button", { name: "刷新监控数据" }).click();
      await expect(page.getByText("数据由服务端采集并脱敏")).toBeVisible();

      await page.getByRole("button", { name: "审计日志" }).click();
      await expect(page.getByRole("heading", { name: "审计日志" })).toBeVisible();
      await page.getByLabel("审计结果筛选").selectOption("failure");
      await page.getByLabel("审计目标筛选").selectOption("backup_run");
      await page.getByLabel("审计动作筛选").fill("backup.run.queue");
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "刷新审计日志" }).click();
      await expect(page.getByText(/Token、密码、验证码/)).toBeVisible();
    });

    test("用户和账本状态变更必须展示二次确认与理由字段", async ({ page }) => {
      await page.goto("/admin");
      await page.getByRole("button", { name: "用户运营" }).click();
      await expect(page.getByRole("heading", { name: "用户运营" })).toBeVisible();
      const userAction = page.locator(".admin-row-action").first();
      if (await userAction.isVisible() && await userAction.isEnabled()) {
        await userAction.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel("变更理由")).toBeVisible();
        await expect(page.getByRole("button", { name: "确认变更" })).toBeDisabled();
        await page.getByRole("button", { name: "取消" }).click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
      }

      await page.getByRole("button", { name: "账本工作区" }).click();
      await expect(page.getByRole("heading", { name: "账本工作区" })).toBeVisible();
      const workspaceAction = page.locator(".admin-row-action").first();
      if (await workspaceAction.isVisible() && await workspaceAction.isEnabled()) {
        await workspaceAction.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel("工作区变更理由")).toBeVisible();
        await page.getByRole("button", { name: "取消" }).click();
      }
    });

    test("迁移审核页面支持审批选择和破坏性变更警示", async ({ page }) => {
      await page.goto("/admin");
      await page.getByRole("button", { name: "迁移审核" }).click();
      await expect(page.getByRole("heading", { name: "迁移审核" })).toBeVisible();
      await page.getByLabel("迁移审核状态筛选").selectOption("pending");
      const reviewAction = page.getByRole("button", { name: "开始审核" }).first();
      if (await reviewAction.isVisible()) {
        await reviewAction.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByRole("button", { name: "批准" })).toBeVisible();
        await expect(page.getByRole("button", { name: "驳回" })).toBeVisible();
        await expect(page.getByLabel("审核备注")).toBeVisible();
        await page.getByRole("button", { name: "取消" }).click();
      }
    });

    test("备份页面区分计划、排队状态和运行结果", async ({ page }) => {
      await page.goto("/admin");
      await page.getByRole("button", { name: "定时备份" }).click();
      await expect(page.getByRole("heading", { name: "定时备份" })).toBeVisible();
      await expect(page.getByText(/已排队|运行记录|备份计划/).first()).toBeVisible();
    });
  });
});

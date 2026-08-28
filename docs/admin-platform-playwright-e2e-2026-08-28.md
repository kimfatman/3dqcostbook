# 管理平台 Playwright UI E2E 运行说明

## 目标与范围

本套浏览器自动化脚本位于 `e2e/admin-platform.spec.ts`，覆盖专用 `/admin` 管理入口。测试验证未登录门禁、管理员会话下的导航，以及系统监控、审计日志、用户运营、账本工作区、迁移审核和定时备份页面的关键交互。

脚本只验证浏览器 UI 和请求触发边界。后端授权、业务状态变更、备份 worker 状态机和审计写入由服务端 Vitest 集成测试覆盖；Playwright 不连接生产数据库、COS 或真实备份 worker。

## 运行方式

项目已声明 `@playwright/test` 依赖和 `test:e2e` 脚本。首次使用时执行：

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

默认测试服务地址为 `http://127.0.0.1:3000`，配置位于 `playwright.config.ts`。若已有本地服务，可使用 `E2E_SKIP_WEBSERVER=1`；若使用隔离测试环境，可设置 `E2E_BASE_URL=https://test.example.internal`。

```bash
E2E_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e
E2E_SKIP_WEBSERVER=1 E2E_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test --project=admin-chromium
```

## 管理员认证边界

需登录的浏览器用例只有在设置 `E2E_ADMIN_STORAGE_STATE` 后才会运行；未设置时安全跳过，不会要求在命令行输入密码、Token 或验证码。认证状态文件必须由隔离测试环境生成，并放在本地忽略目录，例如 `e2e/.auth/admin.storage-state.json`。该目录、storage state、截图、视频和 trace 均已加入 `.gitignore`，严禁提交到仓库。

```bash
E2E_ADMIN_STORAGE_STATE=/absolute/path/to/e2e/.auth/admin.storage-state.json pnpm test:e2e
```

认证状态只能来自授权的测试管理员账号。不得使用生产管理员会话、真实用户密码、CloudBase access token、验证码或其他生产凭据。

## 用例矩阵

| 用例 | Chromium | Mobile | 认证要求 |
|---|---:|---:|---|
| 未登录 `/admin` 门禁 | 是 | 是 | 无 |
| 系统监控与审计查询 | 是 | 是 | 测试管理员 storage state |
| 用户与账本状态确认/取消 | 是 | 是 | 测试管理员 storage state |
| 迁移审核确认/取消 | 是 | 是 | 测试管理员 storage state |
| 备份计划与运行结果显示 | 是 | 是 | 测试管理员 storage state |

## 通过标准

未登录访问必须显示“需要登录”，且不得显示管理平台导航、授权状态或业务数据。管理员用例必须能够在服务端测试数据存在时完成页面导航、筛选、刷新、弹窗打开和取消；状态变更、迁移审核和备份排队是否真正落库由服务端 E2E/API 集成测试验证。

任何页面都不得显示密码、Token、验证码、数据库连接串、COS 凭据、CloudBase verification id/token/access token 或未经服务端脱敏的审计详情。生产环境禁止直接运行该脚本，除非统筹/发布 Agent 已批准隔离环境、测试数据和账号策略。

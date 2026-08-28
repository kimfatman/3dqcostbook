# 三账号协作与审查配置

> 本文只定义 GitHub 协作边界，不记录任何账号密码、访问令牌、验证码、SSH 私钥或生产密钥。

仓库采用 UI 开发、后端开发和独立验收三类账号分工。`CODEOWNERS` 位于 `.github/CODEOWNERS`，GitHub 会以该路径识别文件归属；统一拉取请求模板位于 `.github/PULL_REQUEST_TEMPLATE.md`。在专属账号创建前，所有规则暂由当前仓库管理员 `@kimfatman` 作为安全回退，避免无效占位用户名使强制代码所有者审查失效。

| 角色 | 建议 GitHub 权限 | GitHub 责任 | 应用与生产边界 |
| --- | --- | --- | --- |
| UI 开发 | Write | `client/**`、前端交互、样式、图表与前端回归 | 不读取运行时密钥；不执行数据库迁移或生产部署。 |
| 后端开发 | Write | `server/**`、`drizzle/**`、`deploy/**`、认证、接口、安全测试与迁移 | 不直接编辑生产数据；不在仓库或 PR 中写入密钥。 |
| 独立验收 | Triage | 记录验收 Issue、复现缺陷、确认用户路径与回归结果 | 不推送代码、不合并 PR、不获得 SSH/运行时密钥；应用内使用普通店主测试账号。 |

## 启用顺序

创建 UI、后端和验收 GitHub 账号后，先邀请 UI 和后端账号加入私有仓库并启用两步验证。将 `.github/CODEOWNERS` 中的临时 `@kimfatman` 替换为实际 UI/后端账号或 Organization Team；验收账号可在文档和 PR 模板中登记，但不应被设为合并审批人。最后在默认分支启用保护规则：禁止直接推送、要求至少一项非作者审批、要求状态检查 `pnpm check`、`pnpm test`、`pnpm build`，并禁止 force push 与删除默认分支。

> 涉及 `server/**`、`drizzle/**`、`deploy/**`、`.github/**` 或认证、数据迁移、生产发布的改动，建议要求 UI 与后端负责人共同审批。所有验收结论以 Issue 或 PR 的“验收交接”表保存，保持与代码和发布记录可追溯。

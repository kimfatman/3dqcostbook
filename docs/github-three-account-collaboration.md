# 单 GitHub 账号、多 Agent 协作与审查配置

> 本文只定义 GitHub 协作边界，不记录任何账号密码、访问令牌、验证码、SSH 私钥或生产密钥。

仓库使用单一 GitHub 身份 `@kimfatman`，并由 UI Agent、后端 Agent和独立验收 Agent 分工。`CODEOWNERS` 位于 `.github/CODEOWNERS`，用于标示文件路径与唯一安全回退负责人；统一拉取请求模板位于 `.github/PULL_REQUEST_TEMPLATE.md`，用于记录每个 Agent 的交接、复核和验收结论。由于三个 Agent 在 GitHub 中显示为同一身份，CODEOWNERS 与 GitHub 审批无法证明它们来自独立 Agent，因此不得将同账号审批当作职责隔离的证据。[1]

| Agent 角色 | GitHub 身份与提交边界 | 负责范围 | 应用与生产边界 |
| --- | --- | --- | --- |
| UI Agent | 以 `@kimfatman` 在独立分支和独立任务/会话提交 | `client/**`、前端交互、样式、图表与前端回归 | 不读取运行时密钥；不执行数据库迁移或生产部署。 |
| 后端 Agent | 以 `@kimfatman` 在独立分支和独立任务/会话提交 | `server/**`、`drizzle/**`、`deploy/**`、认证、接口、安全测试与迁移 | 不直接编辑生产数据；不在仓库或 PR 中写入密钥。 |
| 独立验收 Agent | 使用同一账号记录 PR 评论或 Issue，不作为 GitHub 独立审批人 | 复现缺陷、执行验收步骤、确认用户路径与回归结果 | 不推送功能代码、不合并 PR、不获得 SSH/运行时密钥；应用内使用普通店主测试账号。 |

## 执行顺序

每次改动先由主办 Agent 创建非 `main` 分支和 PR，在 PR 中填写主办、复核与验收 Agent 的任务/会话标识。UI 改动由后端 Agent 复核数据/接口边界，后端改动由 UI Agent 复核用户路径；高风险变更应由两个不同 Agent 任务/会话交叉复核，再交给独立验收 Agent 执行测试。验收未通过时，应创建 Issue 或在 PR 中保留可复现步骤。默认分支仍应禁止直接推送、禁止 force push 和删除，并要求现有的质量检查；不要配置“必须由 Code Owner 审批”或“必须由非作者审批”来证明 Agent 独立性，因为同一 GitHub 身份无法满足这种身份级约束。[1] [2]

> 涉及 `server/**`、`drizzle/**`、`deploy/**`、`.github/**` 或认证、数据迁移、生产发布的改动，必须在 PR 中记录 UI Agent 与后端 Agent 的独立任务/会话复核，以及验收 Agent 的结论。所有验收结论以 Issue 或 PR 的“Agent 交接与独立验收”表保存，保持与代码和发布记录可追溯。

## 参考资料

[1]: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners "GitHub Docs：About code owners"
[2]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/about-pull-requests "GitHub Docs：About pull requests"

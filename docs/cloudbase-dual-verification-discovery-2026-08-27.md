# CloudBase 双渠道验证码能力核验

> 核验日期：2026-08-27。本记录仅整理官方接入边界，不包含环境 ID、API Key、短信模板、邮件模板或任何凭据。

CloudBase 的 Web SDK 支持邮箱与手机号验证码两步认证：先请求验证码，再携带该请求返回的验证信息及用户输入的六位验证码完成登录。当前 v3 API 还提供统一的 `signInWithOtp`，可按邮箱或手机号发送验证码、完成验证，并在需要时自动创建用户。官方 React 示例指出，短信验证码仅支持上海地域；Web SDK 初始化使用公开环境 ID 与 Publishable Key，管理员 API Key 不得出现在浏览器中。[1] [6]

| 能力 | 官方接口/SDK 流程 | 对本项目的适配含义 |
| --- | --- | --- |
| 邮箱与短信发送 | HTTP `POST /auth/v1/verification` 或 Web SDK `auth.getVerification`；标准验证码有效期为 600 秒、同一目标 60 秒内只能重发一次。 | 发送必须由 CloudBase SDK/受控服务端发起；页面只保留验证码请求上下文，不保存验证码明文。 |
| 验证码校验 | `POST /auth/v1/verification/verify` 返回短期 `verification_token`。 | 验证 token 只能用于对应注册、登录或找回流程，不可替代本站会话。 |
| 注册/登录 | CloudBase 通过 `signInWithEmail` 与 `signInWithSms` 完成用户身份登录；HTTP 注册须携带 `verification_token`。 | 需要将 CloudBase UID 与现有 `app_users` 中的本站用户稳定关联，不能按邮箱/手机号盲目新建重复用户。 |
| 自建服务保护 | `GET /auth/v1/user/me` 接受登录用户的 Bearer access token 并返回 CloudBase 用户唯一标识、邮箱、手机号及身份源；当前 Node SDK 初始化说明同时指出旧 `@cloudbase/node-sdk` 将停止维护，推荐统一使用 `@cloudbase/js-sdk` v3。 | 本项目的 Express/tRPC 服务须使用 `user/me` 对 CloudBase access token 做服务端校验，再签发原有 HttpOnly 本地会话；不可信任客户端传来的 uid、邮箱或手机号。 |
| 高风险重认证 | `POST /auth/v1/user/reauthenticate` 在用户已绑定邮箱或手机号时发送五分钟有效的邮箱/短信二次验证码。 | 后续改密、删除账户等操作应复用该服务，不将高风险验证码与登录验证码混用。 |

现有项目目前以邮箱＋密码、本地 scrypt 密码哈希和 HttpOnly 本地会话为主。适配时采用“CloudBase 负责邮箱/短信验证码与外部身份，本站服务端负责工作区授权和本地会话”的桥接方式。用户已确认环境 `sdq12-d0gv14qu22e8df1eb` 位于上海，并已配置服务器 API Key 与浏览器 Publishable Key；两项密钥仅保存在安全环境变量中，未记录于本文或仓库。

## 参考资料

[1]: https://docs.cloudbase.net/recipes/add-auth-web-with-cloudbase-sdk "在 Web React 项目中接入 CloudBase 用户认证"
[2]: https://docs.cloudbase.net/http-api/auth/auth-send-verification "发送短信、邮箱验证码"
[3]: https://docs.cloudbase.net/http-api/auth/auth-verify-verification "验证短信、邮箱验证码"
[4]: https://docs.cloudbase.net/authentication-v2/method/email-login "邮箱验证码登录"
[5]: https://docs.cloudbase.net/faq/knowledge/cloudrun-authentication-integration "云托管与身份认证服务如何结合使用"
[6]: https://docs.cloudbase.net/api-reference/webv3/authentication "CloudBase JS SDK V3 身份认证概述"
[7]: https://docs.cloudbase.net/http-api/auth/user-me "获取当前用户信息"
[8]: https://docs.cloudbase.net/http-api/auth/user-reauthenticate "重新认证"
[9]: https://docs.cloudbase.net/api-reference/server/node-sdk/initialization "CloudBase Node SDK 初始化"

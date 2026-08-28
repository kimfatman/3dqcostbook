# CloudBase 双渠道验证码适配

> 实施日期：2026-08-27。本文不记录任何 API Key、Publishable Key、SecretId、SecretKey、数据库密码或用户验证码。

本轮将已启用的 CloudBase 邮箱与短信验证码接入现有 React、Express/tRPC 与 MySQL 架构。短信仅使用上海地域的 CloudBase 环境 `sdq12-d0gv14qu22e8df1eb`。原有邮箱＋密码登录、七日 HttpOnly 本地会话、工作区授权、账本数据和金额计算均保留不变。

## 身份与会话边界

| 层级 | 职责 | 明确不做的事 |
| --- | --- | --- |
| 浏览器 | 仅调用本站 tRPC 的验证码挑战与完成接口；持有本站随机 challenge id 和用户输入的六位验证码。 | 不持有 CloudBase Publishable Key、管理员 API Key、provider verification id、verification token 或 CloudBase access token。 |
| CloudBase | 由本站服务端调用 HTTP API 发送和验证六位邮箱/短信验证码，并管理 CloudBase 登录身份与 access token。 | 不直接获得本站账本、工作区或本地 session 权限。 |
| Express/tRPC | 向 CloudBase HTTP API 发送、校验和交换验证码；通过 `user/me` 回源验证 access token；以 CloudBase subject、已验证邮箱或手机号匹配本地账号；签发现有 HttpOnly 本地会话。 | 不信任前端身份字段，不向浏览器返回 CloudBase token 或 provider verification id。 |
| MySQL | 在 `app_users` 新增可空 `phoneNumber`、`cloudbaseSubject`，并以唯一索引防止一个 CloudBase identity 关联多个本地账号。 | 不保存验证码、CloudBase access token、refresh token 或 Key。 |

邮箱或短信验证码登录首次用于既有密码账号时，会在回源验证成功且邮箱/手机号匹配后建立绑定；首次没有本地账号的身份必须进入“创建你的店铺”并填写名称、行业、店铺名及本地密码，服务器不会在登录接口中隐式创建工作区。密码重置也必须先通过 CloudBase 身份回源校验，再更新原有 scrypt 密码哈希。

## 用户流程

登录页保留“密码登录”，并新增“邮箱验证码”“短信验证码”两个平行入口。新注册默认要求验证码验证，用户依然设置一个本地密码，保证既有账号体系、离线的本地会话和密码登录兼容。浏览器请求本站服务器后，服务器保存 CloudBase `verification_id`，仅返回随机挑战 id；六位验证码也仅提交给本站服务器，后续的 verification token、CloudBase access token 和 `user/me` 回源均不会回传浏览器。本站额外增加按来源及目标的 60 秒发送冷却，CloudBase 的有效期、错误次数、异常图片验证码和上游频率控制仍保持生效；界面显示中文可执行反馈，不直出第三方英文错误。

主动退出时，本站仅清除 HttpOnly 本地会话。服务端代理不会在浏览器建立或保留 CloudBase 登录状态，因此不存在跨设备复用第三方浏览器会话的路径。

## 数据库迁移

已审查并应用 `drizzle/0005_lush_dexter_bennett.sql`。迁移只将 `app_users.email` 调整为可空并新增两个可空字段及唯一索引；没有删除、重写或迁移账本、订单、退款、SKU、历史价格或成本快照数据。

## 验收

| 验收项 | 结果 |
| --- | --- |
| 服务端发送与交换 | 通过单元回归：provider verification id 留在服务器，浏览器只接收随机 challenge id；六位验证码在服务器交换 verification token、access token 和已验证身份。 |
| 令牌回源、封禁身份拒绝、匿名身份拒绝 | 通过单元回归。 |
| 账号关联、首次注册、密码策略、来源限流与本地会话 | 通过服务端回归。 |
| 邮箱 OTP、短信 OTP、六位输入、挑战 id 与中文限流反馈 | 通过 jsdom 页面回归。 |
| 全量门禁 | 通过：`pnpm check`、51 个测试文件/210 项测试及 `pnpm build` 均通过；仅保留既有主 bundle 大于 500kB 警告。 |
| 腾讯云构建与迁移 | 通过：服务端代理版本已重新构建、迁移并启动。 |
| 腾讯云运行态 | 通过：源码含服务端挑战 id 标记、前端不再引用浏览器 CloudBase SDK、应用容器运行且 `CLOUDBASE_ENV_ID` 存在性检查通过（未输出值）、运行 UID 为 `10001`。 |
| 服务可用性 | 通过。`https://api.3dq.site/healthz` 返回 `{"status":"ok"}`，`https://app.3dq.site/` 返回 HTTP `200`。 |
| 店主真实交互验证 | 通过。店主已在生产环境确认邮箱与短信验证码发送成功，发送成功后的“6 位验证码”输入阶段正常出现；未提供任何验证码或 Key。 |

构建保留项目既有的主 bundle 大于 500kB 提示；服务端代理迁移后未引入新的本地编译错误。腾讯云生产已完成重新部署，浏览器不再依赖 CloudBase 自定义安全域名白名单或 Publishable Key。店主已确认真实邮箱与短信验证码的发送及输入阶段正常；后续应继续遵循不在聊天中发送验证码或 Key 的安全边界。

## 参考资料

[1]: https://docs.cloudbase.net/api-reference/webv3/authentication "CloudBase JS SDK V3 身份认证概述"
[2]: https://docs.cloudbase.net/http-api/auth/user-me "获取当前用户信息"
[3]: https://docs.cloudbase.net/http-api/auth/user-reauthenticate "重新认证"
[4]: https://docs.cloudbase.net/http-api/auth/auth-send-verification "发送短信、邮箱验证码"

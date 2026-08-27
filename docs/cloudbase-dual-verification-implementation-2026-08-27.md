# CloudBase 双渠道验证码适配

> 实施日期：2026-08-27。本文不记录任何 API Key、Publishable Key、SecretId、SecretKey、数据库密码或用户验证码。

本轮将已启用的 CloudBase 邮箱与短信验证码接入现有 React、Express/tRPC 与 MySQL 架构。短信仅使用上海地域的 CloudBase 环境 `sdq12-d0gv14qu22e8df1eb`。原有邮箱＋密码登录、七日 HttpOnly 本地会话、工作区授权、账本数据和金额计算均保留不变。

## 身份与会话边界

| 层级 | 职责 | 明确不做的事 |
| --- | --- | --- |
| 浏览器 | 使用 CloudBase Publishable Key 发起邮箱或短信 OTP；只将验证成功的短期 access token 交给本站 tRPC。 | 不持有服务器 API Key；不向本站声明可被伪造的 UID、邮箱或手机号。 |
| CloudBase | 发送和验证六位邮箱/短信验证码；管理 CloudBase 登录身份与 access token。 | 不直接获得本站账本、工作区或本地 session 权限。 |
| Express/tRPC | 通过 CloudBase `user/me` 回源验证 access token；以 CloudBase subject、已验证邮箱或手机号匹配本地账号；签发现有 HttpOnly 本地会话。 | 不信任前端身份字段，不把 API Key 作为用户身份使用。 |
| MySQL | 在 `app_users` 新增可空 `phoneNumber`、`cloudbaseSubject`，并以唯一索引防止一个 CloudBase identity 关联多个本地账号。 | 不保存验证码、CloudBase access token、refresh token 或 Key。 |

邮箱或短信验证码登录首次用于既有密码账号时，会在回源验证成功且邮箱/手机号匹配后建立绑定；首次没有本地账号的身份必须进入“创建你的店铺”并填写名称、行业、店铺名及本地密码，服务器不会在登录接口中隐式创建工作区。密码重置也必须先通过 CloudBase 身份回源校验，再更新原有 scrypt 密码哈希。

## 用户流程

登录页保留“密码登录”，并新增“邮箱验证码”“短信验证码”两个平行入口。新注册默认要求验证码验证，用户依然设置一个本地密码，保证既有账号体系、离线的本地会话和密码登录兼容。验证码有效期、发送频率限制、异常图片验证码与身份服务错误均由 CloudBase 管理；界面显示中文可执行反馈，不直出第三方英文错误。

主动退出时，本站先清除 HttpOnly 会话，再尽力清理浏览器内的 CloudBase 登录状态。即使后者临时不可用，也不会阻断本地退出。

## 数据库迁移

已审查并应用 `drizzle/0005_lush_dexter_bennett.sql`。迁移只将 `app_users.email` 调整为可空并新增两个可空字段及唯一索引；没有删除、重写或迁移账本、订单、退款、SKU、历史价格或成本快照数据。

## 验收

| 验收项 | 结果 |
| --- | --- |
| 服务器 API Key 只读认证连通性 | 通过；不发送验证码、不读取真实用户资料、不写入数据。 |
| 浏览器 Publishable Key 认证网关连通性 | 通过；不发送验证码、不写入数据。 |
| 令牌回源、封禁身份拒绝、匿名身份拒绝 | 通过单元回归。 |
| 账号关联、首次注册、密码策略、来源限流与本地会话 | 通过服务端回归。 |
| 邮箱 OTP、短信 OTP、六位输入、中文限流反馈 | 通过 jsdom 页面回归。 |
| 全量门禁 | `pnpm check`、51 个测试文件/208 项通过、2 个仅显式启用的凭据连通性测试跳过、`pnpm build` 通过。 |

构建保留项目既有的主 bundle 大于 500kB 提示；本轮未引入新的构建错误。生产发布后，还需验证 HTTPS、健康接口、非 root UID 和已构建前端中“邮箱验证码”“短信验证码”标记；不在生产环境自动向真实邮箱或手机号发送测试验证码。

## 参考资料

[1]: https://docs.cloudbase.net/api-reference/webv3/authentication "CloudBase JS SDK V3 身份认证概述"
[2]: https://docs.cloudbase.net/http-api/auth/user-me "获取当前用户信息"
[3]: https://docs.cloudbase.net/http-api/auth/user-reauthenticate "重新认证"
[4]: https://docs.cloudbase.net/http-api/auth/auth-send-verification "发送短信、邮箱验证码"

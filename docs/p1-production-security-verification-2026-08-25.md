# P1 生产安全加固验证记录

**验证日期：**2026-08-25  
**范围：**Caddy 安全响应头、应用非 root 运行、公开身份入口、静态资源与私有媒体边界。

| 验证项 | 生产结果 | 证据与结论 |
| --- | --- | --- |
| 应用与 API HTTPS 安全头 | 通过 | `app.3dq.site` 与 `api.3dq.site/healthz` 均返回 HSTS、CSP、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy` 与 `Permissions-Policy`。 |
| 健康接口 | 通过 | `https://api.3dq.site/healthz` 返回 `{"status":"ok"}`。 |
| 登录与注册入口 | 通过 | 生产浏览器可正常渲染登录表单；切换注册界面后，姓名、店铺、行业、邮箱、密码与提交控件均可见，密码输入显示“至少 8 个字符”及密码短语提示。 |
| 静态资源 | 通过 | 生产首页解析出的主 JavaScript 与 CSS 均返回 HTTP 200；其 `Content-Type` 分别为 JavaScript 与 CSS，且携带 CSP 与 `nosniff`。 |
| 私有媒体未认证边界 | 通过 | 对不存在的私有媒体路径的未认证请求返回 HTTP 401，安全头未改变访问控制边界。 |
| 数据库迁移 | 通过 | P1 镜像以非 root 用户执行 `pnpm drizzle-kit migrate`，迁移成功。 |
| 应用进程身份 | 通过 | 生产容器配置用户为 `costbook`，容器内进程 UID/GID 均为 `10001`。 |
| 容器与前端可用性 | 通过 | app、Caddy 与 MySQL 容器均在运行；`https://app.3dq.site/` 返回 HTTP 200。 |

## 尚待登录会话验收

本记录不使用真实用户密码或业务数据，因此尚未在**已登录生产会话**中实际预览已有 COS 私有媒体，也未实际触发 CSV/XLSX 下载。两项保持在 `todo.md` 中，待用户可在其设备或可用登录会话中完成业务级验收后关闭。

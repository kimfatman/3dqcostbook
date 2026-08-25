# 腾讯云自托管发布

该目录用于将成本管家发布到已清理的腾讯云服务器。它不包含任何真实密码或密钥。

## 首次准备

在服务器的 `/opt/cost-book/deploy` 中，参考 `environment.template.txt` 手动创建 `runtime.secrets`。该目录位于 `/opt/cost-book/app` 之外，日常源码同步不会覆盖或上传其中内容。所有值均应使用 `openssl rand -hex 32` 独立生成；生成的十六进制值可安全用于 Compose 的数据库连接串。不要把 `runtime.secrets` 提交到 Git，也不要通过聊天发送其中内容。

在 DNSPod 中创建 `app.3dq.site` 和 `api.3dq.site` 的 A 记录，记录值为服务器公网 IP。完成记录生效后运行 `./release.sh`。Caddy 会自动申请并续期 HTTPS 证书；若证书未签发，请先核验 DNS 生效及腾讯云安全组允许 80/443。

## 首次管理员初始化

首次访问 `https://app.3dq.site` 时，页面要求输入 `runtime.secrets` 中的 `BOOTSTRAP_ADMIN_TOKEN`、管理员邮箱、姓名、工作区名称和至少 8 位的密码。建议使用长密码短语并避免常见弱口令。成功后应从 `runtime.secrets` 删除 `BOOTSTRAP_ADMIN_TOKEN` 并重新运行 `./release.sh`，使该令牌不再存在于运行环境。

## 响应头安全基线

`deploy/Caddyfile` 会为应用和 API 域名附加 HSTS、反嵌入、MIME 防嗅探、Referrer、权限与 CSP 响应头。修改该文件后，应通过 HTTPS 响应头复核，确认登录、私有媒体、静态资源、API 和账单下载均保持可用。

## 健康与回滚

应用健康地址为 `https://api.3dq.site/healthz`。在 `/opt/cost-book/app/deploy` 中查看运行状态使用 `docker compose --env-file /opt/cost-book/deploy/runtime.secrets ps` 和 `docker compose --env-file /opt/cost-book/deploy/runtime.secrets logs --tail=100 app`。若新镜像无法启动，可保留上一镜像标签后运行 `docker compose --env-file /opt/cost-book/deploy/runtime.secrets up -d app caddy` 回退；MySQL 数据卷不会因 `up -d` 被删除。

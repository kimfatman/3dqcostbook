# 腾讯云自托管发布

该目录用于将成本管家发布到已清理的腾讯云服务器。它不包含任何真实密码或密钥。

## 首次准备

在服务器的 `/opt/cost-book/deploy` 中，参考 `environment.template.txt` 手动创建 `.env`。所有值均应使用 `openssl rand -hex 32` 独立生成；生成的十六进制值可安全用于 Compose 的数据库连接串。不要把 `.env` 提交到 Git，也不要通过聊天发送其中内容。

在 DNSPod 中创建 `app.3dq.site` 和 `api.3dq.site` 的 A 记录，记录值为服务器公网 IP。完成记录生效后运行 `./release.sh`。Caddy 会自动申请并续期 HTTPS 证书；若证书未签发，请先核验 DNS 生效及腾讯云安全组允许 80/443。

## 首次管理员初始化

首次访问 `https://app.3dq.site` 时，页面要求输入 `.env` 中的 `BOOTSTRAP_ADMIN_TOKEN`、管理员邮箱、姓名、工作区名称和至少 12 位的密码。成功后应从 `.env` 删除 `BOOTSTRAP_ADMIN_TOKEN` 并重新运行 `./release.sh`，使该令牌不再存在于运行环境。

## 健康与回滚

应用健康地址为 `https://app.3dq.site/healthz`。查看运行状态使用 `docker compose --env-file .env ps` 和 `docker compose --env-file .env logs --tail=100 app`。若新镜像无法启动，可保留上一镜像标签后运行 `docker compose --env-file .env up -d app caddy` 回退；MySQL 数据卷不会因 `up -d` 被删除。

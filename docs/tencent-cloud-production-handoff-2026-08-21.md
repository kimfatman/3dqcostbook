# 算得清 · 腾讯云生产环境交接

**交接日期：**2026-08-21  
**部署模式：**自托管 Node.js 全栈服务  
**运行状态：**已上线；HTTPS、健康检查、管理员初始化、工作区创建与云端账本快照保存已验证。

## 1. 生产入口

| 用途 | 地址 | 当前状态 |
|---|---|---|
| 移动端经营账本 | `https://app.3dq.site` | 已上线；未登录时显示管理员登录页 |
| API 与健康检查 | `https://api.3dq.site/healthz` | 返回 `{"status":"ok"}` |
| 应用健康检查 | `https://app.3dq.site/healthz` | 返回 `{"status":"ok"}` |

首次管理员已经创建。后续访问者需要使用管理员创建时设置的邮箱和密码登录；初始化令牌不会出现在页面上，也不应通过聊天、邮件或源码分享。

## 2. 服务器与运行架构

生产服务器为腾讯云上海 OpenCloudOS 9，配置为 4 核 CPU、4 GB 内存、40 GB 云 SSD 和 3 Mbps 公网带宽。应用部署路径为 `/opt/cost-book`，运行账户为 `deploy`，容器编排文件位于 `/opt/cost-book/deploy`。

| 服务 | 容器/组件 | 职责 | 公网暴露 |
|---|---|---|---|
| Caddy | `deploy-caddy-1` | TLS 证书、HTTPS 入口与反向代理 | 80/443 |
| Node.js | `deploy-app-1` | React 静态资源、tRPC、管理员会话与账本 API | 不直接暴露 |
| MySQL 8 | `deploy-mysql-1` | 用户、工作区、版本化账本快照和审计事件 | 不直接暴露 |
| Docker 卷 | `deploy_mysql_data`、Caddy 卷 | 数据库与证书持久化 | 不直接暴露 |

宝塔、旧 Nginx、旧系统 MySQL 与 PHP-FPM 已停止并禁用，相关文件保留在服务器上，便于在紧急情况下人工回退。云防火墙与服务器防火墙只允许 SSH、HTTP 和 HTTPS；其中 SSH 当前仍为公网密钥访问，待有固定办公出口 IP 后应在腾讯云安全组中进一步收紧。

## 3. 日常运维

请使用已配置的部署密钥或腾讯云受控终端登录服务器。不要在聊天中发送密码、私钥或 `/opt/cost-book/deploy/runtime.secrets` 的内容。

```bash
sudo su - deploy
cd /opt/cost-book/deploy

# 查看容器状态
docker compose --env-file runtime.secrets ps

# 查看实时日志
docker compose --env-file runtime.secrets logs -f app caddy

# 验证本机健康状态
curl -fsS https://app.3dq.site/healthz
curl -fsS https://api.3dq.site/healthz
```

发布已同步到服务器的新版代码时，使用以下命令。脚本会先等待 MySQL 健康、执行 Drizzle 迁移，再重建 Node 应用并恢复 Caddy；数据库卷和证书卷不会因这一操作删除。

```bash
sudo su - deploy
cd /opt/cost-book/deploy
./release.sh
```

## 4. 数据、安全与恢复

账本现在由服务端的工作区级版本化快照保存，写入同时记录审计事件。客户端仍保留网络失败时的本地草稿，但云端工作区是跨设备使用时的持久化来源。数据库密码、会话密钥和初始化令牌仅存在服务器私有文件 `runtime.secrets` 中，权限为仅部署账户可读。

当前尚未配置自动离机备份。上线后应优先建立每日 MySQL 备份，并将加密备份同步至腾讯云 COS 或另一台独立存储位置；单台云服务器磁盘故障、误删或账户事故不应由同一台服务器承担恢复责任。实施备份前，应先确认保留周期、COS 存储桶地域和恢复演练频率。

| 风险项 | 当前状态 | 建议后续动作 |
|---|---|---|
| SSH 来源限制 | 密钥登录已启用，端口 22 暂可公网访问 | 获取固定出口 IP 后在安全组仅允许该地址或 VPN |
| 数据库备份 | 数据卷已持久化，未做离机自动备份 | 增加每日逻辑备份并同步 COS，至少保留 7–14 个恢复点 |
| 凭证附件 | 暂未启用 COS | 开发凭证上传时采用 COS 直传，禁止通过 3 Mbps 应用服务器中转 |
| 容量与带宽 | 4C4G / 40 GB / 3 Mbps | 监控磁盘、内存与上传耗时；高频图片业务应先接 COS |

## 5. 回滚边界

若某次应用发布失败，可保留当前数据库卷并回退到上一份经过验证的应用源代码后重新执行 `./release.sh`。不要在未导出数据库的情况下执行 `docker compose down -v`，因为该命令会删除命名卷并造成不可恢复的数据丢失。

旧宝塔组件没有删除，仅被停止和禁用。若需紧急恢复旧组件，必须先停止当前 Caddy 容器并重新评估端口占用；由于生产账本已经使用 Docker MySQL，新旧系统 MySQL 不应同时对公网开放。

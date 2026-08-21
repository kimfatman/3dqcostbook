# Node.js / Go 后端成本评估：公开价格证据

**采集日期：**2026-08-21  
**用途：**为成本管家后端技术选型提供可复核的运行时、数据库与附件存储成本基准。各项价格会随区域、币种、税费和用量变化，应在采购前重新核验。

## Google Cloud Run

Google Cloud Run 对容器的实际资源和请求计费，因此 Node.js 与 Go 的核心差别不在语言单价，而在同等业务负载下的资源占用、启动特性与并发配置。请求计费模式在 Tier 1 区域提供每月 180,000 vCPU 秒、360,000 GiB 秒及 200 万次请求免费额度；超过后 CPU 为每 vCPU 秒 $0.000024、内存为每 GiB 秒 $0.0000025、请求为每 100 万次 $0.40。官方示例中，1 vCPU、512 MiB、20 并发、每月 1,000 万次且平均 400 ms 的 API 约为 $13.69/月（欧洲西部，含免费额度）。

来源：[Google Cloud Run Pricing](https://cloud.google.com/run/pricing)

## Supabase

Supabase Free 提供 500 MB 数据库、1 GB 文件存储、5 GB 出网，闲置一周后会暂停项目，不适合真实商家账本的长期生产使用。Pro 起价 $25/月，包含 8 GB 数据库存储、100 GB 文件存储、250 GB 出网、7 天每日备份与一个价值 $10/月的 Micro 计算实例额度；超出后数据库存储 $0.125/GB/月、文件存储 $0.0213/GB/月。

来源：[Supabase Pricing](https://supabase.com/pricing)

## DigitalOcean Managed PostgreSQL / MySQL

DigitalOcean 的最低受管 PostgreSQL 和 MySQL 规格为 1 vCPU、1 GiB 内存，官方页面列示约 $15.15/月，磁盘范围为 10–30 GiB。该价格可作为“独立受管数据库”的低端成本基线，但应用运行时、对象存储和出网仍需另计。

来源：[DigitalOcean Managed Databases Pricing](https://www.digitalocean.com/pricing/managed-databases)

## 解读边界

上述价格均为公开美元基准，不包含中国大陆区域部署、域名、短信、微信认证、邮件、税费、迁移开发工时、监控、备份保留扩展或人工运维成本。对小型商家账本而言，早期月度基础设施成本通常更多由数据库、认证、文件存储与备份决定，而非 Node.js 或 Go 本身。

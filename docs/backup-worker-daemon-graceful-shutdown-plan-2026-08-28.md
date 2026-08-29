# P3 备份 Worker 常驻守护循环与 Graceful Shutdown 实现方案

**文档日期：** 2026-08-28  
**适用分支：** `agent/backend/admin-maintenance-backend`  
**前置实现：** `server/backup-worker.ts`、`drizzle/0010_kind_sentinel.sql`  
**作者：** Manus AI

## 1. 实现目标

当前 worker 已具备单轮处理能力：回收过期租约、领取 queued 任务、执行注入式备份器、更新 succeeded 或 queued/failed 状态。本方案将单轮函数包装成一个可常驻运行的调度器，并规定进程接收 `SIGTERM`/`SIGINT` 后如何停止领取新任务、等待当前任务、释放资源和在超时后退出。

本方案不启动常驻进程、不连接生产数据库、不执行生产备份，也不包含生产发布操作。实际部署前，统筹/发布 Agent 必须审查运行平台、服务身份、备份存储权限、恢复演练和迁移执行顺序。

> `admin.backups.schedules.runNow` 创建的是 `queued` 记录。守护循环只能领取已授权的队列任务；它不能接受浏览器传入的数据库连接串、COS 凭据、存储路径或任意 shell 参数。

## 2. 运行方式与边界

常驻 worker 可部署为一个受控的单实例后台服务，也可由托管 cron 周期唤起单轮 worker。两种方式都必须复用数据库租约和状态机，不能依赖进程内存防止重复。

| 方式 | 适用场景 | 优点 | 限制 |
|---|---|---|---|
| 托管定时唤起 | 备份耗时短、每轮任务少、平台有可靠 cron | 无常驻进程，运维简单 | 单次执行受平台超时限制；无法保持长任务上下文 |
| 单实例常驻循环 | 备份耗时较长、需要稳定扫描和健康状态 | 调度延迟低，优雅退出和租约续期更直接 | 需要自动重启、单实例锁、心跳和资源监控 |

如果采用常驻模式，单实例只控制领取并发，不能把数据库状态锁替换为进程内锁。进程重启、重复部署或节点故障都必须由数据库条件更新保证安全。

## 3. 建议运行参数

所有参数应来自服务端运行配置或平台密钥管理，不得来自浏览器。默认值应保守，并在启动时只输出参数名称和非敏感数值，不输出环境变量原文、连接串或凭据。

| 参数 | 默认值 | 约束 | 说明 |
|---|---:|---|---|
| `WORKER_ID` | 自动生成短 UUID | 1–80 字符 | 用于租约和运行审计，不能包含密钥 |
| `POLL_INTERVAL_MS` | 30,000 | 5,000–300,000 | 无任务时的扫描间隔 |
| `BATCH_SIZE` | 1 | 1–2 | 默认单实例串行，演练后才可提高 |
| `LEASE_MS` | 900,000 | 至少为单任务超时的 2 倍 | 领取任务的租约时长 |
| `TASK_TIMEOUT_MS` | 600,000 | 小于租约时长 | 单个执行器的硬超时 |
| `SHUTDOWN_TIMEOUT_MS` | 120,000 | 30,000–600,000 | 优雅退出等待上限 |
| `MAX_ATTEMPTS` | 5 | 1–10 | 临时错误最大尝试次数 |
| `MAX_IDLE_POLLS` | 无 | 不限制 | 进程默认持续运行 |

`TASK_TIMEOUT_MS` 必须小于 `LEASE_MS`，为清理和状态更新留出余量。如果实际备份无法在租约内完成，应先实现租约续期，再增加任务超时；不能仅延长进程等待时间。

## 4. 守护循环状态机

进程状态建议使用 `starting`、`running`、`draining`、`stopped` 和 `failed` 五个内存状态。数据库任务状态继续使用 `queued`、`running`、`succeeded`、`failed` 和 `cancelled`。

| 进程状态 | 是否领取新任务 | 允许动作 |
|---|---:|---|
| `starting` | 否 | 校验配置、建立数据库连接、注册信号和健康状态 |
| `running` | 是 | 回收租约、扫描并领取任务、执行有限批次、记录指标 |
| `draining` | 否 | 等待当前任务完成或失败，拒绝新任务，继续必要的租约更新 |
| `stopped` | 否 | 关闭数据库池、关闭指标输出并退出 0 |
| `failed` | 否 | 记录脱敏启动/运行错误，非正常退出并交给平台重启 |

主循环的关键顺序是：先回收过期 `running` 任务，再领取到期的 `queued` 任务；没有任务时等待下一轮；收到退出信号后立即进入 `draining`，不再执行下一次领取；当前任务完成后关闭资源并退出。

## 5. TypeScript 结构与核心代码

建议新增 `server/backup-worker-daemon.ts`。它只负责生命周期和调度，不实现数据库导出或 COS 上传。真实执行器以依赖注入方式提供，这样 dry-run、测试环境和生产执行器可以分离。

```ts
import {
  runBackupWorkerOnce,
  type BackupExecutor,
  DEFAULT_LEASE_MS,
  DEFAULT_MAX_ATTEMPTS,
} from "./backup-worker";

export type WorkerState = "starting" | "running" | "draining" | "stopped" | "failed";

export type DaemonOptions = {
  workerId: string;
  pollIntervalMs: number;
  leaseMs: number;
  taskTimeoutMs: number;
  shutdownTimeoutMs: number;
  maxAttempts: number;
  execute: BackupExecutor;
  sleep?: (ms: number) => Promise<void>;
  onState?: (state: WorkerState) => void;
  onMetric?: (key: string, value: number) => void;
};

export class BackupWorkerDaemon {
  private state: WorkerState = "starting";
  private stopping = false;
  private currentTask: Promise<unknown> | null = null;
  private loopPromise: Promise<void> | null = null;
  private shutdownPromise: Promise<void> | null = null;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: DaemonOptions) {
    this.sleep = options.sleep ?? ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  }

  getState() { return this.state; }

  start() {
    if (this.loopPromise) return this.loopPromise;
    this.setState("running");
    this.loopPromise = this.loop();
    return this.loopPromise;
  }

  requestShutdown(reason: "SIGTERM" | "SIGINT" | "manual" = "manual") {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.stopping = true;
    this.setState("draining");
    this.options.onMetric?.("worker.shutdown_requested", 1);
    this.shutdownPromise = this.drain(reason);
    return this.shutdownPromise;
  }

  private async loop() {
    try {
      while (!this.stopping) {
        const startedAt = Date.now();
        this.currentTask = runBackupWorkerOnce({
          workerId: this.options.workerId,
          execute: (run) => this.withTimeout(this.options.execute(run), this.options.taskTimeoutMs),
          leaseMs: this.options.leaseMs,
          maxAttempts: this.options.maxAttempts,
        });
        const result = await this.currentTask;
        this.currentTask = null;
        this.options.onMetric?.("worker.poll.duration_ms", Date.now() - startedAt);
        this.options.onMetric?.(`worker.poll.${result.status}`, 1);
        if (!this.stopping && result.status === "idle") await this.sleep(this.options.pollIntervalMs);
      }
    } catch (error) {
      this.currentTask = null;
      this.setState("failed");
      throw error;
    }
  }

  private async drain(reason: string) {
    if (this.currentTask) {
      await Promise.race([
        this.currentTask.catch(() => undefined),
        this.sleep(this.options.shutdownTimeoutMs),
      ]);
    }
    this.setState("stopped");
    this.options.onMetric?.(`worker.shutdown.${reason}`, 1);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("backup task timeout")), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private setState(state: WorkerState) {
    this.state = state;
    this.options.onState?.(state);
  }
}
```

上述代码的关键点是 `stopping` 在领取循环之前检查，`requestShutdown` 幂等，`currentTask` 只引用当前单轮任务，任务超时会进入既有失败分类和重试流程，且退出时不会把未完成任务标记为成功。实际实现还需为 `runBackupWorkerOnce` 传入固定的 `now` 或时钟抽象，以便测试时间边界。

## 6. 信号注册与退出顺序

入口文件应只注册一次信号处理器。第一次 `SIGTERM` 或 `SIGINT` 进入排空流程；第二次信号不再等待，直接退出非零，让平台按失败重启并依赖租约恢复。退出流程不能调用 `process.exit(0)` 立即打断当前 Promise。

```ts
const daemon = new BackupWorkerDaemon(options);
let shutdownStarted = false;

const handleSignal = (signal: "SIGTERM" | "SIGINT") => {
  if (shutdownStarted) {
    process.exitCode = 1;
    return;
  }
  shutdownStarted = true;
  void daemon.requestShutdown(signal)
    .then(() => { process.exitCode = 0; })
    .catch(() => { process.exitCode = 1; });
};

process.once("SIGTERM", () => handleSignal("SIGTERM"));
process.once("SIGINT", () => handleSignal("SIGINT"));

void daemon.start().catch(() => {
  process.exitCode = 1;
});
```

在真实实现中，第二次信号应由一个有限计时器或同步退出兜底处理，但必须先把当前任务留在 `running` 并等待租约过期回收，不能伪造为成功。服务管理器的 `stop timeout` 应略大于 `SHUTDOWN_TIMEOUT_MS`，以给 worker 完成数据库状态写入留出时间。

## 7. 任务超时、租约和中断处理

备份执行器必须区分“取消等待”和“取消实际备份”。如果底层数据库导出或对象上传支持 `AbortSignal`，worker 应在任务超时和排空超时后传递 abort；如果不支持，worker 只能停止等待，不能把仍在后台运行的任务当作已完成。此时租约自然过期后由下一轮回收，产物由幂等键和临时对象清理流程处理。

任务完成和失败更新继续使用：

```text
WHERE id = runId AND status = 'running' AND workerId = currentWorkerId
```

这样即使旧 worker 在租约失效后返回，也不能覆盖新 worker 的状态。成功更新必须发生在产物校验完成之后；超时和中断必须走失败分类，不得直接写 `succeeded`。

建议在任务执行期间每 30–60 秒续租一次，条件为 `status='running' AND workerId=currentWorkerId`。如果续租失败，执行器应尽快停止并返回租约失效错误；不应继续上传或提交成功结果。

## 8. 健康、性能和运维指标

守护进程应维护进程级内存指标，并按固定 key 写入现有 `system_metric_samples`。指标样本不能包含错误原文、SQL、存储 URL、Token 或用户数据。

| 指标 | 含义 |
|---|---|
| `worker.heartbeat_age_seconds` | 距最后成功轮询的秒数 |
| `worker.poll.duration_ms` | 一轮调度耗时 |
| `worker.poll.idle` | 本轮无可领取任务 |
| `worker.poll.succeeded` | 本轮任务成功 |
| `worker.poll.queued` | 本轮任务失败后重新排队 |
| `worker.poll.failed` | 本轮任务达到上限或永久失败 |
| `worker.task.timeout` | 任务超时次数 |
| `worker.lease.expired` | 租约回收次数 |
| `worker.shutdown_requested` | 收到退出信号次数 |

健康接口只显示 `running/draining/stopped/failed`、最后心跳时间、当前队列数量、运行数量、最后成功时间和脱敏错误分类。它不能显示进程环境、数据库连接信息、主机文件路径或 worker 认证材料。

## 9. 部署和自动重启要求

常驻服务必须由平台托管重启，并把退出码、健康状态和租约状态纳入监控。部署滚动更新时，应先发送 `SIGTERM`，等待排空窗口，再启动新实例；在过渡窗口内允许两个实例短暂存在，但只能由数据库条件更新决定谁取得任务。

发布配置必须至少包含：最小权限 worker 身份、私有备份前缀、数据库备份权限、对象存储写权限、网络出口限制、日志脱敏、健康探针和资源上限。所有凭据必须通过服务端运行时密钥管理注入，禁止写入 schema、迁移、Git、管理页面或日志。

在生产开启前，应先在隔离环境完成一次完整成功备份、一次存储超时重试、一次权限错误不重试、一次 worker 强制终止后的租约恢复，以及一次优雅退出中任务完成演练。恢复演练必须写入隔离数据库，不能覆盖生产数据库。

## 10. 验收标准

| 验收项 | 通过标准 |
|---|---|
| 常驻循环 | 无任务时按轮询间隔运行，不忙等，不创建无界 Promise |
| 并发 | 单实例按配置限制并发；多实例由数据库租约防重复 |
| 优雅退出 | 第一次 SIGTERM/SIGINT 停止领取新任务并等待当前任务 |
| 强制退出 | 第二次信号或超时非零退出，遗留 running 任务可由租约回收 |
| 租约安全 | 旧 worker 不能覆盖新 worker 的状态；续租失败不能提交成功 |
| 重试 | 任务超时进入可重试分类；权限/配置错误不自动重试 |
| 幂等 | 同一计划窗口和幂等键不产生重复正式产物 |
| 脱敏 | 日志、审计、指标、健康响应不含 Token、密钥、连接串、签名 URL |
| 资源 | 任务超时、内存、队列深度和退出状态有指标和告警 |
| 回归 | `pnpm check`、`pnpm test`、`pnpm build` 通过；既有 COS 环境依赖失败单独记录 |

## 11. 当前交付边界

本方案对应的下一步代码拆分建议为：先实现纯函数时间源、守护循环和信号处理测试；再实现租约续期；随后加入 dry-run 执行器；最后才接入隔离环境的真实数据库快照和私有对象存储。当前分支中的 `runBackupWorkerOnce` 是单轮核心，尚未绑定常驻循环、真实备份执行器或生产调度平台。

任何生产部署、数据库迁移、真实备份、产物清理和恢复操作，都必须由统筹/发布 Agent 另行授权并完成交叉审查。

## References

[1]: https://github.com/kimfatman/3dqcostbook/blob/agent/backend/admin-maintenance-backend/server/backup-worker.ts "P3 备份 worker 单轮状态机实现"

[2]: https://github.com/kimfatman/3dqcostbook/blob/agent/backend/admin-maintenance-backend/drizzle/0010_kind_sentinel.sql "P3 backup_runs 状态机字段迁移"

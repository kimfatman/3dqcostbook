# 算得清 · 皮肤中心设计方案与统一皮肤标准
**日期：** 2026-08-31 ｜ **状态：** 方案设计 ｜ **适用：** 3dqcostbook 全端
**目标：** 建立统一的皮肤管理中心，标准化皮肤定义，支持皮肤切换/预览/自定义/扩展

---

## 一、当前皮肤机制诊断

### 已有基础（好的部分）
1. **三层令牌架构**已建立：`sd-design-tokens.css`
   - 层一：原色阶原语（品牌蓝 11 阶 / 中性灰 11 阶 / 语义色 mini 阶）
   - 层二：语义令牌（`--sdq-*`，页面消费，指向层一）
   - 层三：Tailwind v4 @theme 桥
2. **三种皮肤已定义**：
   - `soft`（清蓝，默认浅色）：`:root` 定义
   - `deep`（深蓝，深色模式）：`.mobile-shell.skin-deep` 重定义语义令牌
   - `aurora`（极光，有限场景增强）：只改背景材质，不改语义色
3. **持久化机制**：`workspace.visualSkin` 随账本状态存储
4. **切换函数**：`updateVisualSkin(skin)` 已实现

### 当前问题（需要解决）
| # | 问题 | 影响 |
|---|---|---|
| 1 | 皮肤定义集中在 `sd-design-tokens.css` 一个文件 | 新增皮肤需改核心文件，易冲突 |
| 2 | 无皮肤中心页面（`appearance` subPage 未实现或极简） | 用户无法直观选择/预览皮肤 |
| 3 | 皮肤切换的 class 应用逻辑不透明 | 切换后可能部分组件未生效 |
| 4 | 仅 3 种皮肤，aurora 功能受限 | 无法满足多行业/多品牌需求 |
| 5 | 硬编码颜色仍存在于 `index.css`（如 `#087ff5`、`#eaf5ff`） | 换皮肤后这些颜色不变，视觉断裂 |
| 6 | 无皮肤预览/自定义/导入导出 | 无法快速验证皮肤效果 |
| 7 | 深色模式令牌不完整（部分组件仍用硬编码色） | deep 皮肤下部分区域显示异常 |

---

## 二、皮肤中心架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    皮肤中心（Skin Center）                 │
├─────────────────────────────────────────────────────────┤
│  皮肤注册表  │  皮肤列表页  │  皮肤预览  │  皮肤编辑器    │
│  skins/index │  我的-皮肤   │  实时预览  │  自定义令牌    │
├─────────────────────────────────────────────────────────┤
│                    皮肤定义层（Skins）                     │
│  skins/soft.css  skins/deep.css  skins/aurora.css       │
│  skins/midnight.css  skins/forest.css  skins/custom.css  │
├─────────────────────────────────────────────────────────┤
│                  设计令牌层（Design Tokens）                │
│  tokens/primitives.css（原色阶，皮肤不可改）                │
│  tokens/semantic.css（语义令牌，皮肤重定义）                │
│  tokens/tailwind-bridge.css（Tailwind 桥）                 │
├─────────────────────────────────────────────────────────┤
│                    组件层（Components）                     │
│  所有组件只消费语义令牌 --sdq-*，禁止硬编码颜色             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 文件结构

```
client/src/
├── skins/                          # 皮肤定义目录（新增）
│   ├── index.ts                    # 皮肤注册表（元数据+默认皮肤）
│   ├── soft.css                    # 清蓝（默认浅色）
│   ├── deep.css                    # 深蓝（深色模式）
│   ├── aurora.css                  # 极光（玻璃拟态）
│   ├── midnight.css                # 午夜黑（纯黑深色，新增）
│   ├── forest.css                  # 森林绿（品牌色替换，新增）
│   └── custom.css                  # 用户自定义皮肤（运行时生成）
├── tokens/                         # 设计令牌目录（从 sd-design-tokens.css 拆分）
│   ├── primitives.css              # 原色阶原语（所有皮肤共享，不可改）
│   ├── semantic.css                # 语义令牌默认值（soft 皮肤）
│   └── tailwind-bridge.css         # Tailwind v4 @theme 桥
├── components/
│   └── skin-center/                # 皮肤中心组件（新增）
│       ├── SkinCard.tsx            # 皮肤卡片（预览+名称+应用按钮）
│       ├── SkinPreview.tsx         # 皮肤实时预览（迷你工作台）
│       ├── SkinEditor.tsx          # 皮肤编辑器（修改关键令牌）
│       └── ColorPicker.tsx         # 颜色选择器
└── pages/
    └── SkinCenter.tsx              # 皮肤中心页面（新增，替换 appearance）
```

### 2.3 皮肤注册表（skins/index.ts）

```typescript
export type SkinMode = "light" | "dark";
export type SkinId = "soft" | "deep" | "aurora" | "midnight" | "forest" | "custom";

export interface SkinMeta {
  id: SkinId;
  name: string;           // 显示名称，如"清蓝"
  description: string;    // 一句话描述
  mode: SkinMode;         // light / dark
  author: string;         // "官方" / 用户名
  previewColors: {        // 预览用的 4 个关键色
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
  isCustom?: boolean;     // 是否用户自定义
  createdAt?: string;
}

export const SKIN_REGISTRY: SkinMeta[] = [
  {
    id: "soft",
    name: "清蓝",
    description: "默认浅色主题，清爽专业，适合日常经营",
    mode: "light",
    author: "官方",
    previewColors: { primary: "#0880f7", background: "#f5f7fa", surface: "#ffffff", text: "#212830" },
  },
  {
    id: "deep",
    name: "深蓝",
    description: "深色模式，护眼低亮度，适合夜间使用",
    mode: "dark",
    author: "官方",
    previewColors: { primary: "#439ef9", background: "#14191f", surface: "#151f31", text: "#f5f7fa" },
  },
  {
    id: "aurora",
    name: "极光",
    description: "玻璃拟态材质，半透明卡片，视觉轻盈",
    mode: "light",
    author: "官方",
    previewColors: { primary: "#0880f7", background: "#f7f9fc", surface: "rgba(255,255,255,0.94)", text: "#212830" },
  },
  {
    id: "midnight",
    name: "午夜黑",
    description: "纯黑深色模式，OLED 屏省电，对比度最高",
    mode: "dark",
    author: "官方",
    previewColors: { primary: "#439ef9", background: "#000000", surface: "#111111", text: "#f5f7fa" },
  },
  {
    id: "forest",
    name: "森林绿",
    description: "绿色品牌主题，适合生鲜/农业/环保行业",
    mode: "light",
    author: "官方",
    previewColors: { primary: "#20a779", background: "#f5f7fa", surface: "#ffffff", text: "#212830" },
  },
];

export const DEFAULT_SKIN: SkinId = "soft";
```

### 2.4 皮肤定义文件规范（skins/soft.css）

每个皮肤文件**只重定义语义令牌**，不碰原色阶：

```css
/* ============================================================
 * 皮肤：清蓝（soft）
 * 模式：浅色
 * 作者：官方
 * 描述：默认浅色主题
 * 规则：只重定义 --sdq-* 语义令牌，禁止定义原色阶 --sdq-blue-*
 * ============================================================ */

.mobile-shell.skin-soft {
  color-scheme: light;

  /* 背景 */
  --sdq-bg-canvas: var(--sdq-neutral-50);
  --sdq-bg-surface: #ffffff;
  --sdq-bg-surface-subtle: #f2f7ff;
  --sdq-bg-elevated: #ffffff;
  --sdq-bg-brand: var(--sdq-blue-500);
  --sdq-bg-brand-soft: #e6f1ff;

  /* 语义背景 */
  --sdq-bg-warning-soft: #fff4e1;
  --sdq-bg-success-soft: #e8f8f2;
  --sdq-bg-danger-soft: #fdedec;

  /* 文字 */
  --sdq-text-primary: var(--sdq-neutral-900);
  --sdq-text-secondary: var(--sdq-neutral-600);
  --sdq-text-tertiary: var(--sdq-neutral-400);
  --sdq-text-on-brand: #ffffff;

  /* 边框 */
  --sdq-border-subtle: var(--sdq-neutral-100);
  --sdq-border-strong: var(--sdq-neutral-300);

  /* 阴影 */
  --sdq-shadow-card: 0 4px 16px rgba(20, 50, 90, 0.08);
  --sdq-overlay-scrim: rgba(18, 31, 53, 0.42);

  /* 操作 */
  --sdq-action-primary: var(--sdq-blue-500);
  --sdq-action-primary-pressed: var(--sdq-blue-600);

  /* 业务语义色 */
  --sdq-income: var(--sdq-blue-500);
  --sdq-cost: var(--sdq-warning-500);
  --sdq-profit: var(--sdq-success-500);
  --sdq-risk: var(--sdq-danger-500);
  --sdq-info: var(--sdq-info-500);

  /* 图标 */
  --sdq-icon-default: var(--sdq-neutral-400);
  --sdq-icon-disabled: var(--sdq-neutral-200);

  /* 圆角 */
  --sdq-radius-xs: 6px;
  --sdq-radius-sm: 8px;
  --sdq-radius-md: 12px;
  --sdq-radius-lg: 16px;
  --sdq-radius-xl: 20px;

  /* 间距 */
  --sdq-space-xs: 4px;
  --sdq-space-sm: 8px;
  --sdq-space-md: 12px;
  --sdq-space-lg: 16px;
  --sdq-space-xl: 24px;

  /* 字体 */
  --sdq-font-sans: "Noto Sans SC", system-ui, sans-serif;
  --sdq-font-mono: "IBM Plex Mono", monospace;
  --sdq-font-size-xs: 11px;
  --sdq-font-size-sm: 12px;
  --sdq-font-size-base: 14px;
  --sdq-font-size-lg: 16px;
  --sdq-font-size-xl: 20px;
  --sdq-font-size-2xl: 28px;
}
```

### 2.5 皮肤切换机制

**当前问题**：皮肤 class 应用逻辑不透明。

**改进方案**：
1. 在 `DashboardLayout.tsx` 或根组件中，根据 `visualSkin` 动态应用 `skin-{id}` class 到 `.mobile-shell`
2. 切换时用 CSS transition 平滑过渡（200ms opacity）
3. 切换后持久化到 `workspace.visualSkin`

```tsx
// DashboardLayout.tsx 或 App.tsx
const { visualSkin, updateVisualSkin } = useCostBook();

return (
  <div className={`mobile-shell skin-${visualSkin}`}>
    {/* 应用内容 */}
  </div>
);
```

---

## 三、统一皮肤标准（Skin Standard）

### 3.1 令牌命名规范

所有皮肤必须使用统一的语义令牌命名，禁止组件直接消费原色阶：

| 类别 | 令牌前缀 | 示例 |
|---|---|---|
| 背景 | `--sdq-bg-*` | `--sdq-bg-canvas` / `--sdq-bg-surface` / `--sdq-bg-brand` |
| 文字 | `--sdq-text-*` | `--sdq-text-primary` / `--sdq-text-secondary` |
| 边框 | `--sdq-border-*` | `--sdq-border-subtle` / `--sdq-border-strong` |
| 阴影 | `--sdq-shadow-*` | `--sdq-shadow-card` / `--sdq-overlay-scrim` |
| 操作 | `--sdq-action-*` | `--sdq-action-primary` / `--sdq-action-primary-pressed` |
| 业务色 | `--sdq-income/cost/profit/risk/info` | `--sdq-profit` |
| 图标 | `--sdq-icon-*` | `--sdq-icon-default` |
| 圆角 | `--sdq-radius-*` | `--sdq-radius-sm` / `--sdq-radius-md` |
| 间距 | `--sdq-space-*` | `--sdq-space-md` / `--sdq-space-lg` |
| 字体 | `--sdq-font-*` | `--sdq-font-sans` / `--sdq-font-size-base` |

**禁止**：组件中出现 `#087ff5`、`#eaf5ff`、`rgb(...)` 等硬编码颜色，必须用 `var(--sdq-*)`。

### 3.2 双轨令牌要求（浅色/深色）

每个皮肤必须定义完整的语义令牌集，浅色和深色各自一套：

| 令牌 | 浅色（soft） | 深色（deep） | 对比度要求 |
|---|---|---|---|
| `--sdq-text-primary` | `#212830` | `#f5f7fa` | 与 bg-canvas ≥ 7:1 |
| `--sdq-text-secondary` | `#576575` | `#bcc6d2` | 与 bg-canvas ≥ 4.5:1 |
| `--sdq-text-tertiary` | `#8f9dae` | `#8f9dae` | 与 bg-canvas ≥ 3:1 |
| `--sdq-bg-canvas` | `#f5f7fa` | `#14191f` | — |
| `--sdq-bg-surface` | `#ffffff` | `#151f31` | 与 bg-canvas 可区分 |
| `--sdq-action-primary` | `#0880f7` | `#439ef9` | 与 bg-surface ≥ 4.5:1 |
| `--sdq-profit` | `#20a779` | `#20a779` | 与 bg-surface ≥ 4.5:1 |
| `--sdq-risk` | `#e8534f` | `#e8534f` | 与 bg-surface ≥ 4.5:1 |

**验证工具**：每个皮肤提交前必须通过对比度自动检查（可用 `contrast-check` 脚本或 axe-core）。

### 3.3 皮肤完整性检查清单

每个皮肤必须满足：

- [ ] 定义了全部 **40+ 语义令牌**（背景/文字/边框/阴影/操作/业务色/图标/圆角/间距/字体）
- [ ] 原色阶**未被修改**（只重定义语义令牌）
- [ ] 文字与背景对比度 **≥ 4.5:1**（正文）/ **≥ 3:1**（非文本）
- [ ] 业务语义色（profit/risk/warning/info）在浅色和深色下均**可辨识**
- [ ] 组件在该皮肤下**无硬编码颜色残留**（grep `#[0-9a-fA-F]{3,6}` 检查组件文件）
- [ ] 皮肤预览图正常生成
- [ ] 切换皮肤后**无布局跳动**（令牌值变化不影响布局尺寸）

### 3.4 业务语义色保护规则

**重要**：以下业务语义色**不允许皮肤修改**（保持全局一致，确保用户在任何皮肤下都能正确识别财务含义）：

| 语义 | 颜色 | 含义 | 保护原因 |
|---|---|---|---|
| `--sdq-profit` | `#20a779`（绿） | 利润/收入/正向 | 财务红绿约定，改了会误导 |
| `--sdq-cost` | `#f6a623`（橙） | 成本/支出 | 成本警示色 |
| `--sdq-risk` | `#e8534f`（红） | 风险/亏损/危险 | 危险信号 |
| `--sdq-info` | `#5acbfa`（浅蓝） | 信息/提示 | 信息色 |

**皮肤可修改**：品牌主色（`--sdq-action-primary` / `--sdq-bg-brand`）、背景色、文字色、边框色、圆角、间距、字体。

---

## 四、皮肤中心页面设计

### 4.1 页面位置

替换现有的 `appearance`（外观设置）subPage，路径：**我的 → 皮肤中心**

### 4.2 页面布局

```
┌─────────────────────────────────────────┐
│  ← 皮肤中心                              │
│  统一管理应用外观，选择适合你的视觉风格     │
├─────────────────────────────────────────┤
│  [预览区]                                │
│  ┌─────────────────────────────────────┐│
│  │  迷你工作台预览（实时应用当前皮肤）     ││
│  │  [经营概览卡] [订单数] [毛利率]       ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  官方皮肤                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │清蓝 ✓│ │ 深蓝 │ │ 极光 │ │午夜黑│ │
│  │预览色│ │预览色│ │预览色│ │预览色│ │
│  │已应用│ │ 应用 │ │ 应用 │ │ 应用 │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│  ┌──────┐                               │
│  │森林绿│                               │
│  │预览色│                               │
│  │ 应用 │                               │
│  └──────┘                               │
├─────────────────────────────────────────┤
│  我的自定义皮肤                          │
│  ┌──────┐                               │
│  │我的蓝│  [编辑] [删除]                │
│  │预览色│  [应用]                       │
│  └──────┘                               │
│  [+ 创建自定义皮肤]                      │
├─────────────────────────────────────────┤
│  高级设置                                │
│  ○ 跟随系统（浅色/深色自动切换）          │
│  ○ 降低动效（减少动画，提升性能）         │
│  ○ 大字体模式（字号 +2px）              │
└─────────────────────────────────────────┘
```

### 4.3 皮肤卡片（SkinCard）

每个皮肤卡片包含：
- **预览条**：4 个颜色方块（primary/background/surface/text），直观展示皮肤配色
- **名称**：如"清蓝"
- **描述**：一句话
- **模式标签**：浅色/深色（小徽章）
- **应用按钮**：未应用时显示"应用"，已应用时显示"已应用 ✓"（禁用态）
- **操作菜单**（自定义皮肤）：编辑 / 复制 / 导出 / 删除

### 4.4 皮肤实时预览（SkinPreview）

在页面顶部展示一个**迷你工作台预览**，实时应用当前选中的皮肤（未应用时也能预览效果）：

- 迷你经营概览卡（大数字+趋势）
- 迷你订单数据卡（3 个指标）
- 迷你商品卡片（1 个）
- 底部 Tab 栏（5 个图标）

预览用 CSS `transform: scale(0.8)` 缩小，不影响实际应用。

### 4.5 皮肤编辑器（SkinEditor）

点击"创建自定义皮肤"或"编辑"后打开：

```
┌─────────────────────────────────────────┐
│  自定义皮肤编辑器                          │
├─────────────────────────────────────────┤
│  基础信息                                │
│  名称：[我的蓝        ]                  │
│  描述：[                    ]            │
│  基于：[清蓝 ▼]（选择基础皮肤）           │
├─────────────────────────────────────────┤
│  关键颜色（点击色块修改）                 │
│  品牌主色  [■ #0880f7]                  │
│  背景色    [■ #f5f7fa]                  │
│  卡片背景  [■ #ffffff]                  │
│  主文字    [■ #212830]                  │
│  次文字    [■ #576575]                  │
│  边框色    [■ #ebf0f4]                  │
├─────────────────────────────────────────┤
│  圆角与间距                              │
│  卡片圆角  [12px] [滑块]                │
│  基础间距  [12px] [滑块]                │
├─────────────────────────────────────────┤
│  [实时预览]  [保存]  [取消]              │
└─────────────────────────────────────────┘
```

编辑器只暴露**关键令牌**（约 10-15 个），不暴露全部 40+ 令牌，降低使用门槛。高级用户可以导出 CSS 手动编辑。

### 4.6 自定义皮肤持久化

自定义皮肤存储在 `localStorage`（不随账本同步，因为是个人偏好）：

```typescript
// localStorage key: sdq-custom-skins
interface CustomSkin {
  id: string;           // "custom-xxx"
  name: string;
  description: string;
  baseSkin: SkinId;     // 基于哪个官方皮肤
  overrides: Record<string, string>;  // 覆盖的令牌 { "--sdq-action-primary": "#ff0000" }
  createdAt: string;
}
```

应用自定义皮肤时，先加载基础皮肤 CSS，再用 `CSSStyleDeclaration.setProperty()` 动态应用覆盖的令牌。

---

## 五、迁移路径（从当前机制到皮肤中心）

### 阶段 1：令牌收敛（1-2 天）
**目标**：消除硬编码颜色，所有组件消费语义令牌

1. 全局扫描 `client/src` 中的硬编码颜色（`#[0-9a-fA-F]{3,6}`、`rgb(`、`rgba(`）
2. 逐个替换为 `var(--sdq-*)` 语义令牌
3. 新增缺失的语义令牌（如 `--sdq-radius-*`、`--sdq-space-*`、`--sdq-font-*`）
4. 验证：grep 组件文件无硬编码颜色

### 阶段 2：皮肤定义拆分（1 天）
**目标**：把 `sd-design-tokens.css` 中的皮肤定义拆到独立文件

1. 创建 `client/src/tokens/` 目录：
   - `primitives.css`：原色阶（从 sd-design-tokens.css 层一提取）
   - `semantic.css`：语义令牌默认值（soft 皮肤，从层二提取）
   - `tailwind-bridge.css`：Tailwind 桥（从层三提取）
2. 创建 `client/src/skins/` 目录：
   - `soft.css`：从 `:root` 语义令牌提取
   - `deep.css`：从 `.mobile-shell.skin-deep` 提取
   - `aurora.css`：从 `.mobile-shell.skin-aurora` 提取
3. `sd-design-tokens.css` 改为只 `@import` 以上文件（保持向后兼容）
4. 验证：三种皮肤切换效果与拆分前一致

### 阶段 3：皮肤注册表与切换机制（1 天）
**目标**：建立皮肤注册表，统一切换逻辑

1. 创建 `skins/index.ts`（皮肤注册表，含 5 种官方皮肤元数据）
2. 在根组件统一应用 `skin-{id}` class（替换当前分散的切换逻辑）
3. 切换时增加 200ms 过渡动画
4. 新增 `midnight`（午夜黑）和 `forest`（森林绿）皮肤定义
5. 验证：5 种皮肤切换正常，持久化正常

### 阶段 4：皮肤中心页面（2-3 天）
**目标**：实现皮肤中心 UI，替换 appearance 页面

1. 创建 `SkinCenter.tsx` 页面（我的 → 皮肤中心）
2. 创建 `SkinCard.tsx`（皮肤卡片）
3. 创建 `SkinPreview.tsx`（实时预览）
4. 创建 `SkinEditor.tsx`（自定义皮肤编辑器）
5. 创建 `ColorPicker.tsx`（颜色选择器）
6. 实现自定义皮肤的 localStorage 持久化
7. 实现皮肤导入/导出（JSON 格式）
8. 验证：皮肤选择/预览/自定义/持久化全流程正常

### 阶段 5：深色模式完善与对比度验证（1-2 天）
**目标**：确保所有皮肤在浅色/深色下均达标

1. 完善 deep/midnight 深色皮肤的令牌（补全缺失的语义令牌）
2. 全局对比度检查（axe-core 或自定义脚本）
3. 修复对比度不达标项
4. 业务语义色在深色下的可辨识性验证
5. 验证：WCAG AA 标准（正文 ≥4.5:1，非文本 ≥3:1）

### 总工作量：6-10 人天

---

## 六、皮肤扩展规范（如何新增官方皮肤）

1. **复制模板**：复制 `skins/soft.css` 为 `skins/{name}.css`
2. **修改语义令牌**：只改 `--sdq-*` 值，不改原色阶
3. **保护业务色**：`--sdq-profit/cost/risk/info` 保持不变
4. **注册元数据**：在 `skins/index.ts` 的 `SKIN_REGISTRY` 中添加条目
5. **对比度验证**：运行对比度检查脚本
6. **预览图生成**：在皮肤中心截图预览
7. **提交 PR**：标题 `feat(skin): 新增 {name} 皮肤`

---

## 七、验收标准

皮肤中心完成后必须满足：

1. **统一标准**：所有组件只消费 `--sdq-*` 语义令牌，无硬编码颜色
2. **皮肤完整**：5 种官方皮肤（soft/deep/aurora/midnight/forest）全部可用
3. **切换流畅**：皮肤切换有 200ms 过渡，无布局跳动
4. **持久化**：皮肤选择随账本状态持久化，自定义皮肤存 localStorage
5. **预览实时**：皮肤中心可实时预览未应用的皮肤
6. **自定义可用**：用户可基于官方皮肤创建自定义皮肤，修改关键颜色/圆角/间距
7. **对比度达标**：所有皮肤通过 WCAG AA 对比度检查
8. **业务色保护**：利润/成本/风险/信息色在所有皮肤下保持一致可辨识
9. **导入导出**：自定义皮肤可导出为 JSON，也可从 JSON 导入
10. **三门禁全绿**：`pnpm check && pnpm test && pnpm build` 通过

## References
- 当前令牌文件：`client/src/sd-design-tokens.css`
- 当前皮肤类型：`client/src/lib/cost-book.ts`（VisualSkin = "aurora" | "soft" | "deep"）
- 设计系统基线：`design-system/DESIGN.md`
- 全局 UI 方案：`docs/ui-ux-optimization-solution-2026-08-31.md`

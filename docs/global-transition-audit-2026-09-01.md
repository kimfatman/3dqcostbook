# 全局过渡与动效审查报告

**日期：** 2026-09-01 ｜ **审查范围：** 全部界面的过渡动画、入场动画、交互反馈、页面切换、折叠展开、数据更新
**审查标准：** Apple Design（可中断性/弹簧物理/速度传递/空间一致性/橡胶带边界）+ ui-ux-pro-max（Animation Priority 7）
**前置文档：** `docs/logo-integration-transition-2026-09-01.md`（Logo 区融入过渡）

---

## 一、当前过渡/动效现状总览

### 1.1 数量统计

| 类型 | 数量 | 占比 |
|---|---|---|
| transition（CSS 过渡） | 18 处 | 62% |
| @keyframes（关键帧动画） | 5 个定义 | 17% |
| animation（动画使用） | 6 处 | 21% |
| **合计** | **29 处** | 100% |

### 1.2 现有过渡/动效清单

| # | 位置 | 类型 | 时长 | 缓动 | 内容 |
|---|---|---|---|---|---|
| 1 | 图表卡片 | 入场动画 | 280ms | var(--chart-ease) | opacity + translateY(7px) |
| 2 | 图表折线 | 入场动画 | 720ms | var(--chart-ease) | stroke-dashoffset 描边动画 |
| 3 | 图表柱状 | 入场动画 | 460ms | var(--chart-ease) | opacity + scaleY 从底部生长 |
| 4 | 图表按钮 | 交互过渡 | 160-180ms | var(--chart-ease) | transform + background + color + opacity |
| 5 | 列表按钮 | 交互过渡 | — | — | :active scale(0.98) |
| 6 | FAB 记一笔 | 交互过渡 | 160ms | var(--ease-out) | transform + box-shadow，:active scale(0.97) |
| 7 | 登录按钮 | 交互过渡 | 0.16s | ease | transform + opacity + box-shadow |
| 8 | 登录输入框 | 聚焦过渡 | 0.16s | ease | border-color + box-shadow + background |
| 9 | 促销轮播 | 滑动过渡 | 240-260ms | cubic-bezier(.23,1,.32,1) | transform 横向滑动 |
| 10 | 轮播指示点 | 交互过渡 | 160-180ms | ease-out | width + background |
| 11 | 通知轮播 | 关键帧动画 | 4.9s | cubic-bezier(.23,1,.32,1) | opacity + translateY 轮播 |
| 12 | 加载旋转 | 关键帧动画 | 0.8s | linear | rotate 360deg 无限循环 |
| 13 | 皮肤切换 | 颜色过渡 | 0.2s | ease | background-color + color + border-color |
| 14 | 折叠箭头 | 交互过渡 | 180ms | var(--ease-out) | transform rotate(180deg) |
| 15 | 全局减少动效 | 媒体查询 | — | — | animation/transition duration → .01ms |

### 1.3 好的方面（值得保留）

✅ **图表入场动画完整**：卡片淡入 + 折线描边 + 柱状生长，三种动画配合，有层次感
✅ **减少动效全局适配**：`@media (prefers-reduced-motion: reduce)` 全局禁用，符合无障碍标准
✅ **促销轮播缓动优秀**：`cubic-bezier(.23,1,.32,1)` 是 Apple 风格的 ease-out-expo，自然流畅
✅ **按钮交互反馈统一**：大部分按钮有 :active scale(0.97-0.985)，符合 Apple 直接操作原则
✅ **皮肤切换颜色过渡**：背景/边框/文字色 0.2s 过渡，皮肤切换不突兀

---

## 二、全局性问题（P0）

### 问题 1：页面切换无过渡，Tab/子页面硬切
**严重度：P0**

**当前状态：**
- Tab 切换（工作台/订单/商品/洞察/我的）：无过渡，直接替换内容
- 子页面进入（点击列表项→详情页）：无过渡，直接替换
- 子页面退出（返回）：无过渡，直接替换

**Apple Design 违反：**
- 空间一致性（§7）— "Enter and exit along the same path"，当前进入退出都没有路径
- 可中断性（§3）— 页面切换应该可中断，但当前无动画可中断

**优化方案：**
1. **Tab 切换**：内容区 fade-in + slide-up 8px，200ms ease-out
2. **子页面进入**：从右侧 slide-in + fade-in，250ms cubic-bezier(.23,1,.32,1)
3. **子页面退出**：向右侧 slide-out + fade-out，200ms ease-in（退出比进入快，Apple 规范）
4. **实现方式**：用 CSS transition + key 触发，或用 React 动画库（如 framer-motion）

### 问题 2：列表/卡片入场不统一，只有图表有入场动画
**严重度：P0**

**当前状态：**
- 图表卡片：有入场动画（fade + slide-up，280ms）✅
- 经营概览卡片：无入场动画，直接出现 ❌
- KPI 卡片：无入场动画 ❌
- 列表项：无入场动画 ❌
- 促销轮播：无入场动画 ❌

**问题：**
- 页面加载时，图表卡片有动画，其他卡片直接出现，视觉不统一
- 列表项批量出现时没有 stagger（依次延迟），显得生硬

**Apple Design 违反：**
- 行为优于动画（§4）— 入场动画应该是"对话"而不是"预设脚本"，但当前连预设都没有
- 理解（人类需求第2项）— 统一的入场动画帮助用户理解内容结构

**优化方案：**
1. **所有卡片统一入场动画**：fade-in + slide-up 8px，200ms ease-out
2. **列表项 stagger 入场**：每项延迟 40ms，最多延迟 320ms（8项后不再延迟）
3. **入场顺序**：导航栏 → 问候语 → 经营概览 → 图表 → 列表（从上到下，视觉引导）
4. **实现方式**：用 CSS `animation` + `animation-delay`，或 Intersection Observer 触发

### 问题 3：折叠展开无过渡，display:none/block 硬切
**严重度：P0**

**当前状态：**
- 洞察页"成本与结构复核"折叠：无过渡，直接显示/隐藏
- "行业参考估算"折叠：无过渡
- 健康度评分公式折叠：无过渡
- 记录表单"更多信息"折叠：无过渡
- 结构对比"查看全部"折叠：无过渡

**问题：**
- 折叠内容用 `display: none/block` 或条件渲染切换，没有 height/opacity 过渡
- 用户点击折叠按钮后，内容"突然出现"或"突然消失"，视觉跳跃
- 折叠箭头有 180ms 旋转动画，但内容没有对应动画，不同步

**Apple Design 违反：**
- 可中断性（§3）— 折叠展开应该可中断，但当前无动画
- 空间一致性（§7）— 折叠内容应该从触发源"生长"出来，当前是硬切

**优化方案：**
1. **折叠展开用 grid-template-rows 过渡**：
   ```css
   .collapsible-content {
     display: grid;
     grid-template-rows: 0fr;
     transition: grid-template-rows 0.3s ease;
   }
   .collapsible-content.open {
     grid-template-rows: 1fr;
   }
   .collapsible-content > div {
     overflow: hidden;
   }
   ```
2. **同时加 opacity 过渡**：折叠时 opacity 0 → 1，延迟 50ms
3. **折叠箭头与内容同步**：箭头旋转 180ms，内容展开 300ms，箭头先动内容跟随
4. **可中断**：用 CSS transition 天然可中断，用户快速点击不会跳变

### 问题 4：过渡时长/缓动函数不统一，缺少全局动效令牌
**严重度：P0**

**当前状态：**

| 时长 | 使用次数 | 场景 |
|---|---|---|
| 160ms | 5处 | 按钮/输入框/FAB |
| 180ms | 3处 | 图表按钮/折叠箭头 |
| 200ms | 0处 | — |
| 240ms | 1处 | 促销轮播 |
| 260ms | 1处 | 促销轮播（新版） |
| 280ms | 1处 | 图表卡片入场 |
| 460ms | 1处 | 图表柱状入场 |
| 720ms | 1处 | 图表折线入场 |
| 0.2s(200ms) | 2处 | 皮肤切换 |
| 0.8s | 1处 | 加载旋转 |
| 4.9s | 1处 | 通知轮播 |

| 缓动函数 | 使用次数 | 场景 |
|---|---|---|
| ease | 3处 | 登录/皮肤切换 |
| ease-out | 3处 | FAB/折叠箭头/输入框 |
| cubic-bezier(.23,1,.32,1) | 3处 | 促销轮播/通知轮播 |
| var(--ease-out) | 3处 | 按钮/FAB |
| var(--chart-ease) | 4处 | 图表相关 |
| linear | 1处 | 加载旋转 |

**问题：**
- 11 种不同时长，没有统一规范
- 6 种不同缓动函数，没有统一规范
- 相同类型的过渡（如按钮交互）有 160ms/180ms/0.16s 三种写法
- 缺少全局动效令牌（如 --sdq-duration-fast / --sdq-ease-standard）

**Apple Design 违反：**
- Craft（§16）— "Nothing is random — every spacing, timing, and alignment value is a deliberate choice"，当前时长/缓动是随机的

**优化方案：建立全局动效令牌**

```css
:root {
  /* 时长令牌 */
  --sdq-duration-instant: 80ms;    /* 微交互（hover/高亮） */
  --sdq-duration-fast: 160ms;      /* 按钮/输入框/折叠箭头 */
  --sdq-duration-standard: 220ms;  /* 卡片入场/页面切换 */
  --sdq-duration-slow: 320ms;      /* 折叠展开/大面板 */
  --sdq-duration-entrance: 400ms;  /* 页面入场/大动画 */
  
  /* 缓动令牌 */
  --sdq-ease-standard: cubic-bezier(.23, 1, .32, 1);  /* Apple 标准 ease-out-expo */
  --sdq-ease-in: cubic-bezier(.42, 0, 1, 1);           /* 进入（加速） */
  --sdq-ease-out: cubic-bezier(0, 0, .58, 1);          /* 退出（减速） */
  --sdq-ease-in-out: cubic-bezier(.42, 0, .58, 1);     /* 往返 */
  --sdq-spring-default: cubic-bezier(.34, 1.56, .64, 1); /* 弹簧（轻微过冲） */
}
```

**过渡规范：**
| 过渡类型 | 时长 | 缓动 |
|---|---|---|
| 微交互（hover/高亮） | 80ms | ease-out |
| 按钮/输入框交互 | 160ms | ease-out |
| 卡片入场 | 220ms | standard |
| 页面切换 | 250ms | standard |
| 折叠展开 | 320ms | standard |
| 大面板/模态框 | 400ms | spring-default |

### 问题 5：缺少弹簧物理动画，所有过渡都是线性 CSS transition
**严重度：P1**

**当前状态：**
- 所有过渡都是 CSS `transition`（线性/贝塞尔曲线）
- 没有 spring（弹簧）物理动画
- 按钮 :active 是瞬时 scale，没有弹簧回弹

**Apple Design 违反：**
- 行为优于动画（§4）— "Think of animation as a conversation between you and the object, not something prescribed by the interface"，弹簧是"对话"，CSS transition 是"预设脚本"
- 可中断性（§3）— 弹簧天然可中断，CSS transition 不可中断
- 速度传递（§5）— 弹簧可以继承用户手势速度，CSS transition 不能

**优化方案：**
1. **按钮点击用弹簧**：:active scale(0.97) → 释放后 spring 回弹到 1.0，damping 0.8, response 0.3
2. **FAB 用弹簧**：点击后 spring 缩放，带轻微过冲
3. **模态框入场用弹簧**：从底部 slide-up + spring，damping 0.85, response 0.4
4. **实现方式**：用 CSS `cubic-bezier(.34, 1.56, .64, 1)` 模拟弹簧（轻量），或引入 framer-motion（完整弹簧物理）

### 问题 6：数据更新无过渡，数字变化硬切
**严重度：P1**

**当前状态：**
- 经营概览金额变化：无过渡，直接跳变
- KPI 数字变化：无过渡
- 图表数据更新：无过渡（柱状图高度直接变化）
- 进度环/进度条变化：无过渡

**问题：**
- 用户切换时间范围（本月/上月）时，所有数字直接跳变，视觉跳跃
- 无法感知"数据在变化"，缺少动态反馈
- Apple 风格的数字应该有"滚动计数"或"平滑过渡"

**优化方案：**
1. **数字变化用滚动计数动画**：从旧值滚动到新值，300ms ease-out
2. **图表柱状图高度过渡**：height 200ms ease-out
3. **进度环过渡**：stroke-dashoffset 300ms ease-out
4. **实现方式**：用 React 自定义 hook（useCountUp）或 CSS transition

---

## 三、逐场景过渡审查

### 3.1 页面切换过渡

| 场景 | 当前 | 问题 | 优化方案 |
|---|---|---|---|
| Tab 切换 | 无过渡，硬切 | P0 | fade-in + slide-up 8px，220ms standard |
| 子页面进入 | 无过渡，硬切 | P0 | 从右侧 slide-in + fade-in，250ms standard |
| 子页面退出 | 无过渡，硬切 | P0 | 向右侧 slide-out + fade-out，200ms ease-in |
| 模态框入场 | 无过渡 | P1 | 从底部 slide-up + spring，350ms |
| 模态框退场 | 无过渡 | P1 | 向底部 slide-down + fade-out，250ms |
| 底部选择器 | 无过渡 | P1 | 从底部 slide-up + 背景遮罩 fade-in |

### 3.2 入场动画

| 场景 | 当前 | 问题 | 优化方案 |
|---|---|---|---|
| 图表卡片 | fade + slide-up 280ms | ✅ 已有 | 保持，时长改为 220ms standard |
| 经营概览卡片 | 无 | P0 | fade + slide-up 8px，220ms |
| KPI 卡片 | 无 | P0 | fade + slide-up，220ms，延迟 80ms |
| 列表项 | 无 | P0 | fade + slide-up，200ms，stagger 40ms |
| 促销轮播 | 无 | P1 | fade + slide-up，220ms，延迟 160ms |
| 空态/加载态 | 无 | P1 | 骨架屏 pulse 动画，或 fade-in |
| 页面整体 | 无 | P1 | stagger 入场：导航栏→问候语→概览→图表→列表 |

### 3.3 交互反馈过渡

| 场景 | 当前 | 问题 | 优化方案 |
|---|---|---|---|
| 按钮点击 | :active scale(0.97-0.985) | ⚠️ 瞬时，无回弹 | spring 回弹，160ms |
| 卡片点击 | 部分有 :active scale | ⚠️ 不统一 | 统一 :active scale(0.98) + 背景高亮 |
| 输入框聚焦 | border + box-shadow 0.16s | ✅ 已有 | 保持，时长统一 160ms fast |
| 开关切换 | 无 | P1 | 滑块 translate + 背景色，200ms standard |
| 复选框 | 无 | P1 | 勾选时 scale 弹簧 + 对勾描边动画 |
| 下拉选择 | 无 | P1 | 选项展开时 stagger 入场 |
| 滑块/范围 | 无 | P1 | 拖拽时 1:1 跟踪，释放时 spring 吸附 |

### 3.4 折叠展开过渡

| 场景 | 当前 | 问题 | 优化方案 |
|---|---|---|---|
| 洞察页大折叠 | 无，硬切 | P0 | grid-template-rows 0fr→1fr，320ms slow |
| 行业参考估算 | 无，硬切 | P0 | grid-template-rows，320ms |
| 健康度公式 | 无，硬切 | P1 | grid-template-rows，250ms |
| 记录更多信息 | 无，硬切 | P1 | grid-template-rows，250ms |
| 结构对比查看全部 | 无，硬切 | P1 | grid-template-rows，250ms |
| 折叠箭头 | rotate 180deg 180ms | ✅ 已有 | 保持，与内容展开同步 |

### 3.5 数据更新过渡

| 场景 | 当前 | 问题 | 优化方案 |
|---|---|---|---|
| 金额数字变化 | 无，硬切 | P1 | 滚动计数动画，300ms |
| 百分比变化 | 无，硬切 | P1 | 滚动计数动画，300ms |
| 柱状图高度 | 无，硬切 | P1 | height 过渡，200ms |
| 进度环 | 无，硬切 | P1 | stroke-dashoffset 过渡，300ms |
| 进度条 | 无，硬切 | P1 | width 过渡，200ms |
| 图表数据切换 | 无，硬切 | P2 | 旧数据 fade-out → 新数据 fade-in，交叉过渡 |

### 3.6 加载/空态过渡

| 场景 | 当前 | 问题 | 优化方案 |
|---|---|---|---|
| 页面加载 | 空白→内容硬切 | P1 | 骨架屏 pulse → 内容 fade-in，交叉过渡 |
| 列表加载 | 空白→列表硬切 | P1 | 骨架屏行 → 列表项 stagger 入场 |
| 空态 | 直接显示 | P2 | 空态插画 fade-in + 轻微 bounce |
| 错误态 | 直接显示 | P2 | 错误提示 shake 动画（轻微）+ fade-in |
| 加载旋转 | rotate 0.8s linear | ✅ 已有 | 保持，可改为 spring 旋转 |

---

## 四、全局动效规范（新增）

### 4.1 时长令牌

```css
:root {
  --sdq-duration-instant: 80ms;     /* 微交互：hover/高亮/焦点 */
  --sdq-duration-fast: 160ms;       /* 快速交互：按钮/输入框/折叠箭头 */
  --sdq-duration-standard: 220ms;   /* 标准过渡：卡片入场/页面切换/开关 */
  --sdq-duration-slow: 320ms;       /* 慢速过渡：折叠展开/大面板 */
  --sdq-duration-entrance: 400ms;   /* 入场动画：页面入场/模态框 */
}
```

### 4.2 缓动令牌

```css
:root {
  --sdq-ease-standard: cubic-bezier(.23, 1, .32, 1);   /* Apple 标准：ease-out-expo */
  --sdq-ease-in: cubic-bezier(.42, 0, 1, 1);            /* 进入：加速 */
  --sdq-ease-out: cubic-bezier(0, 0, .58, 1);           /* 退出：减速 */
  --sdq-ease-in-out: cubic-bezier(.42, 0, .58, 1);      /* 往返 */
  --sdq-spring: cubic-bezier(.34, 1.56, .64, 1);        /* 弹簧：轻微过冲 */
}
```

### 4.3 过渡类型规范

| 过渡类型 | 时长 | 缓动 | 典型场景 |
|---|---|---|---|
| 微交互 | 80ms | ease-out | hover 高亮、焦点环 |
| 快速交互 | 160ms | ease-out | 按钮点击、输入框聚焦、折叠箭头 |
| 标准过渡 | 220ms | standard | 卡片入场、页面切换、开关切换 |
| 慢速过渡 | 320ms | standard | 折叠展开、大面板、侧边栏 |
| 入场动画 | 400ms | spring | 模态框入场、页面首次加载 |
| 退出动画 | 200ms | ease-in | 模态框退场、页面退出（退出比进入快） |

### 4.4 入场动画规范

**Stagger 延迟：**
- 列表项：每项延迟 40ms，最多延迟 320ms（8项后不再延迟）
- 卡片组：每张延迟 80ms，最多延迟 320ms
- 页面整体：导航栏 0ms → 标题 80ms → 概览 160ms → 图表 240ms → 列表 320ms

**入场动画样式：**
- 卡片/列表项：`opacity: 0 → 1` + `translateY: 8px → 0`
- 模态框：`opacity: 0 → 1` + `translateY: 24px → 0` + spring
- 页面：`opacity: 0 → 1` + `translateY: 4px → 0`

### 4.5 减少动效适配

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**当前已有全局适配 ✅，保持不变。**

---

## 五、实施优先级

### P0（必须修复，影响基础体验）

| # | 问题 | 方案 | 涉及范围 |
|---|---|---|---|
| 1 | 页面切换无过渡 | Tab fade+slide，子页面 slide-in/out | 全局导航 |
| 2 | 列表/卡片入场不统一 | 所有卡片统一入场，列表 stagger | 全部页面 |
| 3 | 折叠展开无过渡 | grid-template-rows 0fr→1fr | 洞察/记录/健康度 |
| 4 | 过渡时长/缓动不统一 | 建立全局动效令牌（5时长+5缓动） | 全局 CSS |

### P1（应该修复，提升精致度）

| # | 问题 | 方案 | 涉及范围 |
|---|---|---|---|
| 5 | 缺少弹簧物理动画 | 按钮/模态框用 spring 缓动 | 按钮/模态框 |
| 6 | 数据更新无过渡 | 数字滚动计数 + 图表高度过渡 | 概览/KPI/图表 |
| 7 | 模态框/弹窗无过渡 | slide-up + spring + 背景遮罩 fade | 全局弹窗 |
| 8 | 加载/空态无过渡 | 骨架屏 pulse → 内容 fade-in | 全部页面 |

### P2（可以优化，提升细节）

| # | 问题 | 方案 | 涉及范围 |
|---|---|---|---|
| 9 | 开关/复选框无过渡 | 滑块 translate + 勾选描边动画 | 表单组件 |
| 10 | 图表数据切换无过渡 | 旧数据 fade-out → 新数据 fade-in | 图表组件 |
| 11 | 错误态无动画 | 轻微 shake + fade-in | 表单/错误提示 |
| 12 | 下拉选项无 stagger | 选项展开时依次入场 | 下拉选择器 |

---

## 六、与 Trae 批次的对应关系

本审查报告建议作为 **批次 23：全局过渡与动效专项优化**，在批次 11-22 完成后执行。

**前置依赖：**
- 批次 11（全局配色与令牌）— 颜色令牌已统一
- 批次 12（全局组件）— 组件样式已统一
- 批次 21（可阅读性专项优化）— 字号/行高规范已建立
- 批次 22（Logo 区重构 + 融入过渡）— Logo 区过渡已落地

**涉及文件：**
- `client/src/tokens/primitives.css`（新增动效令牌：时长/缓动）
- `client/src/index.css`（全局过渡规范：页面切换/入场/折叠/交互）
- `client/src/pages/Home.tsx`（页面切换过渡 + 列表 stagger 入场）
- 其他页面组件（折叠展开过渡 + 数据更新过渡）

---

**报告完成时间：** 2026-09-01
**审查过渡数：** 29 处现有过渡 / 12 类缺失过渡
**发现问题数：** 全局性 6 项（P0×4 + P1×2）+ 逐场景 30+ 项
**新增规范：** 5 级时长令牌 + 5 级缓动令牌 + 6 类过渡规范 + 入场 stagger 规范
**建议优先级：** P0 四项 / P1 四项 / P2 四项

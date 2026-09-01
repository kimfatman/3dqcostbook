# Logo 区融入主页过渡设计方案

**日期：** 2026-09-01 ｜ **问题：** Logo 区突兀，未融入主页，需要设计平滑过渡
**对标：** Apple iOS 导航栏（毛玻璃悬浮/大标题折叠/渐变遮罩）+ Apple App Store 今日页（问候语缓冲）
**前置文档：** `docs/logo-area-redesign-2026-09-01.md`（Logo 区整改方案）

---

## 一、问题诊断：为什么 Logo 区突兀

### 1.1 当前结构断层

```
┌─────────────────────────────────────┐
│ [logo] 店铺名称            [🔔]     │ ← header：不透明背景，硬边界
│        行业 · 月份    ⌄              │
├─────────────────────────────────────┤ ← 硬切换：无过渡，视觉断裂
│ 🏪 店铺名称  行业 · 月份             │ ← dashboard-kicker：信息重复！
├─────────────────────────────────────┤
│  经营概览（蓝色大卡）                 │ ← 内容区：直接出现，无缓冲
│  ...                                  │
└─────────────────────────────────────┘
```

### 1.2 突兀的 4 个原因

| # | 原因 | 表现 |
|---|---|---|
| 1 | **硬边界** | header 底部有明显的边框/背景色切换，像"贴上去的一条" |
| 2 | **信息重复** | header 显示店铺名+行业月份，下面 dashboard-kicker 又显示一遍 |
| 3 | **无缓冲区域** | logo 区下面直接是经营概览大卡片，中间没有过渡元素 |
| 4 | **不透明背景** | header 是实色背景，内容无法"延伸"到 header 下面，没有层次感 |

### 1.3 苹果如何解决这个问题

**Apple iOS 导航栏的 3 个核心过渡手法：**

1. **毛玻璃悬浮**：导航栏半透明（backdrop-filter: blur），内容滚动时从下面"穿过"，导航栏像悬浮在内容上的一层，而不是分隔内容的一条
2. **大标题折叠**：页面顶部有大标题（34px bold），滚动时平滑折叠为导航栏小标题（17px），大标题区域就是 logo 与内容之间的天然过渡
3. **渐变遮罩**：导航栏底部用渐变（从导航栏背景色到透明），而不是硬边框，视觉上"融化"到内容区

**Apple App Store 今日页的额外手法：**
4. **问候语缓冲**：顶部"今日 5月14日 星期二"+ 大标题，作为导航栏与内容卡片之间的缓冲区域

---

## 二、过渡设计方案（4 层叠加）

### 核心思路：去除硬边界 + 半透明悬浮 + 上下文缓冲 + 视觉延续

```
┌─────────────────────────────────────┐
│ [logo] 店铺名称            [🔔 3]   │ ← 第1层：毛玻璃悬浮导航栏
│        行业 · 月份    ⌄              │    （半透明，内容可从下面穿过）
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← 第2层：渐变遮罩（融化到内容）
│  下午好，老板 👋                      │ ← 第3层：问候语缓冲区域
│  今天是 9月1日，本月利润 ¥12,345     │    （logo与数据卡片之间的过渡）
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← 第4层：品牌色渐变细线（视觉延续）
│  经营概览（蓝色大卡）                 │ ← 内容区：平滑进入
│  ...                                  │
└─────────────────────────────────────┘
```

---

### 第 1 层：毛玻璃悬浮导航栏（去除硬边界）

#### 1.1 样式

```css
.app-nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
  padding-top: env(safe-area-inset-top);
  
  /* 毛玻璃：半透明 + 模糊 + 饱和 */
  background: color-mix(in srgb, var(--sdq-bg-surface) 72%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  
  /* 关键：去除硬边框，用渐变遮罩代替 */
  border-bottom: none;
  
  transition: background 0.3s ease;
}

/* 滚动时加深背景（内容从下面穿过时更清晰） */
.app-nav-bar.scrolled {
  background: color-mix(in srgb, var(--sdq-bg-surface) 88%, transparent);
}

/* 深色皮肤调整透明度 */
.skin-deep .app-nav-bar,
.skin-midnight .app-nav-bar {
  background: color-mix(in srgb, var(--sdq-bg-surface) 60%, transparent);
}
```

#### 1.2 为什么这样能融入

- **半透明背景**（72% 不透明）：内容滚动时可以隐约从下面"透过来"，导航栏像悬浮的一层
- **blur(20px)**：模糊下面的内容，保证导航栏文字可读性
- **saturate(180%)**：提升下面内容的饱和度，毛玻璃效果更生动
- **去除 border-bottom**：没有硬边界，导航栏与内容区之间没有"切割线"
- **滚动时加深**（88%）：内容滚动时导航栏背景变实，保证文字可读性

---

### 第 2 层：渐变遮罩（导航栏底部"融化"到内容）

#### 2.1 样式

```css
/* 导航栏底部渐变遮罩：从导航栏背景色渐变到透明 */
.app-nav-bar::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -16px;  /* 延伸到内容区顶部 */
  height: 16px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--sdq-bg-surface) 72%, transparent) 0%,
    color-mix(in srgb, var(--sdq-bg-surface) 36%, transparent) 50%,
    transparent 100%
  );
  pointer-events: none;  /* 不阻挡点击 */
  z-index: -1;
}

/* 滚动时隐藏渐变遮罩（导航栏背景已加深，不需要遮罩） */
.app-nav-bar.scrolled::after {
  opacity: 0;
  transition: opacity 0.3s ease;
}
```

#### 2.2 为什么这样能融入

- **渐变从导航栏背景色到透明**：视觉上导航栏"融化"到内容区，没有硬边界
- **延伸 16px 到内容区**：渐变覆盖内容区顶部，让内容区顶部也有导航栏的"余韵"
- **pointer-events: none**：不阻挡内容区的点击交互
- **滚动时隐藏**：滚动时导航栏背景加深，渐变遮罩完成使命后淡出

---

### 第 3 层：问候语缓冲区域（logo 与数据卡片之间的过渡）

#### 3.1 结构（替换当前的 dashboard-kicker 信息重复条）

```jsx
{/* 问候语缓冲区域：logo 与经营数据之间的过渡 */}
<section className="home-greeting-buffer">
  <div className="greeting-text">
    <span className="greeting-time">{getGreetingByTime()}</span>
    <h1 className="greeting-title">{template.storeName}</h1>
    <p className="greeting-summary">
      {currentPeriod.replace("-", " 年 ")} 月 · 
      {homeRangeHasData ? `本月经营利润 ¥${formatMoney(homeRangeTotals.operatingProfit)}` : "开始记录第一笔流水"}
    </p>
  </div>
</section>
```

#### 3.2 样式

```css
.home-greeting-buffer {
  padding: 8px 4px 20px;
  animation: greeting-fade-in 0.6s ease-out 0.1s both;
}

@keyframes greeting-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.greeting-time {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--sdq-text-secondary);
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}

.greeting-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--sdq-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.greeting-summary {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--sdq-text-secondary);
  line-height: 1.4;
}

/* 滚动时问候语区域折叠（苹果大标题折叠效果） */
.home-greeting-buffer.collapsed {
  opacity: 0;
  transform: translateY(-12px);
  height: 0;
  padding: 0;
  overflow: hidden;
  transition: all 0.3s ease;
  pointer-events: none;
}
```

#### 3.3 问候语逻辑

```js
function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了";
}
```

#### 3.4 为什么这样能融入

- **问候语是"人的语言"**："下午好，老板"比"店铺名称 + 行业月份"更有温度，作为 logo 与冷数据之间的过渡
- **大标题（28px）是视觉锚点**：用户一眼看到当前在哪个店铺，替代了 header 里的小店铺名（header 可以只保留 logo + 消息按钮）
- **摘要是"数据预告"**："本月经营利润 ¥12,345"让用户对下面的经营概览卡片有预期，平滑过渡
- **入场动画**：问候语区域 fade-in + slide-up，比直接出现更柔和
- **滚动时折叠**：滚动时问候语区域平滑折叠，为内容腾出空间（苹果大标题折叠效果）

---

### 第 4 层：品牌色渐变细线（视觉延续）

#### 4.1 样式

```css
/* 问候语区域底部的品牌色渐变细线：视觉延续到内容区 */
.home-greeting-buffer::after {
  content: "";
  display: block;
  width: 48px;
  height: 3px;
  margin-top: 16px;
  background: linear-gradient(
    90deg,
    var(--sdq-action-primary) 0%,
    color-mix(in srgb, var(--sdq-action-primary) 50%, var(--sdq-info)) 50%,
    transparent 100%
  );
  border-radius: 2px;
}
```

#### 4.2 为什么这样能融入

- **品牌色渐变细线**是 logo 品牌色的"余韵"，从问候语区域延续到内容区
- **48px 宽度**（不是全宽）：精致不突兀，像苹果的 underline 风格
- **渐变到透明**：没有硬端点，视觉上"消失"在内容区方向
- **3px 高度**：微妙但可见，作为区域分隔的视觉提示

---

## 三、完整过渡效果示意

### 3.1 页面顶部（未滚动）

```
┌─────────────────────────────────────┐  ← 毛玻璃导航栏（半透明72%）
│ [logo] 店铺名称            [🔔 3]   │     内容可从下面隐约透过来
│        行业 · 月份    ⌄              │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← 渐变遮罩（融化到内容）
│                                     │
│  下午好 👋                           │  ← 问候语缓冲区域
│  测试店                               │     （大标题28px + 摘要）
│  9 月 · 本月经营利润 ¥12,345         │
│  ▬▬▬░░░                              │  ← 品牌色渐变细线（48px）
│                                     │
│  ┌─────────────────────────────────┐│  ← 经营概览卡片（平滑进入）
│  │ 经营概览  9月          [本月▾]  ││
│  │ ...                             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 3.2 滚动后（问候语折叠，导航栏加深）

```
┌─────────────────────────────────────┐  ← 导航栏加深（88%不透明）
│ [logo] 测试店              [🔔 3]   │     文字更清晰
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← 渐变遮罩淡出
│  ┌─────────────────────────────────┐│  ← 内容区上移，占用更多空间
│  │ 经营概览  9月          [本月▾]  ││
│  │ ...                             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 销售订单趋势                     ││
│  │ ...                             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 四、滚动交互实现

### 4.1 JSX 逻辑

```jsx
function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 滚动超过 40px 时触发折叠
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="prototype-home home-redesign">
      {/* 问候语缓冲区域：滚动时折叠 */}
      <section className={`home-greeting-buffer ${isScrolled ? 'collapsed' : ''}`}>
        <span className="greeting-time">{getGreetingByTime()}</span>
        <h1 className="greeting-title">{template.storeName}</h1>
        <p className="greeting-summary">
          {currentPeriod.replace("-", " 年 ")} 月 · 
          {homeRangeHasData ? `本月经营利润 ¥${formatMoney(homeRangeTotals.operatingProfit)}` : "开始记录第一笔流水"}
        </p>
      </section>

      {/* 经营概览卡片 */}
      <OperatingSnapshot ... />
      
      {/* 其他内容 */}
      ...
    </div>
  );
}
```

### 4.2 导航栏滚动状态同步

导航栏（在 renderHeader 中）也需要监听滚动状态，切换 `.scrolled` 类：

```jsx
// 在 App 根组件中
const [isScrolled, setIsScrolled] = useState(false);

useEffect(() => {
  const handleScroll = () => setIsScrolled(window.scrollY > 40);
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// renderHeader 中
<header className={`app-nav-bar ${isScrolled ? 'scrolled' : ''}`}>
  ...
</header>
```

---

## 五、入场动画时序（页面加载时）

为了让 logo 区与内容区"一起出现"而不是"先后出现"，设计 stagger 入场动画：

| 时序 | 元素 | 动画 | 时长 | 延迟 |
|---|---|---|---|---|
| 0ms | 导航栏（logo区） | fade-in + slide-down 8px | 0.5s | 0ms |
| 100ms | 渐变遮罩 | fade-in | 0.4s | 100ms |
| 200ms | 问候语区域 | fade-in + slide-up 8px | 0.5s | 200ms |
| 350ms | 品牌色渐变细线 | width 从 0 到 48px | 0.4s | 350ms |
| 450ms | 经营概览卡片 | fade-in + slide-up 12px | 0.5s | 450ms |
| 600ms | 其他卡片（依次） | fade-in + slide-up | 0.4s each | 600ms+ |

**效果**：整个页面像"一起呼吸"一样出现，logo 区先出现，然后问候语跟上，然后内容卡片依次浮现，没有突兀感。

```css
/* 入场动画基础类 */
.fade-in-up {
  animation: fadeInUp 0.5s ease-out both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 各元素延迟 */
.nav-bar-enter { animation-delay: 0ms; }
.greeting-enter { animation-delay: 200ms; }
.snapshot-enter { animation-delay: 450ms; }
.metrics-enter { animation-delay: 600ms; }
.trend-enter { animation-delay: 750ms; }
```

---

## 六、5 种皮肤适配

| 皮肤 | 导航栏背景 | 毛玻璃效果 | 渐变遮罩 |
|---|---|---|---|
| soft（浅色） | surface 72% | blur 20px | surface → 透明 |
| aurora（浅色） | surface 72% | blur 20px | surface → 透明 |
| forest（浅色） | surface 72% | blur 20px | surface → 透明 |
| deep（深色） | surface 60% | blur 20px | surface → 透明 |
| midnight（深色） | surface 60% | blur 20px | surface → 透明 |

**深色皮肤调整**：
- 背景不透明度从 72% 降到 60%（深色背景更透明，毛玻璃效果更好）
- 滚动时加深到 80%（不是 88%，深色不需要那么实）
- 问候语大标题颜色用 text-primary（浅色皮肤也是 text-primary，令牌自动适配）

---

## 七、减少动效适配

```css
@media (prefers-reduced-motion: reduce) {
  .app-nav-bar,
  .home-greeting-buffer,
  .fade-in-up {
    transition: none;
    animation: none;
  }
  
  /* 折叠时直接隐藏，不用动画 */
  .home-greeting-buffer.collapsed {
    display: none;
  }
}
```

---

## 八、实施步骤

### 步骤 1：导航栏毛玻璃化（P0）
1. 将 `.page-header` 替换为 `.app-nav-bar` 样式（毛玻璃 + 去除硬边框）
2. 添加 `::after` 渐变遮罩
3. 添加滚动监听，切换 `.scrolled` 类

### 步骤 2：问候语缓冲区域（P0）
1. 删除当前的 `dashboard-kicker home-context`（信息重复条）
2. 新增 `.home-greeting-buffer` 区域（问候语 + 大标题 + 摘要）
3. 添加 `getGreetingByTime()` 函数
4. 添加滚动折叠交互

### 步骤 3：品牌色渐变细线（P1）
1. 在问候语区域底部添加 `::after` 渐变细线
2. 调整宽度 48px，高度 3px

### 步骤 4：入场动画（P1）
1. 为导航栏、问候语、经营概览卡片添加 stagger 入场动画
2. 确保 `prefers-reduced-motion` 下禁用

### 步骤 5：5 种皮肤验证（P0）
1. 切换 5 种皮肤，验证毛玻璃效果和颜色
2. 深色皮肤调整背景不透明度

### 步骤 6：验证（P0）
1. 三门禁全绿
2. 滚动时问候语平滑折叠，导航栏背景加深
3. 页面加载时 stagger 入场动画流畅
4. 5 种皮肤下效果正常
5. prefers-reduced-motion 下无动画
6. 实际截图对比整改前后

---

## 九、验收标准

- [ ] 导航栏毛玻璃效果正常（backdrop-filter: blur 20px）
- [ ] 导航栏无硬边框，底部渐变遮罩融化到内容
- [ ] 滚动时导航栏背景加深（72% → 88%）
- [ ] 问候语缓冲区域存在（问候语 + 大标题 + 摘要）
- [ ] 删除了 dashboard-kicker 信息重复条
- [ ] 问候语根据时间变化（早上好/下午好/晚上好）
- [ ] 滚动时问候语区域平滑折叠
- [ ] 品牌色渐变细线存在（48px × 3px）
- [ ] 页面加载时 stagger 入场动画（导航栏→问候语→卡片）
- [ ] 5 种皮肤下毛玻璃和颜色正常
- [ ] 深色皮肤背景不透明度 60%（浅色 72%）
- [ ] prefers-reduced-motion 下无动画
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

---

## 十、与 Logo 区整改方案的关系

本方案是 `docs/logo-area-redesign-2026-09-01.md` 的**补充和深化**：

| 文档 | 聚焦 | 关系 |
|---|---|---|
| logo-area-redesign | Logo 区本身的重构（毛玻璃/大标题/安全区域/CSS去重） | 基础 |
| **本文档** | **Logo 区与主页内容之间的过渡设计** | **深化** |

**建议合并为批次 22**：首页 Logo 区苹果风格重构 + 融入过渡设计。

---

**报告完成时间：** 2026-09-01
**过渡层数：** 4 层（毛玻璃悬浮 + 渐变遮罩 + 问候语缓冲 + 品牌色细线）
**核心手法：** 去除硬边界 / 半透明悬浮 / 上下文缓冲 / 视觉延续 / stagger 入场
**对标：** Apple iOS 导航栏 + Apple App Store 今日页

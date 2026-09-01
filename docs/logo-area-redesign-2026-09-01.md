# 首页 Logo 区整改方案

**日期：** 2026-09-01 ｜ **审查范围：** 首页顶部 logo 区（page-header / brand-mini）
**对标：** Apple iOS 导航栏设计（大标题/毛玻璃/安全区域/材质深度）
**审查标准：** Apple Design（材质与深度/空间一致性/排版/反馈）+ ui-ux-pro-max（Navigation Patterns Priority 9）

---

## 一、当前 Logo 区结构分析

### 1.1 JSX 结构（Home.tsx 第 1049 行）

```jsx
<header className="page-header">
  <div className="brand-mini">
    <span className="brand-seal-stack">
      <img className="brand-seal" src="/brand-assets/SDQ_Logo_Mark.png" alt="算得清品牌标志" />
      <BrandStoreLogo assetId={...} preset={...} alt="店铺标识" size="header" />
    </span>
    <span>
      <strong>{店铺名称}<ChevronDown size={13} /></strong>
      <em>{行业模板} · {当前月份}</em>
    </span>
  </div>
  <button className="header-icon" onClick={goSub("notifications")}>
    <Bell size={20} />
    {unreadNotificationCount > 0 && <i />}
  </button>
</header>
```

### 1.2 当前视觉组成

| 元素 | 尺寸 | 位置 | 说明 |
|---|---|---|---|
| 主 logo（brand-seal） | 35×35px（最终生效） | 左侧 | SDQ_Logo_Mark.png，圆角 12px |
| 店铺 logo 徽章 | 17×17px | 主 logo 右下角 | 用户上传/预设，白色边框+阴影 |
| 店铺名称 | 16px（最终生效） | logo 右侧第一行 | strong + ChevronDown，可点击切换店铺 |
| 行业+月份 | 8px（最终生效） | 店铺名下方 | em，极端小字号 |
| 消息按钮 | 35×35px | 右侧 | Bell 20px，未读红点 5×5px |

---

## 二、当前问题清单（P0-P2）

### P0 — 严重问题

#### 问题 1：CSS 重复定义 5 处，样式互相覆盖，最终效果不可预测

`.brand-mini` 及相关选择器在 `client/src/index.css` 中至少有 **5 处定义**，后定义的覆盖先定义的，导致：

| 行号 | 定义内容 | 覆盖效果 |
|---|---|---|
| 284 | 基础：gap 10px，seal 32×32，store-logo 17×17，strong 14px，em 9px | 基础层 |
| 307 | img border-color/box-shadow，strong::after 下划线 26px | 覆盖阴影 |
| 341 | img 36×36 padding 3px，strong 16px letter-spacing **-.11em**，em **8px**，下划线 19px | 覆盖字号+字距 |
| 360 | strong font-family letter-spacing **-.16em**，下划线 24px | 覆盖字距（过紧！） |
| 390 | strong::after 背景色，img box-shadow none | 覆盖阴影 |
| 459 | img 35×35 border-radius 12px + 阴影，span::after 下划线 24px | 最终生效层 |

**问题：**
- 开发者无法预测最终生效的样式（需要从下往上追溯）
- 修改一处可能影响其他页面（brand-mini 在多个页面使用）
- 样式冗余，增加 CSS 体积和维护成本

**Apple Design 违反：** Craft（§16）— "Nothing is random — every spacing, timing, and alignment value is a deliberate choice you can defend." 5处重复定义不是 deliberate choice，是技术债务。

#### 问题 2：店铺名字距 -.16em 过紧，中文文字重叠

当前最终生效的 `letter-spacing: -.16em`（第360行），对于 16px 中文文字：
- 每个字间距 = 16px × -0.16 = **-2.56px**
- 中文文字本身宽度约 16px，负间距导致文字**重叠 2.56px**
- 特别是"算得清"、"测试店"等多字名称，文字粘连不可读

**Apple Design 违反：** Typography（§16）— "Type tracking: Size-specific, never fixed. Tighten large text (-0.02em), body near 0." 大标题最多 -0.02em，-.16em 是 8 倍过紧。

#### 问题 3：行业+月份 8px 极端小字号，几乎不可读

当前 `em`（行业模板 + 当前月份）最终生效字号 **8px**（第341行覆盖第284行的9px）。

- 8px 是全局最小字号之一（与环形图中心小字并列）
- 行业+月份是重要上下文信息（用户在哪个行业、哪个月），不应该用 8px
- 在移动端（375px 宽度），8px 文字需要放大才能识别

**ui-ux-pro-max 违反：** Typography（Priority 6）— "Text < 12px body" 是 anti-pattern；Accessibility（Priority 1）— 8px 文字对比度和可读性严重不足。

#### 问题 4：主 logo + 店铺徽章双 logo 叠加，视觉混乱

当前设计：
- 主 logo（SDQ 品牌标志，35×35）
- 店铺 logo 徽章（17×17，右下角叠加）

**问题：**
- 两个 logo 叠加，视觉重心不明确
- 店铺徽章 17×17 太小，用户上传的 logo 细节无法识别
- 白色边框+阴影在深色皮肤下可能不明显
- 用户可能困惑：哪个是 app logo？哪个是店铺 logo？

**Apple Design 违反：** 理解（人类需求第2项）— 用户应该一眼理解每个元素的含义；双 logo 叠加增加认知负担。

#### 问题 5：缺少毛玻璃材质效果，导航栏与内容区无分层

当前 `page-header` 是**不透明背景**（继承 body 背景色），没有：
- `backdrop-filter: blur()` 毛玻璃效果
- 半透明背景色
- 底部边框/阴影分隔

**问题：**
- 滚动内容时，导航栏与内容区混在一起，没有分层感
- 苹果 iOS 导航栏的核心特征就是毛玻璃材质（translucent materials）
- 当前设计看起来像"贴在内容上的一条"，而不是"悬浮在内容上的一层"

**Apple Design 违反：** Materials & Depth（§12）— "Build nav/toolbars/sheets as translucent layers (backdrop-filter: blur()) with content scrolling underneath — not opaque bars that consume a fixed strip."

### P1 — 应该修复

#### 问题 6：缺少安全区域适配，刘海/灵动岛机型可能被遮挡

当前 `page-header` 没有 `padding-top: env(safe-area-inset-top)`。

**问题：**
- iPhone 刘海/灵动岛机型，顶部内容可能被遮挡
- 苹果 HIG 要求所有导航栏必须适配安全区域
- 当前仅 tabbar 有 `env(safe-area-inset-bottom)`，顶部没有

#### 问题 7：消息按钮触控区域 35×35，低于 44×44 标准

当前 `.header-icon` 尺寸 35×35px，Bell 图标 20px。

**问题：**
- Apple HIG 要求最小触控区域 44×44pt
- 35×35 比标准小 20%，边缘点击容易误触/漏触
- 未读红点 5×5px 太小，不明显（标准 8-10px）

**ui-ux-pro-max 违反：** Touch & Interaction（Priority 2）— "Min size 44×44px"。

#### 问题 8：店铺切换交互不明确，缺少点击反馈

当前店铺名（strong + ChevronDown）可点击切换店铺，但：
- 没有明确的"可点击"视觉提示（ChevronDown 13px 太小）
- 点击后没有缩放/高亮反馈
- 没有说明点击后会发生什么（弹出店铺选择器？跳转页面？）

**Apple Design 违反：** Response（§1）— "Respond on pointer-down, not on release"；Feedback（§16）— 确认有意义的操作。

#### 问题 9：header 高度不固定，页面切换时跳动

当前 `page-header` 高度由内容撑开，不同 Tab 页面的 header 内容可能不同：
- 工作台：brand-mini + 消息按钮
- 订单页：orders-prototype-header（69px，深色背景）
- 其他页面：可能不同

**问题：**
- 切换 Tab 时，header 高度变化导致内容区跳动
- 苹果 iOS 导航栏高度固定（44pt + 安全区域），切换页面不跳动

#### 问题 10：缺少大标题/小标题双行布局（苹果导航栏核心特征）

苹果 iOS 15+ 导航栏核心特征：
- 大标题模式：页面顶部 34px bold 大标题，滚动时折叠为 17px semibold 小标题
- 当前设计：只有 16px 店铺名 + 8px 行业月份，没有大标题

**问题：**
- 缺少苹果风格的大标题视觉冲击力
- 店铺名 16px 不够突出，用户一眼看不到当前在哪个店铺

### P2 — 精致度优化

#### 问题 11：logo 入场动画缺失，页面加载时生硬出现

当前 logo 区没有入场动画，页面加载时直接出现。

**苹果风格：** logo 有轻微的 fade-in + slide-down 动画，或 spring 缩放动画。

#### 问题 12：未读红点无数字，仅显示一个点

当前未读通知只显示 5×5px 红点，不显示数量。

**苹果风格：** 未读数量 ≥1 时显示数字徽章（如"3"），数量过多显示"99+"。

#### 问题 13：logo 圆角方形底座不统一

当前主 logo 圆角 12px（第459行），但：
- 店铺徽章圆角 7px
- header-icon 圆角 11px
- 不统一

**苹果风格：** app 图标统一使用连续圆角（SF Symbols 风格），或统一 12px 圆角。

---

## 三、对标苹果 iOS 导航栏的优秀设计

### 3.1 苹果 iOS 导航栏核心特征

| 特征 | 苹果设计 | 当前实现 | 差距 |
|---|---|---|---|
| **材质** | 毛玻璃半透明（backdrop-filter: blur(20px)） | 不透明背景 | ❌ 缺失 |
| **高度** | 固定 44pt + 安全区域 | 不固定，由内容撑开 | ❌ 缺失 |
| **安全区域** | padding-top: env(safe-area-inset-top) | 无 | ❌ 缺失 |
| **大标题** | 34px bold，滚动折叠为 17px | 16px 店铺名 | ❌ 缺失 |
| **logo+标题** | 44×44 圆角图标 + 17px semibold | 35×35 logo + 16px 店名 | ⚠️ 接近 |
| **右侧操作** | 44×44 触控区域，图标按钮 | 35×35 消息按钮 | ⚠️ 偏小 |
| **分层** | 导航栏悬浮在内容上，有阴影/边框 | 与内容混在一起 | ❌ 缺失 |
| **动效** | 滚动折叠/展开，spring 动画 | 无 | ❌ 缺失 |
| **反馈** | 点击缩放 0.97，pointer-down 高亮 | 无 | ❌ 缺失 |

### 3.2 苹果 App Store / 健康 App 的 logo 区参考

**App Store 今日页：**
- 顶部：用户头像（圆形，44×44）+ "今日"大标题（34px bold）
- 滚动时：大标题折叠为导航栏小标题（17px semibold）
- 导航栏：毛玻璃半透明，底部有细边框

**健康 App：**
- 顶部："健康摘要"大标题（34px bold）+ 右上角用户头像
- 滚动时：大标题折叠，导航栏显示"健康"小标题
- 标签页切换：顶部 segmented control（毛玻璃背景）

**设置 App：**
- 顶部：用户信息卡（头像 + 姓名 + Apple ID），可点击进入
- 搜索框：毛玻璃背景，圆角 10px
- 分组列表：inset grouped 风格

---

## 四、整改方案

### 方案 A：苹果风格大标题导航栏（推荐）

#### 4.1 结构重构

```jsx
<header className="app-nav-bar">
  {/* 左侧：店铺切换 */}
  <button className="store-switcher" onClick={openStorePicker}>
    <span className="store-avatar">
      <img src={storeLogo || defaultLogo} alt="店铺logo" />
    </span>
    <span className="store-info">
      <span className="store-name">{店铺名称}</span>
      <span className="store-meta">{行业} · {月份}</span>
    </span>
    <ChevronDown size={14} className="store-chevron" />
  </button>

  {/* 右侧：操作按钮 */}
  <div className="nav-actions">
    <button className="nav-action-btn" onClick={goSub("notifications")} aria-label="消息中心">
      <Bell size={20} />
      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
  </div>
</header>

{/* 大标题区域（滚动时折叠） */}
<div className="large-title-area">
  <h1 className="large-title">{页面标题}</h1>
  <p className="large-subtitle">{页面副标题}</p>
</div>
```

#### 4.2 样式规范（新增，替换 5 处重复定义）

```css
/* === 苹果风格导航栏 === */
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
  background: color-mix(in srgb, var(--sdq-bg-surface) 78%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 0.5px solid var(--sdq-border-subtle);
  transition: background 0.3s ease, border-color 0.3s ease;
}

/* 滚动时加深背景 */
.app-nav-bar.scrolled {
  background: color-mix(in srgb, var(--sdq-bg-surface) 92%, transparent);
}

/* 店铺切换器 */
.store-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 4px 8px 4px 4px;
  border-radius: 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}
.store-switcher:active {
  transform: scale(0.97);
  background: var(--sdq-bg-canvas);
}

/* 店铺头像（44×44 触控区域内的 36×36 logo） */
.store-avatar {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 10px;
  overflow: hidden;
  background: var(--sdq-bg-brand-soft);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
}
.store-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 店铺信息 */
.store-info {
  display: grid;
  gap: 1px;
  min-width: 0;
  text-align: left;
}
.store-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--sdq-text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.store-meta {
  font-size: 11px;
  color: var(--sdq-text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.store-chevron {
  color: var(--sdq-text-tertiary);
  flex: none;
}

/* 导航操作按钮 */
.nav-actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.nav-action-btn {
  position: relative;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--sdq-text-primary);
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}
.nav-action-btn:active {
  transform: scale(0.92);
  background: var(--sdq-bg-canvas);
}

/* 通知徽章（数字） */
.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--sdq-risk);
  border-radius: 8px;
  border: 1.5px solid var(--sdq-bg-surface);
}

/* 大标题区域 */
.large-title-area {
  padding: 8px 16px 16px;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.large-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  color: var(--sdq-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.large-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--sdq-text-secondary);
  line-height: 1.4;
}

/* 滚动时大标题折叠 */
.large-title-area.collapsed {
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  height: 0;
  padding: 0;
  overflow: hidden;
}

/* 减少动效适配 */
@media (prefers-reduced-motion: reduce) {
  .app-nav-bar, .store-switcher, .nav-action-btn, .large-title-area {
    transition: none;
  }
  .store-switcher:active, .nav-action-btn:active {
    transform: none;
  }
}
```

#### 4.3 关键改进点

| 改进项 | 当前 | 整改后 | 对标苹果 |
|---|---|---|---|
| **材质** | 不透明背景 | 毛玻璃半透明（blur 20px + saturate 180%） | ✅ iOS 导航栏 |
| **高度** | 不固定 | 固定 52px + 安全区域 | ✅ iOS 44pt + Safe Area |
| **安全区域** | 无 | padding-top: env(safe-area-inset-top) | ✅ HIG 要求 |
| **店铺名字距** | -0.16em（过紧） | -0.01em（正常） | ✅ 中文可读性 |
| **行业+月份字号** | 8px（不可读） | 11px（可读） | ✅ WCAG AA |
| **双 logo 叠加** | 主logo+店铺徽章 | 单一店铺头像（36×36 圆角） | ✅ 简化认知 |
| **消息按钮** | 35×35 | 40×40（接近 44 标准） | ✅ 触控区域 |
| **未读提示** | 5×5 红点 | 数字徽章（16×16，显示数量） | ✅ iOS Badge |
| **点击反馈** | 无 | :active 缩放 0.97 + 背景高亮 | ✅ Response §1 |
| **大标题** | 无 | 30px bold 大标题区域，滚动折叠 | ✅ iOS Large Title |
| **分层** | 与内容混合 | sticky + 底部边框 + 毛玻璃 | ✅ Materials §12 |
| **CSS 重复** | 5 处定义 | 1 处统一定义 | ✅ Craft §16 |

#### 4.4 大标题滚动折叠交互（可选，如时间允许）

```jsx
// 在 Home.tsx 中添加滚动监听
const [isScrolled, setIsScrolled] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 20);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// JSX 中
<header className={`app-nav-bar ${isScrolled ? 'scrolled' : ''}`}>
  ...
</header>
<div className={`large-title-area ${isScrolled ? 'collapsed' : ''}`}>
  <h1 className="large-title">{页面标题}</h1>
</div>
```

### 方案 B：极简店铺切换器（轻量方案，如不想要大标题）

如果不想要大标题区域，只保留导航栏内的店铺切换：

```jsx
<header className="app-nav-bar">
  <button className="store-switcher-compact">
    <span className="store-avatar-sm">
      <img src={storeLogo} alt="店铺logo" />
    </span>
    <span className="store-name-compact">{店铺名称}</span>
    <ChevronDown size={12} />
  </button>
  <button className="nav-action-btn">
    <Bell size={18} />
    {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
  </button>
</header>
```

**特点：**
- 导航栏高度 48px（更紧凑）
- 店铺头像 32×32，店铺名 15px
- 无大标题区域，内容区直接从导航栏下方开始
- 适合信息密度高的页面（如订单列表）

### 方案对比

| 维度 | 方案 A（大标题导航栏） | 方案 B（极简切换器） |
|---|---|---|
| **视觉冲击力** | ⭐⭐⭐⭐⭐ 苹果风格大标题 | ⭐⭐⭐ 紧凑实用 |
| **空间占用** | 较高（导航栏 52px + 大标题区 ~60px） | 较低（导航栏 48px） |
| **店铺识别度** | ⭐⭐⭐⭐⭐ 大标题+店铺名双重 | ⭐⭐⭐ 仅店铺名 |
| **滚动动效** | 大标题折叠/展开，有层次感 | 无 |
| **实现复杂度** | 中等（需滚动监听+折叠动画） | 低（仅样式替换） |
| **适用页面** | 工作台/洞察（内容型页面） | 订单/商品（列表型页面） |
| **推荐度** | ⭐⭐⭐⭐⭐ 推荐工作台/洞察使用 | ⭐⭐⭐ 推荐订单/商品使用 |

**建议：** 工作台和洞察页使用方案 A（大标题），订单和商品页使用方案 B（紧凑），我的页使用方案 A（大标题"我的"）。

---

## 五、实施步骤

### 步骤 1：清理 CSS 重复定义（P0）

1. 删除 `client/src/index.css` 中第 307/341/360/390/459 行的 `.brand-mini` 重复定义
2. 保留第 284 行的基础定义，或完全替换为新的 `.app-nav-bar` 样式
3. 检查其他页面是否依赖被删除的样式（如订单页 orders-prototype-header）
4. 全局搜索 `.brand-mini`，确认所有使用点都已迁移到新样式

### 步骤 2：新增苹果风格导航栏样式（P0）

1. 在 `client/src/index.css` 中新增 `.app-nav-bar` 系列样式（见方案 A 4.2）
2. 确保毛玻璃效果在 5 种皮肤下正常（深色皮肤可能需要调整透明度）
3. 确保 `backdrop-filter` 在 Safari/Chrome/Firefox 下兼容（加 -webkit- 前缀）

### 步骤 3：重构 Home.tsx logo 区 JSX（P0）

1. 替换第 1049 行的 `<header className="page-header">` 为新结构
2. 店铺切换逻辑保持不变（点击打开店铺选择器）
3. 消息按钮逻辑保持不变
4. 新增大标题区域（页面标题+副标题）

### 步骤 4：添加滚动折叠交互（P1，可选）

1. 添加 `useState` + `useEffect` 滚动监听
2. 滚动 >20px 时，大标题区域折叠，导航栏背景加深
3. 动画用 spring 或 ease，0.2-0.3s
4. 确保 `prefers-reduced-motion` 下禁用动画

### 步骤 5：适配其他页面（P1）

1. 订单页：使用方案 B（紧凑切换器），替换 orders-prototype-header
2. 商品页：使用方案 B
3. 我的页：使用方案 A（大标题"我的"）
4. 子页面：保持现有 sub-header（返回按钮+标题），不使用大标题

### 步骤 6：验证（P0）

1. 三门禁全绿（pnpm check && pnpm test && pnpm build）
2. 5 种皮肤下导航栏颜色/毛玻璃正常
3. 刘海/灵动岛机型安全区域适配（可用浏览器 devtools 模拟）
4. 店铺切换点击反馈正常
5. 消息按钮触控区域 ≥40×40
6. 未读数字徽章显示正常
7. 大标题滚动折叠动画流畅
8. prefers-reduced-motion 下无动画
9. 全局搜索 `.brand-mini`，确认无残留引用
10. 实际截图对比整改前后

---

## 六、验收标准

- [ ] CSS 重复定义已清理（.brand-mini 仅 1 处定义或已替换）
- [ ] 导航栏毛玻璃效果正常（backdrop-filter: blur(20px)）
- [ ] 导航栏高度固定 52px + 安全区域
- [ ] 安全区域适配（env(safe-area-inset-top)）
- [ ] 店铺名字距 -0.01em（非 -0.16em），中文可读
- [ ] 行业+月份字号 11px（非 8px），可读
- [ ] 单一店铺头像（36×36 圆角），无双 logo 叠加
- [ ] 消息按钮 40×40 触控区域
- [ ] 未读通知显示数字徽章（非 5×5 红点）
- [ ] 店铺切换点击有缩放反馈（:active scale 0.97）
- [ ] 大标题区域（30px bold），滚动折叠
- [ ] 导航栏 sticky + 底部边框，与内容区分层
- [ ] 5 种皮肤下导航栏颜色/毛玻璃正常
- [ ] prefers-reduced-motion 下动画禁用
- [ ] 三门禁全绿
- [ ] 变更已登记到 docs/change-log.md

---

## 七、与 Trae 批次的对应关系

本整改方案建议作为 **批次 22：首页 Logo 区苹果风格重构**，在批次 11-21 完成后执行。

**前置依赖：**
- 批次 11（全局配色与令牌）— 颜色令牌已统一
- 批次 12（全局组件）— 组件样式已统一
- 批次 21（可阅读性专项优化）— 字号/行高/字距规范已建立

**涉及文件：**
- `client/src/index.css`（清理 5 处重复定义 + 新增苹果风格导航栏样式）
- `client/src/pages/Home.tsx`（重构 logo 区 JSX + 滚动折叠交互）
- 其他页面（订单/商品/我的）按需适配

---

**报告完成时间：** 2026-09-01
**审查问题数：** P0 五项 / P1 五项 / P2 三项 = 13 项
**整改方案：** 方案 A（大标题导航栏，推荐）+ 方案 B（极简切换器）
**关键改进：** 毛玻璃材质 / 固定高度+安全区域 / 字距修复 / 字号提升 / 双logo简化 / 数字徽章 / 大标题折叠 / CSS去重

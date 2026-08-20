# 移动端图表调研来源笔记

## 外部研究结论

Tableau 的移动仪表盘指南指出，手机受屏幕和触控限制，应先明确单一分析焦点，仅保留真正重要的指标；移动端更适合直接给出洞察和可行动数据，而不是承载复杂的多视图探索或大量筛选器。其建议使用简单、目标明确的数据快照。[1]

Toucan Toco 的移动分析指南提出，移动端财务看板应优先收入、毛利、经营利润率等关键指标，并建议每个视图限制在约 4–5 个 KPI；在小屏上优先使用简单的柱状图或饼图，避免复杂图表造成可读性下降。[2]

FanRuan 的移动经营看板综述也强调实时 KPI、简洁设计、审慎选择图表和只呈现关键指标，以减少小屏环境的数据过载。[3]

GoodData 的图表选择指南建议先定义要回答的业务问题，再选图表；其将 KPI、分组比较、构成、时间变化、关系和明细表作为高频任务，并明确建议避免为装饰而使用复杂图表。[4]

Data to Viz 将条形图视为类别数值比较的高效方式，并建议为长标签采用水平条形、按值排序；同时提醒饼图和环图不适合多类别比较，雷达图通常不是传达信息的最佳方式。[5]

移动径向图研究指出，小屏数据展示需在信息量与呈现之间取舍；极坐标图虽有视觉吸引力，却会增加理解负担并带来长度、角度的误判风险，因此只适合少量、目标导向、可快速扫视的数据。[6]

## 对算得清的含义

图表应服务于单一商家经营问题。首屏最多保留一个短周期趋势和一个可点击的风险/成本构成入口；分析页再承接构成、变化、利润与预警的逐层下钻。优先采用柱状趋势、排序条形、瀑布式利润桥、目标进度与二维热力等直接可读的形式；不建议引入需要密集图例、悬浮提示才能理解的桑基图、雷达图、面积堆叠或多轴复合图。

## 参考来源

[1] Tableau, [Mobile dashboard design: Start with your focus](https://www.tableau.com/blog/smartphone-dashboard-design-start-your-focus-47660)

[2] Toucan Toco, [Mobile Analytics Dashboards: A Comprehensive Guide](https://www.toucantoco.com/en/blog/mobile-dashboards-a-comprehensive-guide)

[3] FanRuan, [Top 12 Mobile Dashboard Apps for Business Analytics in 2026](https://www.fanruan.com/en/blog/top-12-mobile-dashboard-apps)

[4] GoodData, [How To Choose the Best Chart Type To Visualize Your Data](https://www.gooddata.ai/blog/how-to-choose-the-best-chart-type-to-visualize-your-data/)

[5] Data to Viz, [From Data to Viz](https://www.data-to-viz.com/)

[6] Svalina et al., [Assessing the Design of Interactive Radial Data Visualizations for Mobile Devices](https://pmc.ncbi.nlm.nih.gov/articles/PMC10218973/)

import { Info } from "lucide-react";
import { useId, useState } from "react";

type ChartTooltipProps = {
  label: string;
  value: string;
  detail: string;
};

/**
 * 图表统一说明入口：鼠标悬停、键盘聚焦与点击均可查看，移动端以点击开合。
 * 文本均由调用方传入，不参与或改变业务指标计算。
 */
export function ChartTooltip({ label, value, detail }: ChartTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return <span className="chart-tooltip-wrap">
    <button
      type="button"
      className="chart-tooltip-trigger"
      aria-label={`查看${label}说明`}
      aria-expanded={open}
      aria-controls={tooltipId}
      onClick={(event) => { event.stopPropagation(); setOpen((previous) => !previous); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    ><Info size={13} aria-hidden="true" /></button>
    {open && <span id={tooltipId} className="chart-tooltip" role="tooltip"><em>{label}</em><b>{value}</b><small>{detail}</small></span>}
  </span>;
}

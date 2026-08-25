import { useEffect, useRef, useState } from "react";

type AnimatedChartValueProps = {
  value: number;
  format: (value: number) => string;
  duration?: number;
  className?: string;
};

/** 仅动画显示值；入参值、格式和业务口径均由调用方保持不变。 */
export function AnimatedChartValue({ value, format, duration = 360, className }: AnimatedChartValueProps) {
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [displayValue, setDisplayValue] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reducedMotion || from === value) {
      setDisplayValue(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return <span className={className} aria-label={format(value)}>{format(displayValue)}</span>;
}

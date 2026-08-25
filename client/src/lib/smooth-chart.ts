export type SmoothChartPoint = {
  x: number;
  y: number;
};

/**
 * 将真实采样点转换为 Catmull–Rom 插值后的 SVG polyline 坐标。
 * 不改动采样点本身，仅提高线段连接的视觉连续性。
 */
export function buildSmoothLinePoints(points: SmoothChartPoint[], stepsPerSegment = 7): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `${points[0].x},${points[0].y}`;

  const coordinates = [{ ...points[0] }];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const start = points[index];
    const end = points[index + 1];
    const following = points[index + 2] || end;
    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const interpolate = (before: number, from: number, to: number, after: number) => 0.5 * (
        2 * from
        + (-before + to) * t
        + (2 * before - 5 * from + 4 * to - after) * t2
        + (-before + 3 * from - 3 * to + after) * t3
      );
      coordinates.push({
        x: Number(interpolate(previous.x, start.x, end.x, following.x).toFixed(3)),
        y: Number(interpolate(previous.y, start.y, end.y, following.y).toFixed(3)),
      });
    }
  }
  return coordinates.map((point) => `${point.x},${point.y}`).join(" ");
}

/** P0 可访问性：监听系统“减少动态”偏好，供自动轮播与非必要动效即时回退。 */
import { useEffect, useState } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(reducedMotionQuery).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(reducedMotionQuery);
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

import { useState, useEffect } from "react";

/**
 * Hook theo dõi 1 media query CSS, trả về true/false, tự cập nhật khi resize/xoay màn hình.
 * Ví dụ: const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (q: string): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(q).matches;
  };

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    const handleChange = () => setMatches(mediaQueryList.matches);

    // Đồng bộ lại ngay khi query đổi (vd đổi giữa nhiều breakpoint)
    handleChange();

    // Hỗ trợ cả API mới (addEventListener) và fallback cho trình duyệt cũ
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    } else {
      // Safari cũ / trình duyệt cũ dùng addListener
      mediaQueryList.addListener(handleChange);
      return () => mediaQueryList.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

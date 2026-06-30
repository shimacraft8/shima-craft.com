'use client'

/**
 * prefers-reduced-motion の判定
 * コンポーネント側でSSRとの不一致を防ぐため、useEffect内で呼ぶこと
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Intersection Observer を使ったフェードインの設定値
 */
export const fadeInObserverOptions: IntersectionObserverInit = {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px',
}

/**
 * 動画のIntersection Observer設定（画面内に入ったら再生）
 */
export const videoObserverOptions: IntersectionObserverInit = {
  threshold: 0.3,
}

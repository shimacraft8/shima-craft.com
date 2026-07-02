/** User-Agent からの簡易判定（ログ表示用。厳密な判定は不要）。 */

export function detectBrowserName(ua: string): "chrome" | "edge" | "safari" | "firefox" | "other" {
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\/|Opera/.test(ua)) return "other";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "safari";
  return "other";
}

export function detectDeviceType(ua: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

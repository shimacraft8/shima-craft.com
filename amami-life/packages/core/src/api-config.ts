export function apiBase(value: string | undefined, development = false): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || u.pathname !== "/") return null;
    if (development && u.protocol === "http:" && /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(u.hostname)) return u.origin;
    if (u.protocol !== "https:" || u.port || !u.hostname.includes(".") ||
      /(^|\.)(localhost|local|test|invalid|example)(\.|$)/.test(u.hostname) ||
      /^[\d.]+$/.test(u.hostname) || u.hostname.includes(":")) return null;
    return u.origin;
  } catch { return null; }
}

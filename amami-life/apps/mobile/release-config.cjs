// No resource creation, credential lookup, build upload or environment writes.
function httpsOrigin(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.pathname !== '/' || u.search || u.hash || !u.hostname.includes('.') || /^[\d.]+$/.test(u.hostname) || /(^|\.)(localhost|local|test|invalid|example)(\.|$)/.test(u.hostname)) return false;
    return true;
  } catch { return false; }
}
function httpsPage(value) {
  try { const u = new URL(value); return httpsOrigin(u.origin) && !u.username && !u.password; } catch { return false; }
}
function releaseValues(env) {
  const rules = {
    AMAMI_IOS_BUNDLE_ID: v => /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(v),
    AMAMI_ANDROID_PACKAGE: v => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(v),
    AMAMI_EXPO_OWNER: v => /^[a-z0-9][a-z0-9_-]{1,38}$/.test(v),
    AMAMI_EAS_PROJECT_ID: v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
    AMAMI_RELEASE_VERSION: v => /^\d+\.\d+\.\d+$/.test(v),
    EXPO_PUBLIC_API_BASE_URL: httpsOrigin,
    EXPO_PUBLIC_PRIVACY_URL: httpsPage,
    EXPO_PUBLIC_SUPPORT_URL: httpsPage,
  };
  const missing = Object.entries(rules).filter(([key, valid]) => !env[key] || !valid(env[key])).map(([key]) => key);
  if (missing.length) throw new Error('Release configuration incomplete: ' + missing.join(', ') + '. See docs/STORE_RELEASE.md.');
  return Object.fromEntries(Object.keys(rules).map(key => [key, env[key]]));
}
module.exports = { releaseValues };

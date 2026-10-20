import { createCycloneProvider } from "./cyclones.mjs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import { createHash } from "node:crypto";
import { createWeatherProvider } from "./weather.mjs";
import { createObservationProvider } from "./observations.mjs";
import {
  AREAS,
  LINKS,
  validDate,
  solarForDate,
  unknownSource,
  parseTideText,
  todayJST,
} from "../packages/core/src/index.ts";
const root = fileURLToPath(new URL("..", import.meta.url));
const raw = await readFile(
  new URL("./data/O9-2026.txt", import.meta.url),
  "utf8",
);
const tides = parseTideText(raw);
const tideProvenance = JSON.parse(
  await readFile(
    new URL("./data/tide-provenance.json", import.meta.url),
    "utf8",
  ),
);
const sourceHash = createHash("sha256").update(raw).digest("hex");
const states = ["ready", "loading", "empty", "error", "stale", "offline"];
const rate = new Map();
const wrap = (data, source, mode = "demo") => ({
  schemaVersion: 1,
  mode,
  data,
  source,
});
export function api(url) {
  const area = AREAS.find(
    (a) => a.id === (url.searchParams.get("area") ?? "naze"),
  );
  const date = url.searchParams.get("date") ?? todayJST();
  const state = url.searchParams.get("state") ?? "ready";
  const mode = url.searchParams.get("mode") ?? "demo";
  if (
    !area ||
    !validDate(date) ||
    !states.includes(state) ||
    !["demo", "live"].includes(mode)
  )
    return { code: 400, body: { error: "invalid-input" } };
  const unknown = unknownSource("jma-xml", "https://www.jma.go.jp/bosai/");
  if (url.pathname === "/v1/service-health")
    return {
      code: 200,
      body: {
        schemaVersion: 1,
        mode: "local",
        endpoints: ["/v1/weather?mode=live", "/v1/observations"],
        currentHazardsIntegrated: false,
        cyclonesIntegrated: true,
        sources: [{ ...unknown, status: "not-connected" }],
      },
    };
  if (url.pathname === "/v1/observations")
    return { code: 200, body: null };
  if (url.pathname === "/v1/hazards" || url.pathname === "/v1/cyclones")
    return {
      code: 200,
      body: wrap(
        { state: "unknown", events: [], coverage: "unverified" },
        unknown,
      ),
    };
  if (url.pathname === "/v1/transport")
    return {
      code: 200,
      body: wrap(
        LINKS.filter((l) => l.category === "transport"),
        unknownSource(
          "official-links",
          "https://www.amami-airport.co.jp/flight/today",
        ),
        "reference",
      ),
    };
  if (url.pathname === "/v1/places")
    return {
      code: 200,
      body: wrap(
        [],
        unknownSource("curated-poi", "https://www.amami-tourism.org/"),
      ),
    };
  if (url.pathname === "/v1/solar")
    return {
      code: 200,
      body: wrap(
        solarForDate(date, area.lat, area.lon),
        unknownSource("suncalc-local", "https://github.com/mourner/suncalc"),
        "reference",
      ),
    };
  const tide =
    area.station === "O9" ? (tides.find((t) => t.date === date) ?? null) : null;
  const tideSource = {
    ...unknownSource(
      "jma-tide-O9",
      "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=O9",
    ),
    fetchedAt: tideProvenance.fetchedAt,
    checkedAt: tideProvenance.fetchedAt,
    expiresAt: tideProvenance.expiresAt,
    station: area.station,
    kind: "astronomical_tide_prediction",
    unit: "cm_above_tide_table_datum",
    datumElevationCm: -108,
    archiveSha256: sourceHash,
    archiveOrigin:
      "JMA official text download; byte-identical to existing local SHIMA CRAFT archive",
    verifiedOn: "2026-10-13",
  };
  if (url.pathname === "/v1/tides")
    return { code: 200, body: wrap(tide, tideSource, "reference") };
  if (url.pathname === "/v1/weather")
    return {
      code: 200,
      body: wrap(
        state === "ready"
          ? {
              temperatureC: 26,
              description: "晴れ",
              kind: "sun",
              minC: 24,
              maxC: 28,
            }
          : null,
        unknownSource("weather-demo", "https://www.jma.go.jp/bosai/"),
      ),
    };
  if (url.pathname === "/v1/today") {
    if (state === "error")
      return {
        code: 503,
        body: { error: "injected-source-failure", source: unknown },
      };
    return {
      code: 200,
      body: wrap(
        {
          area,
          date,
          state,
          solar: solarForDate(date, area.lat, area.lon),
          tide: state === "ready" ? tide : null,
          tideSource,
          weather:
            state === "ready"
              ? {
                  temperatureC: 26,
                  minC: 24,
                  maxC: 28,
                  kind: "sun",
                  description: "晴れ",
                }
              : null,
          hazards: { state: "unknown", source: unknown },
        },
        unknown,
      ),
    };
  }
  return { code: 404, body: { error: "not-found" } };
}
export async function requestApi(url, weatherProvider, observationProvider, cycloneProvider) {
  const result = api(url);
  if(result.code===200 && url.pathname==="/v1/cyclones" && cycloneProvider) {const body=await cycloneProvider.get();return {code:body.status==="unavailable" ? 503 : 200,body};}
  if (result.code === 200 && url.pathname === "/v1/observations") {
    if ((url.searchParams.get("state") ?? "ready") !== "ready")
      return { code: 200, body: { schemaVersion: 1, mode: "reference", data: null, status: "unavailable", source: unknownSource("observation-qa", "https://www.jma.go.jp/bosai/amedas/"), refreshPolicy: "QA状態では上流を取得しません。" } };
    const body = await observationProvider.get(
      url.searchParams.get("area") ?? "naze",
      url.searchParams.get("date") ?? todayJST(),
    );
    return { code: body.status === "unavailable" ? 503 : 200, body };
  }
  if (
    result.code === 200 &&
    url.pathname === "/v1/weather" &&
    url.searchParams.get("mode") === "live"
  ) {
    if ((url.searchParams.get("state") ?? "ready") !== "ready")
      return {
        code: 200,
        body: { ...result.body, data: null, status: "unavailable" },
      };
    const body = await weatherProvider.get(
      url.searchParams.get("area") ?? "naze",
      url.searchParams.get("date") ?? todayJST(),
    );
    return { code: body.status === "unavailable" ? 503 : 200, body };
  }
  return result;
}
export function createApp({ cycloneProvider = createCycloneProvider(), weatherProvider = createWeatherProvider(), observationProvider = createObservationProvider(), apiOnly = false } = {}) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const common = {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    };
    if (
      /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin ?? "")
    ) {
      common["Access-Control-Allow-Origin"] = req.headers.origin;
      common.Vary = "Origin";
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { ...common, Allow: "GET, HEAD" });
      res.end();
      return;
    }
    if (apiOnly && !["/v1/observations", "/v1/weather", "/v1/service-health", "/v1/cyclones", "/v1/cyclones/chart"].includes(url.pathname)) {
      res.writeHead(404, common); res.end(); return;
    }
    if (apiOnly && url.pathname === "/v1/weather" && url.searchParams.get("mode") !== "live") {
      res.writeHead(400, common); res.end(); return;
    }
    if (url.pathname.startsWith("/v1/")) {
      const key = req.socket.remoteAddress ?? "local",
        now = Date.now(),
        last = rate.get(key);
      const bucket =
        last && now - last.since < 60_000 ? last : { since: now, count: 0 };
      bucket.count++;
      rate.set(key, bucket);
      if (rate.size > 1000) for (const [ip, value] of rate) if (now - value.since >= 60_000) rate.delete(ip);
      if (bucket.count > 120) {
        res.writeHead(429, { ...common, "Retry-After": "60" });
        res.end();
        return;
      }
      if(url.pathname==="/v1/cyclones/chart") {const image=await cycloneProvider.image(url.searchParams.get("version"));res.writeHead(image ? 200 : 410,{...common,"Content-Type":image ? "image/png" : "text/plain"});res.end(req.method==="HEAD" ? undefined : image ?? "Image unavailable");return;}
      const result = await requestApi(url, weatherProvider, observationProvider, cycloneProvider);
      res.writeHead(result.code, {
        ...common,
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(result.body));
      return;
    }
    try {
      const pathname = decodeURIComponent(url.pathname);
      const base = pathname.startsWith("/design/")
        ? resolve(root, "design")
        : resolve(root, "web");
      const relative = pathname.startsWith("/design/")
        ? pathname.slice(8)
        : pathname === "/"
          ? "index.html"
          : pathname.slice(1);
      const target = resolve(base, relative);
      if (!target.startsWith(base + sep)) {
        res.writeHead(403, common);
        res.end();
        return;
      }
      const content = await readFile(target);
      const mime =
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
        }[extname(target)] ?? "application/octet-stream";
      res.writeHead(200, {
        ...common,
        "Content-Type": mime,
        "Content-Security-Policy":
          "default-src 'self'; img-src 'self' data: https://cyberjapandata.gsi.go.jp; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-src 'self' https://www.amami-airport.co.jp https://amami-airport.co.jp; object-src 'none'; base-uri 'self'",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(404, common);
      res.end("Not found");
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.env.NODE_ENV === "production" && process.env.AMAMI_API_ONLY !== "1")
    throw new Error("Production requires AMAMI_API_ONLY=1; do not serve local design/demo files publicly.");
  createApp({ apiOnly: process.env.AMAMI_API_ONLY === "1" }).listen(Number(process.env.PORT ?? 4837), process.env.HOST ?? "127.0.0.1", () =>
    console.log(
      `AMAMI LIFE local preview: http://localhost:${process.env.PORT ?? 4837}`,
    ),
  );
}

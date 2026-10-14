import {
  AREAS,
  LINKS,
  STATE_COPY,
  addDays,
  todayJST,
  solarForDate,
  timeJST,
  unknownSource,
  validDate,
  safetyLinks,
  freshness,
} from "./core.js";
import { findOfficialLinks, nextTideEvent, precipitationWindow } from "./usage.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const PUBLIC = document.documentElement.dataset.release === "public";
const API_BASE = PUBLIC ? "/amami-life-api" : "/v1";
const params = new URLSearchParams(location.search);
const tabs = [
  ["today", "今日", "sun"],
  ["explore", "探す", "compass"],
  ["move", "移動", "plane"],
  ["safety", "防災", "shield"],
  ["more", "その他", "menu"],
];
function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem("amami:" + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function persist(key, value) {
  try {
    localStorage.setItem("amami:" + key, JSON.stringify(value));
    return true;
  } catch {
    toast("端末に保存できませんでした");
    return false;
  }
}
let areaId = params.get("area") ?? stored("area", "naze");
if (!AREAS.some((a) => a.id === areaId)) areaId = "naze";
let theme = params.get("theme") ?? stored("theme", "paper");
if (!["paper", "ink"].includes(theme)) theme = "paper";
let date = validDate(params.get("date") ?? "")
    ? params.get("date")
    : todayJST(),
  tab = tabs.some((t) => t[0] === location.hash.slice(1))
    ? location.hash.slice(1)
    : "today";
let state = PUBLIC ? "ready" : params.get("state") ?? "ready";
if (!STATE_COPY[state]) state = "ready";
let sky = params.get("sky") === "rain" ? "rain" : "sun",
  query = params.get("q") ?? "",
  filter = ["all", "transport", "safety", "explore"].includes(
    params.get("filter"),
  )
    ? params.get("filter")
    : "all",
  snapshot = null,
  requestId = 0,
  fetchError = false;
let observation = null, observationLoading = false, observationScope = null;
let forecast = null,
  forecastLoading = false,
  forecastAreaId = null;
let saved =
  stored("saved", []).filter?.((id) => LINKS.some((l) => l.id === id)) ?? [];
let note = stored("note", "");
if (typeof note !== "string") note = "";
const area = () => AREAS.find((a) => a.id === areaId);
function icon(name) {
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    compass:
      '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
    plane: '<path d="m21 3-7 18-3-8-8-3zM21 3 11 13"/>',
    shield: '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6zM12 8v5m0 4h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.sun}</svg>`;
}
function illustration(kind = "sun") {
  const waves = Array.from({ length: 19 }, (_, i) => {
    const width = 238 - i * 7;
    return `<path d="M${(320 - width) / 2} ${158 + i * 4.1}h${width}" stroke="var(--art)" stroke-width="${2.6 - i * 0.075}" opacity="${Math.max(0, 1 - i / 19)}"/>`;
  }).join("");
  const birds = [
    [213, 64, 0.8],
    [231, 76, 1],
    [195, 78, 0.65],
    [253, 89, 0.7],
    [222, 94, 0.55],
  ]
    .map(
      ([x, y, s]) =>
        `<path transform="translate(${x} ${y}) scale(${s})" d="M-6-3Q-1-3 0 2Q2-3 7-4L3 1 0 5-2 1Z" fill="var(--ink)"/>`,
    )
    .join("");
  const sun = `<path d="M64 151a96 96 0 0 1 192 0Z" fill="var(--art)"/>${waves}<path d="M65 145c21 0 22-13 12-17-9-4-15 8-7 10 9 3 13-16 3-23m1 19c15-2 19 12 35 8 17-5 12-19 4-17-8 3-2 10 4 8m-24-14c5-3 9 0 9 4" fill="none" stroke="var(--paper)" stroke-width="4" stroke-linecap="round"/>${birds}`;
  const rain = `<g fill="var(--ink)" opacity=".85"><path d="M57 136c-15-25 5-50 29-48-3-47 61-57 76-16 20-13 49-1 52 23 28-2 45 15 51 45-19-18-36-9-46-3-27 20-44 1-61 5-36 7-55 13-65-4Z"/></g><g stroke="var(--paper)" fill="none" stroke-width="5" stroke-linecap="round"><path d="M93 116c25 3 26-28 8-29-22-2-27 34-9 40 24 9 43-9 40-27M163 114c27 15 47-8 41-23"/></g><g stroke="var(--ink)" stroke-width="2.4" opacity=".75">${Array.from({ length: 8 }, (_, i) => `<path d="m${110 + i * 13} ${154 + (i % 2) * 8} 12 16"/>`).join("")}</g>`;
  return `<svg viewBox="0 0 320 245" aria-hidden="true">${kind === "rain" ? rain : sun}</svg>`;
}
function emptyArt() {
  return '<svg viewBox="0 0 180 140" aria-hidden="true"><circle cx="110" cy="42" r="25" fill="var(--gold)" opacity=".8"/><path d="M17 104 57 43l26 38 24-21 55 44Z" fill="var(--ink)" opacity=".8"/><path d="M12 111h156m-146 8h126m-106 8h86" stroke="var(--muted)" stroke-width="1"/></svg>';
}
function dateLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00+09:00`));
}
function top(en, title, num) {
  return `<div class="page-top"><div><div class="eyebrow">${en}</div><h2>${title}</h2></div><span class="page-index" aria-hidden="true">${num}</span></div>`;
}
function statePanel() {
  if (state === "ready" && !fetchError) return "";
  const info = STATE_COPY[fetchError ? "error" : state];
  return `<section class="state-panel" role="status"><div class="state-mark" aria-hidden="true">${state === "loading" ? "···" : "—"}</div><h3>${info.title}</h3><p>${info.body}</p>${state !== "loading" ? '<button class="retry" data-action="retry">もう一度読み込む</button>' : ""}</section>`;
}
function sourceBlock(
  source = unknownSource("jma-xml", "https://www.jma.go.jp/bosai/"),
) {
  return `<div class="provenance"><b>情報の取得状態 · 未接続</b><dl><dt>発表</dt><dd>${timeJST(source.issuedAt)}</dd><dt>取得</dt><dd>${timeJST(source.fetchedAt)}</dd><dt>有効期限</dt><dd>${timeJST(source.expiresAt)}</dd></dl><span>出典：気象庁。現在の警報状況は未確認です。</span></div>`;
}
function linkRow(link, index = 0) {
  return `<div class="row"><a href="${link.url}" target="_blank" rel="noopener noreferrer"><span class="num" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="row-main"><strong>${link.title}</strong><small>${link.subtitle}<br>${link.jurisdiction} · リンク確認 ${link.checkedOn}</small></span><span aria-hidden="true">↗</span><span class="sr-only">（外部サイト）</span></a><button class="save" data-save="${link.id}" aria-pressed="${saved.includes(link.id)}" aria-label="${link.title}を${saved.includes(link.id) ? "保存から外す" : "保存する"}">${saved.includes(link.id) ? "◆" : "◇"}</button></div>`;
}
function forecastPanel() {
  const heading =
    '<div class="section-head"><h3>気象庁の地域予報</h3><span>奄美地方</span></div>';
  if (state !== "ready")
    return (
      heading +
      '<p class="body-copy compact">状態確認中は地域予報を取得しません。</p>'
    );
  if (
    forecastLoading ||
    forecastAreaId !== areaId ||
    (forecast?.data && forecast.data.date !== date)
  )
    return (
      heading +
      '<p class="body-copy compact" role="status">地域予報を読み込んでいます…</p>'
    );
  if (!forecast)
    return (
      heading +
      '<p class="body-copy compact" role="status">地域予報を取得できませんでした。</p><button class="text-button" data-action="retry-weather">地域予報を再取得</button>'
    );
  if (
    forecast.status === "ready" &&
    freshness(forecast.source, new Date()) !== "recent"
  )
    forecast.status = "stale";
  const d = forecast.data;
  const label =
    {
      ready: "取得済みの予報",
      empty: "この日付の予報はありません",
      stale: "一部の予報が古い可能性があります",
      unavailable: "予報を取得できません",
      "refresh-failed": "更新に失敗 · 保存済みの古い予報",
    }[forecast.status] ?? "状態未確認";
  return (
    heading +
    `<p class="body-copy compact" role="status">${label}</p>${d ? `<p class="body-copy compact">${esc(d.description ?? "週間予報。詳細な天気文は未提供です。")}</p>${d.wind ? `<p class="source-note">風：${esc(d.wind)}</p>` : ""}${d.waves ? `<p class="source-note">波：${esc(d.waves)}</p>` : ""}${d.temperature ? `<p class="body-copy compact">名瀬の週間気温予報：最低 ${d.temperature.minC ?? "—"}°C / 最高 ${d.temperature.maxC ?? "—"}°C</p>` : ""}${d.precipitation.length ? `<p class="source-note">降水確率（各時刻からの6時間）<br>${d.precipitation.map((p) => `${timeJST(p.startsAt)}：${p.percent ?? "—"}%`).join("<br>")}</p>` : d.weeklyPrecipitation !== null ? `<p class="source-note">週間降水確率：${d.weeklyPrecipitation}% · 信頼度 ${esc(d.reliability ?? "—")}</p>` : ""}` : ""}<p class="source-note">地域全体の予報で、${esc(area().name)}の実況ではありません。上の気温は観測所の値、絵は島の意匠です。</p><div class="provenance"><dl><dt>発表</dt><dd>${timeJST(forecast.source.issuedAt)}</dd><dt>取得</dt><dd>${timeJST(forecast.source.fetchedAt)}</dd><dt>鮮度目安</dt><dd>${timeJST(forecast.source.expiresAt)}</dd></dl><span>発表から6時間で古い表示にします。気象庁が定めた有効期限ではありません。</span></div><a class="inline-link" href="https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=460040" target="_blank" rel="noopener">気象庁の地域予報<span aria-hidden="true">↗</span></a>`
  );
}
async function loadForecast(id) {
  const previous=forecastAreaId===areaId && forecast?.data?.date===date ? forecast : null;
  forecast = previous;
  forecastAreaId = areaId;
  forecastLoading = state === "ready";
  if (!forecastLoading) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);
  try {
    const res = await fetch(
      `${API_BASE}/weather?mode=live&area=${areaId}&date=${date}`,
      { signal: controller.signal },
    );
    const payload = await res.json();
    if (id !== requestId) return;
    if (
      payload.schemaVersion !== 1 ||
      !payload.source ||
      !["ready", "empty", "stale", "unavailable", "refresh-failed"].includes(
        payload.status,
      ) ||
      (payload.data &&
        (payload.data.date !== date || payload.data.region?.code !== "460040"))
    )
      throw new Error("invalid-forecast-response");
    forecast = payload;
  } catch {
    if (id !== requestId) return;
    forecast = previous ? {...previous,status:"refresh-failed"} : null;
  } finally {
    clearTimeout(timer);
    if (id === requestId) {
      forecastLoading = false;
      const section = $("#forecast");
      if (section) section.innerHTML = forecastPanel();
      const brief=$("#forecast-brief");
      if (brief) brief.innerHTML=forecastBrief();
    }
  }
}
function forecastBrief() {
  const p=forecastAreaId===areaId && forecast?.data?.date===date ? forecast : null;
  if (!p) return `<p class="source-note" role="status">${forecastLoading ? "地域予報を読み込み中…" : "この日付の地域予報は未取得です"}</p>`;
  const d=p.data, rain=precipitationWindow(d,new Date());
  const stale=p.status!=="ready" || freshness(p.source,new Date())!=="recent";
  const label=rain ? `${rain.label}の雨 ${rain.percent ?? "—"}%` : d.weeklyPrecipitation!==null ? `週間の降水確率 ${d.weeklyPrecipitation}%` : "降水確率は未取得";
  return `<p class="forecast-brief">${esc(d.description ?? "週間予報")}</p><p class="source-note">${esc(label)} · 奄美地方の予報</p>${stale ? '<p class="source-note forecast-warning" role="status">古い予報・更新状態を詳細で確認してください</p><button class="text-button" data-action="retry-weather">予報を再取得</button>' : ""}`;
}
function todayFacts() {
  const sun=snapshot?.solar ?? solarForDate(date,area().lat,area().lon);
  const next=nextTideEvent(snapshot?.tide ?? null,snapshot?.tomorrowTide ?? null,new Date());
  return `<div class="facts-grid today-brief"><div class="fact"><div class="fact-label">${next ? (next.date!==date ? "翌日・" : date===todayJST() ? "次の" : "この日の")+next.kind : "潮汐予測"}</div><div class="fact-value">${next?.time ?? "—"}</div><div class="fact-note">${next ? `${next.heightCm} cm · O9予測` : area().station ? "この日の値は未取得" : "対象局は未連携"}</div></div><div class="fact"><div class="fact-label">日の入り</div><div class="fact-value">${sun.sunset ?? "—"}</div><div class="fact-note">地点別の参考計算</div></div></div>`;
}
function observationHero() {
  const p = observationScope === areaId + ":" + date ? observation : null;
  const d = date === todayJST() ? p?.data : null;
  const old = d && (p.status === "refresh-failed" || p.status === "stale" || Date.parse(p.source.expiresAt) <= Date.now());
  const value = typeof d?.temperatureC === "number" ? d.temperatureC.toFixed(1) : "—";
  const label = date !== todayJST() ? "実況は今日のみ表示" : observationLoading ? "観測値を読み込み中…" : old ? "古い観測値です" : !p || p.status === "unavailable" ? "観測値を取得できません" : d?.temperatureC == null ? "気温は未取得・欠測" : "気象庁の観測気温";
  return `<div class="weather-top"><div class="temperature" aria-label="${esc(label)} ${value}度">${value}<span class="degree" aria-hidden="true">°</span><span class="unit">C</span></div><div class="weather-caption"><div class="weather-name">${esc(d?.station?.name ?? area().name)}</div><small role="status">${esc(label)}</small></div></div><div id="forecast-brief">${forecastBrief()}</div><div class="weather-art">${illustration(sky)}</div><div class="place-caption"><strong>AMAMI ŌSHIMA</strong><small>島の意匠 · 絵は天気の実況を示しません</small></div>${todayFacts()}${d ? `<details class="source-details"><summary>観測の出典・時刻</summary><p class="source-note">観測：${timeJST(d.observedAt)}<br>取得：${timeJST(p.source.fetchedAt)}<br>観測から20分を鮮度の目安としています。</p><button class="text-button" data-action="retry-weather">観測・予報を再取得</button></details>` : ""}${date === todayJST() && !observationLoading && (!d || old) ? '<button class="text-button" data-action="retry-weather">観測・予報を再取得</button>' : ""}`;
}
async function loadObservation(id) {
  const previous=observationScope===areaId+":"+date ? observation : null;
  observation = previous; observationScope = areaId + ":" + date;
  observationLoading = state === "ready";
  if (!observationLoading) return;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5500);
  try {
    const res = await fetch(`${API_BASE}/observations?area=${areaId}&date=${date}`, { signal: controller.signal });
    const p = await res.json();
    if (p.schemaVersion !== 1 || !p.source || !["ready", "empty", "stale", "unavailable", "refresh-failed"].includes(p.status) || (p.data && !["88837", "88821", "88901"].includes(p.data.station?.code))) throw new Error("invalid-observation");
    if (id === requestId) observation = p;
  } catch { if (id === requestId) observation = previous ? {...previous,status:"refresh-failed"} : null; }
  finally {
    clearTimeout(timer);
    if (id === requestId) { observationLoading = false; const hero = $("#current-observation"); if (hero) hero.innerHTML = observationHero(); }
  }
}
function today() {
  const sun = snapshot?.solar ?? solarForDate(date, area().lat, area().lon);
  const tide = snapshot?.tide;
  const isReady = state === "ready" && !fetchError;
  return `${date!==todayJST() ? '<button class="text-button" data-action="go-today">今日の日付に戻る</button>' : ""}<div class="date-row"><button data-date="-1" aria-label="前の日">‹</button><div class="date-label">${dateLabel()}<span>${date.replaceAll("-", ".")} / JST</span></div><button data-date="1" aria-label="次の日">›</button></div>${isReady ? `<div id="current-observation">${observationHero()}</div>` : statePanel()}
  <div class="facts-grid"><div class="fact"><div class="fact-label">日の出</div><div class="fact-value">${sun.sunrise ?? "—"}</div><div class="fact-note">方位 ${sun.riseAzimuth ?? "—"}° / 真北基準</div></div><div class="fact"><div class="fact-label">日の入り</div><div class="fact-value">${sun.sunset ?? "—"}</div><div class="fact-note">方位 ${sun.setAzimuth ?? "—"}° / 真北基準</div></div></div><p class="source-note">SunCalcによる地点別の参考計算。地形・標高による見え方は異なります。</p>
  <section id="forecast">${forecastPanel()}</section>
  <div class="section-head"><h3>潮の満ち引き</h3><span>${area().station ? "O9 / 予測" : "対象局未連携"}</span></div>${tide && isReady ? `<div class="tide-events"><div><div class="fact-label">満潮</div>${tide.highTides.map((t) => `<p>${t.time}　${t.heightCm} cm</p>`).join("") || "<p>対象なし</p>"}</div><div><div class="fact-label">干潮</div>${tide.lowTides.map((t) => `<p>${t.time}　${t.heightCm} cm</p>`).join("") || "<p>対象なし</p>"}</div></div><p class="source-note">気象庁・奄美（名瀬小湊）2026年の保存済み天文潮位予測を加工表示。基準面上cm。実測値ではありません。</p>` : `<p class="body-copy compact">${area().station ? "この日付の予測値は未取得です。" : "この地点の潮汐データは未連携です。名瀬小湊の値を流用しません。"}</p>`}${area().station ? `<p class="source-note">取得：${timeJST(snapshot?.tideSource?.fetchedAt ?? null)} · 予測対象：2026年。原データの発表時刻は未確認。</p>` : ""}<a class="inline-link" target="_blank" rel="noopener" href="https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=O9">気象庁の潮位表 · 名瀬小湊<span aria-hidden="true">↗</span></a>
  <div class="section-head"><h3>島で、すぐ使う</h3><span>QUICK ACCESS</span></div><a class="inline-link" href="#move">飛行機・フェリー・バス<span aria-hidden="true">→</span></a><a class="inline-link" href="#safety">台風・地震・避難情報<span aria-hidden="true">→</span></a><div class="notice"><strong>防災情報は未接続です</strong><p>現在の警報状況は公式発表をご確認ください。</p></div>`;
}
function explore() {
  const results = findOfficialLinks(query,filter,areaId);
  return `${top("FIND YOUR ISLAND", "島を探す", "02")}<p class="body-copy">行きたい場所も、必要な情報も。</p><label class="search-label" for="search">施設・交通・公式情報を検索</label><input id="search" name="search" class="search-input" type="search" autocomplete="off" placeholder="例：空港、バス、津波…" value="${esc(query)}"><div class="filters" aria-label="検索対象"><button data-filter="all" aria-pressed="${filter === "all"}">すべて</button><button data-filter="transport" aria-pressed="${filter === "transport"}">移動</button><button data-filter="safety" aria-pressed="${filter === "safety"}">防災</button><button data-filter="explore" aria-pressed="${filter === "explore"}">観光</button></div><div id="search-results" aria-live="polite">${searchResults(results)}</div>`;
}
function searchResults(results) {
  if (state !== "ready" || fetchError) return statePanel();
  return results.length
    ? `<p class="source-note">${results.length}件の公式リンク</p>${results.map(linkRow).join("")}`
    : `<div class="empty-illustration">${emptyArt()}</div><h3 class="empty-title">${query ? "条件に合う情報がありません" : "まだ知らない、島のかたち。"}</h3><p class="empty-copy">${query ? "キーワードや検索対象を変えてください。" : "空港・船・バス・観光・防災の公式情報を検索できます。"}<span>店舗・設備の地点情報は確認・整備中です。</span></p><div class="notice"><strong>地図とスポット情報は準備中</strong><p>施設の位置・利用条件を確認してから掲載します。</p></div>${
        !query && filter === "all"
          ? `<div class="section-head"><h3>島の公式ガイド</h3><span>LOCAL GUIDE</span></div>${LINKS.filter(
              (l) => l.category === "explore",
            )
              .map(linkRow)
              .join("")}`
          : ""
      }`;
}
function move() {
  return `${top("GET AROUND", "島をめぐる", "03")}<p class="body-copy">空から、海から、島の道へ。<br>移動の前に、公式の案内を。</p>${statePanel()}${LINKS.filter(
    (l) => l.category === "transport",
  )
    .map(linkRow)
    .join(
      "",
    )}<div class="section-head"><h3>タクシー・運転代行</h3><span>DIRECTORY</span></div><p class="body-copy compact">営業状況と電話番号の掲載確認を進めています。確認前の番号は公開・発信できません。</p><a class="inline-link" href="https://www.city.amami.lg.jp/kanko/kanko/kanko/access.html" target="_blank" rel="noopener">奄美市の交通案内<span aria-hidden="true">↗</span></a><p class="source-note">このアプリで運航の正常・遅延・欠航を判定していません。日付・便・寄港地は各社の発表でご確認ください。</p>`;
}
function safety() {
  return `${top("OFFICIAL INFORMATION", "防災と避難", "04")}<div class="notice"><div class="eyebrow">重要 / 状況未確認</div><strong>現在の状況を確認できません</strong><p>地震・津波・気象警報の自動取得は未接続です。公式発表をご確認ください。</p></div>${statePanel()}<p class="body-copy">強い揺れ・長い揺れを感じたら、情報を待たず、海岸から離れて高い場所へ避難してください。</p><div class="emergency"><button data-call="110"><span>警察</span><strong>110</strong></button><button data-call="119"><span>消防・救急</span><strong>119</strong></button></div>${safetyLinks(areaId).map(linkRow).join("")}${areaId === "koniya" ? '<div class="notice"><strong>ここは瀬戸内町です</strong><p>奄美市ハザードマップの対象外です。この地域の公式情報は瀬戸内町ハザードマップをご確認ください。</p></div>' : ""}${sourceBlock()}<p class="source-note">台風情報には、24時間以内に台風へ発達する見込みの熱帯低気圧が含まれます。その前段階のすべての熱帯低気圧を網羅しません。地震履歴・緊急地震速報・現在の津波警報は別の情報です。端末標準の緊急速報を代替しません。</p>`;
}
function more() {
  return `${top("MAKE IT YOURS", "島との付き合い方", "05")}${statePanel()}<div class="controls"><div class="control-row"><label for="region">表示する地域</label><select id="region">${AREAS.map((a) => `<option value="${a.id}" ${a.id === areaId ? "selected" : ""}>${a.name} · ${a.municipality}</option>`).join("")}</select></div><div class="control-row"><label for="theme">画面のあしらい</label><select id="theme"><option value="paper" ${theme === "paper" ? "selected" : ""}>朱と和紙</option><option value="ink" ${theme === "ink" ? "selected" : ""}>墨と金</option></select></div><div class="control-row"><label for="large-text">文字を大きく</label><input type="checkbox" id="large-text" ${document.body.dataset.text === "large" ? "checked" : ""}></div></div><div class="section-head"><h3>保存した公式情報</h3><span>${saved.length} SAVED</span></div>${
    saved.length
      ? LINKS.filter((l) => saved.includes(l.id))
          .map(linkRow)
          .join("")
      : '<p class="body-copy compact">移動・防災の◇を押すと、ここに保存できます。</p>'
  }<label class="search-label" for="note">旅のメモ · この端末だけに保存</label><textarea id="note" name="note" autocomplete="off" class="note-input" maxlength="2000" placeholder="港の名前、帰りの時間、忘れたくないこと。">${esc(note)}</textarea><button class="text-button" data-action="save-note">メモを保存</button><p class="source-note">メモは入力時にも自動保存します。メモ・選択地域・保存リンクはこのブラウザに保存します。アカウント作成、位置情報取得、アクセス解析、通知送信はありません。端末の保存領域を消去すると失われます。</p><div class="section-head"><h3>オフラインについて</h3></div><p class="body-copy compact">メモとリンクはこのブラウザに保存します。ページの再読み込み・外部ページ・最新情報の取得には通信が必要です。警報の最新性は保証しません。</p>${PUBLIC ? "" : `<details><summary class="text-button">試作の表示確認</summary><div class="control-row"><label for="data-state">データ表示の状態</label><select id="data-state">${Object.entries(
    STATE_COPY,
  )
    .map(
      ([id, copy]) =>
        `<option value="${id}" ${state === id ? "selected" : ""}>${copy.title}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="control-row"><label for="sky">天気のイラスト</label><select id="sky"><option value="sun" ${sky === "sun" ? "selected" : ""}>日輪と海</option><option value="rain" ${sky === "rain" ? "selected" : ""}>墨の雨雲</option></select></div><p class="source-note">表示確認専用です。実際の天気を変える操作ではありません。</p></details>`}<div class="section-head"><h3>出典と情報修正</h3></div><p class="body-copy compact">太陽：SunCalc参考計算。潮汐：気象庁の名瀬小湊O9、2026年保存データ。天気：気象庁の地域予報・アメダス観測。防災：公式ページへの案内。公式リンク確認日：2026年10月13日。</p><p class="source-note">${PUBLIC ? '<a href="/amami-life/privacy.html">利用案内・プライバシー・情報訂正窓口</a>' : "利用規約・プライバシーポリシーと情報訂正窓口は公開前に整備予定です。"}</p><div class="brand-footer">奄美の、日々。<small>AMAMI LIFE — MADE BY SHIMA CRAFT</small></div>`;
}
function syncUrl() {
  if (PUBLIC && ["about", "service", "works", "flow", "price", "faq", "contact"].includes(location.hash.slice(1))) {
    location.replace("/studio" + location.hash);
    return false;
  }
  const url = new URL(location.href);
  for (const [key, value] of Object.entries({
    theme,
    area: areaId,
    date,
    state,
    sky,
  }))
    url.searchParams.set(key, value);
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  if (filter !== "all") url.searchParams.set("filter", filter);
  else url.searchParams.delete("filter");
  if (PUBLIC) { url.searchParams.delete("state"); url.searchParams.delete("sky"); url.hash=tab; }
  history.replaceState(null, "", url);
}
function render(focus = false) {
  if (syncUrl() === false) return;
  document.body.dataset.theme = theme;
  document
    .querySelectorAll("[data-theme]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.theme === theme)),
    );
  $("#location-button").innerHTML =
    `${area().name} <span aria-hidden="true">⌄</span>`;
  $("#tabs").innerHTML = tabs
    .map(
      ([id, name, glyph]) =>
        `<a href="#${id}" ${id === tab ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${name}</span></a>`,
    )
    .join("");
  document.documentElement.style.colorScheme =
    theme === "ink" ? "dark" : "light";
  document.querySelector("meta[name=theme-color]").content =
    theme === "ink" ? "#222522" : "#f7f3e9";
  $("#content").innerHTML =
    '<h1 class="sr-only">' +
    tabs.find((t) => t[0] === tab)[1] +
    " · AMAMI LIFE</h1>" +
    { today, explore, move, safety, more }[tab]();
  if (focus) {
    $("#content").scrollTop = 0;
    $("#content").focus({ preventScroll: true });
  }
}
async function load() {
  const id = ++requestId;
  void loadForecast(id);
  void loadObservation(id);
  fetchError = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(
      `${API_BASE}/today?area=${areaId}&date=${date}&state=${state}`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error("fetch");
    const payload = await response.json();
    if (id !== requestId) return;
    if (
      payload.schemaVersion !== 1 ||
      payload.mode !== (PUBLIC ? "reference" : "demo") ||
      payload.data?.date !== date ||
      payload.data?.area?.id !== areaId
    )
      throw new Error("invalid-payload");
    snapshot = payload.data;
  } catch {
    if (id !== requestId) return;
    snapshot = null;
    fetchError = state !== "offline";
  } finally {
    clearTimeout(timer);
    if (id === requestId) render();
  }
}
function toast(message) {
  $("#toast").textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").textContent = ""), 2400);
}
function changeArea(id) {
  if (!AREAS.some((a) => a.id === id)) return;
  areaId = id;
  persist("area", id);
  snapshot = null;
  render();
  void load();
}
window.addEventListener("hashchange", () => {
  const name = location.hash.slice(1);
  if (PUBLIC && ["about", "service", "works", "flow", "price", "faq", "contact"].includes(name)) {
    location.replace("/studio" + location.hash);
    return;
  }
  if (tabs.some((t) => t[0] === name)) {
    tab = name;
    render(true);
  }
});
document.addEventListener("click", (event) => {
  if (event.target.closest('a[href="#today"]')) {
    event.preventDefault();
    const changed=date!==todayJST();
    date=todayJST(); tab="today";
    history.replaceState(null,"",location.pathname+location.search+"#today");
    if(changed) snapshot=null;
    render(true);
    if(changed) void load();
    return;
  }
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.action === "go-today") { date=todayJST(); snapshot=null; render(true); void load(); return; }
  if (target.dataset.theme) {
    theme = target.dataset.theme;
    persist("theme", theme);
    render();
  }
  if (target.dataset.date) {
    date = addDays(date, Number(target.dataset.date));
    snapshot = null;
    render();
    void load();
  }
  if (target.dataset.save) {
    const id = target.dataset.save;
    const next = saved.includes(id)
      ? saved.filter((s) => s !== id)
      : [...saved, id];
    if (persist("saved", next)) {
      saved = next;
      render();
      document.querySelector(`[data-save="${id}"]`)?.focus();
      toast(
        saved.includes(id) ? "公式情報を保存しました" : "保存から外しました",
      );
    }
  }
  if (target.dataset.filter) {
    filter = target.dataset.filter;
    render();
    document.querySelector(`[data-filter="${filter}"]`)?.focus();
  }
  if (target.dataset.action === "retry-weather") void load();
  if (target.dataset.action === "save-note") {
    const value = $("#note").value;
    if (persist("note", value)) {
      note = value;
      toast("旅のメモを保存しました");
    }
  }
  if (target.dataset.action === "retry") {
    state = "ready";
    fetchError = false;
    snapshot = null;
    render();
    void load();
  }
  if (target.dataset.area) {
    changeArea(target.dataset.area);
    $("#area-dialog").close();
  }
  if (target.dataset.call) {
    const num = target.dataset.call;
    $("#call-description").textContent =
      `${num === "110" ? "警察" : "消防・救急"} ${num} へ電話します。`;
    $("#call-link").href = `tel:${num}`;
    $("#call-dialog").showModal();
  }
});
document.addEventListener("change", (event) => {
  const { id, value, checked } = event.target;
  if (id === "region") changeArea(value);
  if (id === "theme") {
    theme = value;
    persist("theme", theme);
    render();
  }
  if (id === "large-text") {
    document.body.dataset.text = checked ? "large" : "normal";
  }
  if (id === "data-state") {
    state = value;
    snapshot = null;
    render();
    void load();
  }
  if (id === "sky") {
    sky = value;
    render();
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "note") {
    note = event.target.value;
    persist("note", note);
  }
  if (event.target.id === "search") {
    query = event.target.value;
    syncUrl();
    const results = findOfficialLinks(query,filter,areaId);
    $("#search-results").innerHTML = searchResults(results);
  }
});
$("#location-button").addEventListener("click", () => {
  $("#area-options").innerHTML = AREAS.map(
    (a) =>
      `<button type="button" data-area="${a.id}" aria-pressed="${a.id === areaId}">${a.name}<small>${a.municipality}</small></button>`,
  ).join("");
  $("#area-dialog").showModal();
});
window.addEventListener("offline", () => {
  state = "offline";
  fetchError = false;
  snapshot = null;
  render();
});
window.addEventListener("online", () => {
  state = "ready";
  snapshot = null;
  render();
  void load();
});
render();
void load();
if (!PUBLIC && "serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(() => {});

// Re-evaluate displayed age while a page remains open; this does not poll the source.
setInterval(() => {
  const hero = $("#current-observation");
  if (hero && observation?.data && observationScope === areaId + ":" + date) {
    const status = hero.querySelector('[role="status"]');
    if (date !== todayJST()) hero.innerHTML = observationHero();
    else if (Date.parse(observation.source.expiresAt) <= Date.now() && status) {
      status.textContent = "古い観測値です";
      hero.querySelector(".temperature")?.setAttribute("aria-label", `古い観測値 ${observation.data.temperatureC ?? "未取得"}度`);
    }
  }
  const brief=$("#forecast-brief");
  if (brief) brief.innerHTML=forecastBrief();
  const facts=$(".today-brief");
  if (facts) facts.outerHTML=todayFacts();
  const section = $("#forecast");
  if (
    section &&
    forecast?.status === "ready" &&
    freshness(forecast.source, new Date()) !== "recent"
  )
    section.innerHTML = forecastPanel();
}, 60_000);

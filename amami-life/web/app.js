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
import { findOfficialLinks, tideOverview, precipitationWindow, tideAtMinute, moonForDate, validSkyPoint, cycloneTime } from "./usage.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const INK_ONLY = document.documentElement.dataset.themeMode === "ink-only";
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
let theme = INK_ONLY ? "ink" : params.get("theme") ?? stored("theme", "paper");
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
let observation = null, observationLoading = state === "ready", observationScope = null;
let forecast = null,
  forecastLoading = state === "ready",
  forecastAreaId = null;
let saved =
  stored("saved", []).filter?.((id) => LINKS.some((l) => l.id === id)) ?? [];
let note = stored("note", "");
if (typeof note !== "string") note = "";
let skyMain=null,skyLarge=null,skyView=null,skyPicked=null,skyPointArea=null,skyLoading=null;
let celestialTab=params.get("celestial")==="moon" ? "moon" : "sun", selectedTide=null, cyclones=null, cyclonesLoading=false, flightOpened=false;
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
  return `<div class="row"><a data-analytics-id="${link.id}" href="${link.url}" target="_blank" rel="noopener noreferrer"><span class="num" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="row-main"><strong>${link.title}</strong><small>${link.subtitle}<span class="sr-only"> · ${link.jurisdiction} · リンク確認 ${link.checkedOn}</span></small></span><span aria-hidden="true">↗</span><span class="sr-only">（外部サイト）</span></a><button class="save" data-save="${link.id}" aria-pressed="${saved.includes(link.id)}" aria-label="${link.title}を${saved.includes(link.id) ? "保存から外す" : "保存する"}">${saved.includes(link.id) ? "◆" : "◇"}</button></div>`;
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
      const brief=$("#forecast-brief");
      if (brief) brief.innerHTML=forecastBrief();
      refreshWeatherDetails();
    }
  }
}
function forecastBrief() {
  const p=forecastAreaId===areaId && forecast?.data?.date===date ? forecast : null;
  if (!p) return `<p class="source-note" role="status">${forecastLoading ? "地域予報を読み込み中…" : "この日付の地域予報は未取得です"}</p>`;
  const d=p.data;
  if (!d) return '<p class="source-note">この日付の地域予報は未取得です。</p>';
  const rain=precipitationWindow(d,new Date());
  const stale=p.status!=="ready" || freshness(p.source,new Date())!=="recent";
  const label=rain ? `${rain.label}の雨 ${rain.percent ?? "—"}%` : d.weeklyPrecipitation!==null ? `週間の降水確率 ${d.weeklyPrecipitation}%` : "降水確率は未取得";
  const [weather, ...localConditions] = (d.description ?? "週間予報").replace(/\s+/g, "").split("所により");
  return `<p class="forecast-brief">${esc(weather)}</p>${localConditions.length ? `<p class="forecast-local">所により${esc(localConditions.join("所により"))}</p>` : ""}<p class="source-note">${esc(label)} · 奄美地方の予報</p>${stale ? '<p class="source-note forecast-warning" role="status">古い予報 · 最新情報は<a href="https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=460040" target="_blank" rel="noopener">気象庁で確認 ↗</a></p>' : ""}`;
}
function todayFacts() {
  const sun=snapshot?.solar ?? solarForDate(date,area().lat,area().lon);
  const tides=tideOverview(snapshot?.tide ?? null,snapshot?.tomorrowTide ?? null,new Date());
  const event=(item,kind)=>`<div class="fact"><div class="fact-label">${date===todayJST() ? "次の" : "この日の"}${kind}${item?.date!==date && item ? '<span class="day-tag">翌日</span>' : ""}</div><div class="fact-value">${item?.time ?? "—"}</div><div class="fact-note">${item ? `${item.heightCm} cm · 潮位予測` : area().station ? "時刻は未取得" : "この地域は未連携"}</div></div>`;
  return `<div class="facts-grid today-brief">${event(tides.high,"満潮")}${event(tides.low,"干潮")}<div class="fact"><div class="fact-label">日の入り</div><div class="fact-value">${sun.sunset ?? "—"}</div><div class="fact-note">地点別の参考計算</div></div></div>`;
}
let cycloneId=null,trackHour=0,trackMain=null,trackLarge=null,trackLoading=false;
const trackCache=new Map();
function stormName(e){return e?.category==="TD" ? "熱帯低気圧" : e?.category==="EX" ? "温帯低気圧（元台風）" : e?.category==="LOW" ? "低気圧" : e?.number ? `台風${Number(e.number.slice(2))}号` : "発表対象の低気圧";}
function trackPayload(){return trackCache.get(cycloneId);}
function trackStale(){const p=trackPayload();return !p || p.status!=="ready" || Date.parse(p.source?.expiresAt)<=Date.now() || cyclones?.status!=="ready" || Date.parse(cyclones?.source?.expiresAt)<=Date.now() || p.data?.issuedAt!==cyclones?.data?.find(e=>e.id===cycloneId)?.issuedAt;}
function cycloneVersion(){const t=trackPayload();return JSON.stringify([cyclones?.status,cyclones?.data,!!cyclones && Date.parse(cyclones.source.expiresAt)<=Date.now(),!cyclones && cyclonesLoading,cycloneId,t?.status,t?.data,!t?.data && trackLoading,trackStale()]);}
function mapCredits(){return `<details class="map-credits"><summary>地図の出典</summary><p>地理院タイルを加工して表示（<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院 ↗</a>）。Shoreline data is derived from: United States. National Imagery and Mapping Agency. "Vector Map Level 0 (VMAP0)." Bethesda, MD: Denver, CO: The Agency; USGS Information Services, 1997.</p></details>`;}
function trackFrame(scope){return `<div class="cyclone-map-frame"><div id="cyclone-map-${scope}" class="cyclone-map-host" tabindex="0"></div><span class="sky-north" aria-hidden="true">↑ N</span><div class="sky-zoom"><button type="button" data-track-zoom="1" data-track-scope="${scope}" aria-label="台風の地図を拡大">＋</button><button type="button" data-track-zoom="-1" data-track-scope="${scope}" aria-label="台風の地図を縮小">−</button></div><p id="track-error-${scope}" class="sky-map-message" role="status" hidden></p></div><div class="track-map-tools"><button type="button" class="text-button" data-track-fit data-track-scope="${scope}">全体表示</button>${scope==="main" ? '<button type="button" class="text-button" data-track-expand aria-haspopup="dialog">大きく見る ↗</button>' : ""}<a class="map-credit" href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a></div><p class="track-legend"><span>● ${trackStale() ? '保存位置' : '現在位置'}</span><span>◯ 予報円（暴風域とは異なります）</span></p>`;}
function trackButtons(scope){return `<div class="track-times" role="group" aria-label="予報の時刻を選ぶ">${(trackPayload()?.data?.points ?? []).map(p=>{const label=cycloneTime(p.validAt,p.hours,trackStale());return `<button type="button" data-track-hour="${p.hours}" id="track-${scope}-${p.hours}" aria-label="${p.hours===0 ? label.label+'の発表位置' : '予報位置'} ${timeJST(p.validAt)}${p.hours===0 ? '時点' : ''}" aria-pressed="${trackHour===p.hours}">${label.label}<small>${label.time}</small></button>`;}).join("")}</div>`;}
function trackShort(value){return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value));}
function trackFacts(){const data=trackPayload()?.data,p=data?.points.find(p=>p.hours===trackHour);if(!p)return "";return `<p class="track-selected-time">${cycloneTime(p.validAt,p.hours,trackStale()).asOf}${trackStale() ? ' · 保存情報' : ''}</p><p class="track-location">${esc([p.intensity!=="-" ? p.intensity : null,p.hours>0 && p.category!==data.points[0].category ? p.category : null,p.location].filter(Boolean).join(" · "))}</p><dl class="track-stats"><div><dt>中心気圧</dt><dd>${p.pressureHpa ?? '—'}<small> hPa</small></dd></div><div><dt>最大風速</dt><dd>${p.windMs ?? '—'}<small> m/s</small></dd></div><div><dt>最大瞬間風速</dt><dd>${p.gustMs ?? '—'}<small> m/s</small></dd></div></dl>`;}
function trackCaution(){return '<p class="track-caution">予報円は中心が入る確率70%の範囲です。台風の大きさ・暴風域を示す円ではありません。点線は確定した進路ではありません。</p>';}
function trackRadiusText(){const p=trackPayload()?.data?.points.find(p=>p.hours===trackHour);return p?.radiusM ? `選択した予報円の半径 ${p.radiusKm ?? `約${Math.round(p.radiusM/1000)}`} km` : '';}
function trackInfo(scope="main"){const p=cyclones,track=trackPayload();return `<details class="source-details track-info"><summary id="cyclone-source-toggle-${scope}">予報の見方・出典</summary>${trackCaution()}<p class="source-note" data-track-radius ${trackRadiusText() ? "" : "hidden"}>${trackRadiusText()}</p><p class="source-note">「現在」は気象庁が発表した最新の位置です。表示時刻の位置で、リアルタイムの追跡ではありません。地図は現在の発表であり、ページの日付選択とは連動しません。全国の発表対象で、奄美への影響を判定するものではありません。暴風域・強風域は表示していません。</p><p class="source-note">気象庁の台風と、24時間以内に台風へ発達する見込みの熱帯低気圧が対象です。すべての熱帯低気圧は網羅しません。5分キャッシュ、10分未更新または発表から6時間で古い表示（独自基準）。未取得は「—」。</p><p class="source-note">発表 ${timeJST(track?.data?.issuedAt ?? null)}<br>一覧取得 ${timeJST(p?.source?.fetchedAt ?? null)}<br>進路取得 ${timeJST(track?.source?.fetchedAt ?? null)}</p>${mapCredits()}</details>`;}
function cyclonePanel(){
 const p=cyclones,events=p?.data ?? [],track=trackPayload(),data=track?.data;
 const stale=p && (p.status==="refresh-failed" || p.status==="stale" || Date.parse(p.source.expiresAt)<=Date.now());
 const empty=p && !stale && p.status==="empty" && events.length===0,active=events.find(e=>e.id===cycloneId);
 const title=active ? stormName(active) : cyclonesLoading && !p ? "台風情報を確認中…" : empty ? "台風の情報はありません。" : "台風情報は未取得です";
 const diagram=data && active ? `<div class="cyclone-chart">${trackFrame("main")}</div>` : '';
 return `<div class="cyclone-section-head"><div class="cyclone-heading"><div><h3>${title}${data?.name ? `<small>${esc(data.name)}</small>` : ''}</h3><p class="track-issued">気象庁・全国${active ? ` · ${trackShort(data?.issuedAt ?? active.issuedAt)}発表` : ''}</p></div><button class="text-button" id="cyclone-retry" data-action="retry-cyclones" ${cyclonesLoading || trackLoading ? 'disabled' : ''}>${cyclonesLoading || trackLoading ? '確認中…' : '更新'}</button></div>${stale || (data && trackStale()) ? '<p class="track-stale" role="status">更新を確認できません。保存済みの情報です。最新情報は気象庁で確認してください。</p>' : ''}</div><div class="cyclone-copy">${events.length>1 ? `<div class="cyclone-choices" role="group" aria-label="台風・熱帯低気圧を選ぶ">${events.map(e=>`<button type="button" data-cyclone-id="${e.id}" aria-pressed="${e.id===cycloneId}">${stormName(e)}</button>`).join('')}</div>` : ''}${data ? `${trackButtons("main")}<div id="track-facts-main" class="track-facts" aria-live="polite" aria-atomic="true">${trackFacts()}</div>` : active ? `<p class="readable-note" role="status">${trackLoading ? '進路を読み込み中…' : '進路は未取得です。気象庁で確認してください。'}</p>` : ''}<a class="inline-link cyclone-official" href="https://www.jma.go.jp/bosai/map.html?contents=typhoon" target="_blank" rel="noopener">気象庁で詳しく ↗</a>${trackInfo()}</div>${diagram}`;
}
function destroyTrackMap(){trackMain?.destroy();trackMain=null;}
async function mountTrackMap(scope='main'){
 const host=$(`#cyclone-map-${scope}`),data=trackPayload()?.data;if(!host || !data)return;
 try{const {createCycloneMap}=await skyModule();if(!host.isConnected || host!==$(`#cyclone-map-${scope}`))return;const map=createCycloneMap(host,{data,stale:trackStale(),onSelect:selectTrackHour,onError:message=>{const note=$(`#track-error-${scope}`);if(note){note.hidden=!message;note.textContent=message ?? '';}}});if(scope==='main')trackMain=map;else trackLarge=map;map.select(trackHour);}
 catch{const note=$(`#track-error-${scope}`);if(note){note.hidden=false;note.textContent='地図を表示できませんでした。予報の値は時刻ボタンから確認できます。';}}
}
function selectTrackHour(hours){if(!trackPayload()?.data?.points.some(p=>p.hours===hours))return;trackHour=hours;trackMain?.select(hours);trackLarge?.select(hours);document.querySelectorAll('[data-track-hour]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.trackHour)===hours)));for(const scope of ['main','large']){const facts=$(`#track-facts-${scope}`);if(facts)facts.innerHTML=trackFacts();}document.querySelectorAll('[data-track-radius]').forEach(note=>{const text=trackRadiusText();note.hidden=!text;note.textContent=text;});}
async function openTrackMap(){const d=$('#cyclone-track-dialog');if(!d || !trackPayload()?.data)return;d.innerHTML=`<form method="dialog"><div class="dialog-head"><h2 id="cyclone-track-title">${stormName(trackPayload().data)} · 予報進路</h2><button value="cancel" aria-label="進路図を閉じる">×</button></div></form><p class="track-issued">発表 ${timeJST(trackPayload().data.issuedAt)}</p>${trackStale() ? '<p class="track-stale">保存済み情報 · 最新情報は気象庁で確認してください。</p>' : ''}${trackFrame('large')}${trackButtons('large')}<div id="track-facts-large" class="track-facts" aria-live="polite" aria-atomic="true">${trackFacts()}</div>${trackInfo("large")}`;d.showModal();await mountTrackMap('large');}
function refreshCyclonePanel(){const section=$('#cyclone-home');if(!section)return;const version=cycloneVersion();if(section.dataset.version===version)return;const open=section.querySelector('details.source-details')?.open,focused=section.contains(document.activeElement) ? document.activeElement.id : null;destroyTrackMap();if($('#cyclone-track-dialog')?.open)$('#cyclone-track-dialog').close();section.innerHTML=cyclonePanel();section.dataset.version=version;if(open)section.querySelector('details.source-details').open=true;if(focused)document.getElementById(focused)?.focus({preventScroll:true});void mountTrackMap();}
async function loadTrack(){
 if(trackLoading || !cycloneId)return;const id=cycloneId;trackLoading=true;refreshCyclonePanel();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const p=await (await fetch(`${API_BASE}/cyclones/track?id=${encodeURIComponent(id)}`,{signal:controller.signal})).json();if(p.schemaVersion!==1 || !p.source || !['ready','stale','refresh-failed','unavailable'].includes(p.status) || (p.data && (p.data.id!==id || !Array.isArray(p.data.points))))throw new Error('invalid-track');trackCache.set(id,p);}
 catch{const old=trackCache.get(id);trackCache.set(id,old ? {...old,status:'refresh-failed'} : {status:'unavailable',data:null,source:{}});}
 finally{clearTimeout(timer);trackLoading=false;if(id===cycloneId && !trackPayload()?.data?.points.some(p=>p.hours===trackHour))trackHour=0;refreshCyclonePanel();if(id!==cycloneId)void loadTrack();}
}
async function loadCyclones(){
 if(cyclonesLoading)return;cyclonesLoading=true;$('#cyclone-home')?.setAttribute('aria-busy','true');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const p=await (await fetch(`${API_BASE}/cyclones`,{signal:controller.signal})).json();if(p.schemaVersion!==1 || !p.source || !['ready','empty','stale','refresh-failed','unavailable'].includes(p.status) || (p.data!==null && !Array.isArray(p.data)))throw new Error('invalid-cyclones');cyclones=p;}
 catch{cyclones=cyclones ? {...cyclones,status:'refresh-failed'} : null;}
 finally{clearTimeout(timer);cyclonesLoading=false;const events=cyclones?.data ?? [];if(!events.some(e=>e.id===cycloneId)){cycloneId=events[0]?.id ?? null;trackHour=0;}for(const id of trackCache.keys())if(!events.some(e=>e.id===id))trackCache.delete(id);$('#cyclone-home')?.setAttribute('aria-busy','false');refreshCyclonePanel();if(cycloneId)void loadTrack();}
}
function flightPanel() {
 return `<section class="flight-panel" aria-labelledby="flight-heading"><div class="section-head"><h3 id="flight-heading">奄美空港 · 本日の運航状況</h3><span>公式ページ</span></div><button class="text-button" data-action="open-flights" aria-expanded="${flightOpened}" aria-controls="flight-embed">${flightOpened ? "運航情報を更新" : "運航情報を表示"}</button><button class="text-button" data-action="close-flights" ${flightOpened ? "" : "hidden"}>表示を閉じる</button><a class="inline-link" href="https://www.amami-airport.co.jp/flight/today" target="_blank" rel="noopener noreferrer">公式サイトを別タブで開く ↗</a><div id="flight-embed">${flightOpened ? flightFrame() : ""}</div><p class="source-note">奄美空港の公式ページを表示します。自動更新はしません。表示できない場合は別タブで開いてください。</p><details class="source-details"><summary>運航情報について</summary><p class="source-note">当サイトで運航を判定・転載していません。日付・便・到着/出発は公式ページで確認してください。外部サイトのCookie等が適用されます。</p></details></section>`;
}
function flightFrame() {return '<iframe class="flight-frame" src="https://www.amami-airport.co.jp/flight/today" title="奄美空港公式・本日の到着便と出発便" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>';}

function skyPoint() {
  if(skyPointArea!==areaId){skyPointArea=areaId;skyPicked=null;skyView=null;}
  return skyPicked ?? {lat:area().lat,lon:area().lon};
}
function skyState() {
  const origin=skyPoint(),sun=solarForDate(date,origin.lat,origin.lon),moon=moonForDate(date,origin.lat,origin.lon),isSun=celestialTab==="sun";
  return {origin,events:{rise:isSun ? {time:sun.sunrise,azimuth:sun.riseAzimuth} : moon.rise,set:isSun ? {time:sun.sunset,azimuth:sun.setAzimuth} : moon.set}};
}
function skyFacts() {
  const {origin,events}=skyState(),isSun=celestialTab==="sun";
  const fact=(event,label,kind)=>`<div class="celestial-fact ${kind}"><span>${label}</span><strong>${event?.time ?? "—"}</strong><small>${event?.azimuth!=null ? `真北から ${event.azimuth}°` : "この日は出入りなし"}</small></div>`;
  return `<p class="sky-point-name"><strong>${skyPicked ? "選択した地点" : esc(area().name)}</strong></p><details class="sky-coordinate"><summary>座標・日付</summary><p class="source-note">北緯 ${origin.lat.toFixed(5)}° / 東経 ${origin.lon.toFixed(5)}°<br>${date} / JST</p></details><div class="celestial-facts">${fact(events.rise,isSun ? "日の出" : "月の出","rise")}${fact(events.set,isSun ? "日の入り" : "月の入り","set")}</div>`;
}
function skyTabs(scope="main") {
  const prefix=scope==="main" ? "celestial" : "sky-large";
  return `<div class="celestial-tabs" role="tablist" aria-label="太陽と月">${[["sun","太陽"],["moon","月"]].map(([key,label])=>`<button type="button" id="${prefix}-tab-${key}" role="tab" data-celestial="${key}" aria-controls="${prefix}-panel" aria-selected="${celestialTab===key}" tabindex="${celestialTab===key ? 0 : -1}">${label}</button>`).join("")}</div>`;
}
function skyMapFrame(scope) {
  return `<div class="sky-map-frame"><div id="sky-map-${scope}" class="sky-map-host" tabindex="0"></div><span class="sky-north" aria-hidden="true">↑ N 真北</span><div class="sky-zoom"><button type="button" data-sky-zoom="1" data-sky-scope="${scope}" aria-label="地図を拡大">＋</button><button type="button" data-sky-zoom="-1" data-sky-scope="${scope}" aria-label="地図を縮小">−</button></div><a class="sky-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a><p class="sky-map-message" id="sky-map-message-${scope}" role="status" hidden></p></div><div class="sky-map-tools"><button type="button" class="text-button" data-sky-center data-sky-scope="${scope}">地図の中央を選ぶ</button><button type="button" class="text-button" data-sky-reset>元の地点へ</button></div>`;
}
function skyCredit(){return '<p class="sky-map-help">地図をタップして地点を変更</p><details class="source-details"><summary>方位図について</summary><p class="source-note">実線は出る方角、破線は入る方角。SunCalcの参考計算で、地形・標高・大気を含まず、実際の見え方とは異なります。店舗等の掲載は地図の登録状況によります。</p><a class="map-credit" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">地図の情報を修正する ↗</a></details>';}
function celestialPanel() {
  return `<div class="section-head"><div><p class="section-kicker">SUN & MOON</p><h3 id="celestial-heading">光の向きを知る</h3></div>${skyTabs()}</div><button type="button" class="text-button sky-expand" data-sky-expand aria-haspopup="dialog">地図を大きく見る ↗</button><div id="celestial-panel" role="tabpanel" aria-labelledby="celestial-tab-${celestialTab}">${skyMapFrame("main")}<div id="sky-readout-main" class="sky-readout" aria-live="polite" aria-atomic="true">${skyFacts()}</div>${skyCredit()}</div>`;
}
function refreshCelestial(focus=false) {
  const next=skyState();
  skyMain?.setState(next);skyLarge?.setState(next);
  for(const scope of ["main","large"]){const readout=$(`#sky-readout-${scope}`);if(readout)readout.innerHTML=skyFacts();const prefix=scope==="main" ? "celestial" : "sky-large";const panel=$(`#${prefix}-panel`);panel?.setAttribute("aria-labelledby",`${prefix}-tab-${celestialTab}`);}
  document.querySelectorAll("[data-celestial]").forEach(button=>{const selected=button.dataset.celestial===celestialTab;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected ? 0 : -1;});
  syncUrl();
  if(focus) $(`#${$("#sky-map-dialog")?.open ? "sky-large" : "celestial"}-tab-${celestialTab}`)?.focus({preventScroll:true});
}
function skyPick(point) {
  if(!validSkyPoint(point.lat,point.lon))return;
  skyPicked={lat:point.lat,lon:point.lon};skyPointArea=areaId;document.querySelectorAll('.sky-map-message[data-kind="point"]').forEach(note=>{note.hidden=true;});refreshCelestial();
}
function skyError(scope,message,kind="network") {const note=$(`#sky-map-message-${scope}`);if(note){if(message===null){if(note.dataset.kind===kind)note.hidden=true;return;}note.dataset.kind=kind;note.hidden=false;note.textContent=message;}}
function skyModule() {return skyLoading ??= import("./sky-map.js");}
async function mountSkyMap() {
  const host=$("#sky-map-main");if(!host)return;
  try {const {createSkyMap}=await skyModule();if(!host.isConnected || host!==$("#sky-map-main"))return;skyMain=createSkyMap(host,{...skyState(),view:skyView,onPick:skyPick,onError:(message,kind)=>skyError("main",message,kind)});}
  catch {skyError("main","地図を読み込めませんでした。時刻と方位は下に表示しています。");}
}
async function openSkyMap() {
  const dialog=$("#sky-map-dialog");if(!dialog)return;
  dialog.innerHTML=`<form method="dialog"><div class="dialog-head"><h2 id="sky-large-title">太陽と月の方位図</h2><button value="cancel" aria-label="方位図を閉じる">×</button></div></form>${skyTabs("large")}<div id="sky-large-panel" role="tabpanel" aria-labelledby="sky-large-tab-${celestialTab}">${skyMapFrame("large")}<div id="sky-readout-large" class="sky-readout" aria-live="polite" aria-atomic="true">${skyFacts()}</div>${skyCredit()}</div>`;
  dialog.showModal();
  try {const {createSkyMap}=await skyModule();if(!dialog.open)return;skyLarge=createSkyMap($("#sky-map-large"),{...skyState(),view:skyMain?.getView() ?? skyView,onPick:skyPick,onError:(message,kind)=>skyError("large",message,kind)});}
  catch {skyError("large","地図を読み込めませんでした。時刻と方位は下に表示しています。");}
}

function selectTide(minute) {
  selectedTide={scope:areaId+":"+date,minute:Math.round(Math.max(0,Math.min(1440,minute)))};
  const result=tideAtMinute(snapshot?.tide ?? null,snapshot?.tomorrowTide ?? null,selectedTide.minute);
  const label=result?.time ?? `${String(Math.floor(selectedTide.minute/60)).padStart(2,"0")}:${String(selectedTide.minute%60).padStart(2,"0")}`;
  const callout=$("#tide-callout"), slider=$("#tide-time");
  if(callout) { callout.hidden=false;callout.style.setProperty("--tide-x",`${selectedTide.minute/1440*100}%`);callout.innerHTML=`<span>${label}${selectedTide.minute===1440 ? "（翌0時）" : ""}</span><strong>${result ? `${result.heightCm.toFixed(1)} <small>cm</small>` : "未取得"}</strong><small>${result ? result.interpolated ? "直線補間の参考値" : "毎時の天文潮位予測" : "欠測区間は補間しません"}</small>`; }
  if(slider) {slider.value=selectedTide.minute;slider.setAttribute("aria-valuetext",`${label} ${result ? result.heightCm.toFixed(1)+"センチメートル、予測" : "未取得"}`);}
  const line=$("#tide-selection");if(line) {line.hidden=false;line.setAttribute("x1",selectedTide.minute/1440*720);line.setAttribute("x2",selectedTide.minute/1440*720);line.style.display="";}
}

function tideChart() {
  const model=tideOverview(snapshot?.tide ?? null,snapshot?.tomorrowTide ?? null,new Date());
  if (model.min===null) return '<p class="readable-note">この地域・日付の潮汐予測は未取得です。別地点の値は表示しません。</p>';
  const low=model.min, high=model.max, range=Math.max(10,high-low);
  const x=minute=>minute/1440*720, y=height=>196-(height-low)/range*172;
  const curve=model.segments.filter(points=>points.length>1).map(points=>`<polyline class="tide-curve" points="${points.map(p=>`${x(p.minute)},${y(p.heightCm)}`).join(" ")}" vector-effect="non-scaling-stroke"/>`).join("");
  const label=model.heightCm===null ? "選択日の毎時予測" : "いまの推定潮位";
  const now=model.minute!==null && model.heightCm!==null ? `<line class="tide-now" x1="${x(model.minute)}" x2="${x(model.minute)}" y1="8" y2="210" vector-effect="non-scaling-stroke"/><circle class="tide-now-dot" cx="${x(model.minute)}" cy="${y(model.heightCm)}" r="5" vector-effect="non-scaling-stroke"/>` : "";
  return `<div class="chart-summary"><div><span>${label}</span><strong>${model.heightCm===null ? "24時間の潮の動き" : `${model.heightCm.toFixed(1)}<small>cm</small>`}</strong></div><p>${model.trend ? `予測では${model.trend}` : "現在値ではありません"}<small>名瀬小湊 O9 · 天文潮位予測</small></p></div><figure class="tide-chart"><div class="chart-grid"><div class="chart-y" aria-hidden="true"><span>${high} cm</span><span>${Math.round((high+low)/2)}</span><span>${low}</span></div><div class="tide-plot"><div id="tide-callout" class="tide-callout" role="status" aria-live="polite" hidden></div><svg id="interactive-tide" viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-labelledby="tide-chart-title tide-chart-description"><title id="tide-chart-title">${date} 名瀬小湊の毎時潮位予測</title><desc id="tide-chart-description">保存済み公式毎時値を直線で接続。欠測箇所は接続しません。${model.heightCm===null ? "現在位置は表示していません。" : `現在時刻の補間値は${model.heightCm.toFixed(1)}センチメートル。`}実測値ではありません。満潮・干潮の時刻は別表で確認できます。</desc>${[24,110,196].map(a=>`<line class="chart-guide" x1="0" x2="720" y1="${a}" y2="${a}"/>`).join("")}${[0,180,360,540,720].map(a=>`<line class="chart-guide" x1="${a}" x2="${a}" y1="24" y2="196"/>`).join("")}${curve}${now}<line id="tide-selection" class="tide-selection" x1="0" x2="0" y1="8" y2="210" style="display:none" vector-effect="non-scaling-stroke"/></svg><div class="chart-x" aria-hidden="true"><span>0時</span><span>6時</span><span>12時</span><span>18時</span><span>24時</span></div></div></div><figcaption><label class="tide-time-label" for="tide-time">グラフをタップ、または時刻を動かす<input id="tide-time" name="tide-time" autocomplete="off" type="range" min="0" max="1440" step="1" value="${selectedTide?.scope===areaId+':'+date ? selectedTide.minute : 720}" aria-label="潮位を調べる時刻" aria-valuetext="時刻未選択。矢印キーで12時から調べられます" /></label><span class="tide-brief">気象庁の潮位予測 · 実測ではありません</span><details class="source-details"><summary>グラフの見方</summary><p>時刻の間は直線補間した参考値です。${now ? "縦線は現在時刻。" : ""}欠測区間は線をつなぎません。</p></details></figcaption></figure>`;
}
function tideOutlook() {
  const days=snapshot?.outlook;
  if (!days?.length) return "";
  const label=value=>new Intl.DateTimeFormat("ja-JP",{month:"numeric",day:"numeric",weekday:"short",timeZone:"Asia/Tokyo"}).format(new Date(value+"T12:00:00+09:00"));
  return `<section class="tide-outlook"><div class="section-head"><h3>7日間の潮と夕日</h3><span>潮位予測・参考計算</span></div><div class="outlook-days">${days.map(day=>`<button type="button" data-day="${day.date}" aria-pressed="${day.date===date}" aria-label="${label(day.date)}の詳細を見る"><strong>${label(day.date)}</strong>${day.tide ? `<span>満潮 <b>${day.tide.highTides.map(t=>t.time).join(" / ") || "なし"}</b></span><span>干潮 <b>${day.tide.lowTides.map(t=>t.time).join(" / ") || "なし"}</b></span>` : '<span class="missing-tide">潮汐は未連携・未取得</span>'}<span>夕日 <b>${day.solar.sunset ?? "—"}</b></span></button>`).join("")}</div></section>`;
}
function weatherDetails(){const p=observationScope===areaId+":"+date ? observation : null,f=forecastAreaId===areaId && forecast?.data?.date===date ? forecast : null;return `<details class="source-details" id="observation-details"><summary id="observation-toggle">天気の出典・更新時刻</summary><p class="source-note">気象庁のアメダス観測と奄美地方の地域予報を加工表示。地域予報は選択地点の実況ではありません。<br>気温観測 ${timeJST(p?.data?.observedAt ?? null)}<br>気温取得 ${timeJST(p?.source?.fetchedAt ?? null)}<br>予報発表 ${timeJST(f?.source?.issuedAt ?? null)}<br>予報取得 ${timeJST(f?.source?.fetchedAt ?? null)}<br>気温は観測から20分を鮮度の目安としています。イラストは天気を示しません。</p></details>`;}
function refreshWeatherDetails(){const host=$('#weather-meta');if(!host)return;const open=host.querySelector('details')?.open,focus=host.contains(document.activeElement) ? document.activeElement.id : null;host.innerHTML=weatherDetails();if(open)host.querySelector('details').open=true;if(focus)document.getElementById(focus)?.focus({preventScroll:true});}
function observationHero() {
  const p = observationScope === areaId + ":" + date ? observation : null;
  const d = date === todayJST() ? p?.data : null;
  const old = d && (p.status === "refresh-failed" || p.status === "stale" || Date.parse(p.source.expiresAt) <= Date.now());
  const value = typeof d?.temperatureC === "number" ? d.temperatureC.toFixed(1) : "—";
  const label = date !== todayJST() ? "気温は今日のみ表示" : observationLoading ? "観測値を読み込み中…" : old ? "古い観測値です" : !p || p.status === "unavailable" ? "観測値を取得できません" : d?.temperatureC == null ? "気温は未取得・欠測" : `${new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(d.observedAt))}観測`;
  return `<div class="weather-top"><div class="temperature" aria-label="${esc(label)} ${value}度">${value}<span class="degree" aria-hidden="true">°</span><span class="unit">C</span></div><div class="weather-caption"><div class="weather-name">${esc(d?.station?.name ?? area().name)}</div><small role="status">${esc(label)}</small></div></div><div id="forecast-brief">${forecastBrief()}</div><div class="weather-art">${illustration(sky)}</div><div class="place-caption"><strong>AMAMI ŌSHIMA</strong><small>イラストは天気とは連動しません</small></div>${todayFacts()}<div id="weather-meta">${weatherDetails()}</div><button class="text-button weather-refresh" data-action="retry-weather">観測・予報を更新</button>`;
}
function refreshObservationHero() {
  const hero = $("#current-observation");
  if (!hero) return;
  const wasOpen = $("#observation-details")?.open;
  const active = document.activeElement;
  const activeId = hero.contains(active) ? active.id : null;
  const retryFocused = hero.contains(active) && active.matches('[data-action="retry-weather"]');
  hero.innerHTML = observationHero();
  if (wasOpen && $("#observation-details")) $("#observation-details").open = true;
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
  else if (retryFocused) hero.querySelector('[data-action="retry-weather"]')?.focus({ preventScroll: true });
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
    if (id === requestId) { observationLoading = false; refreshObservationHero(); }
  }
}
function today() {
  const sun=snapshot?.solar ?? solarForDate(date,area().lat,area().lon);
  const tide=snapshot?.tide;
  const isReady=state==="ready" && !fetchError;
  const eventList=(events)=>events.map(t=>`<p><strong>${t.time}</strong><small>${t.heightCm} cm</small></p>`).join("") || '<p class="readable-note">対象なし</p>';
  return `<div class="today-heading"><div class="selected-date"><span class="date-context">${date===todayJST() ? "今日" : "選択日"}</span><h2>${dateLabel()}</h2></div><div class="date-controls"><button class="date-step" data-date="-1" aria-label="前の日">‹</button><label for="view-date">日付を選ぶ<input id="view-date" name="date" type="date" value="${date}" autocomplete="off" /></label><button class="date-step" data-date="1" aria-label="次の日">›</button><button class="text-button" data-action="go-today">今日へ</button></div></div><section id="cyclone-home" class="cyclone-home" data-version="${esc(cycloneVersion())}" aria-label="台風・熱帯低気圧の情報">${cyclonePanel()}</section><div class="today-layout"><section class="weather-overview" aria-label="観測気温と今日の要約">${isReady ? `<div id="current-observation">${observationHero()}</div>` : statePanel()}</section>
  <section id="celestial-section" class="today-celestial" aria-labelledby="celestial-heading">${celestialPanel()}</section>
  <section class="today-access" aria-labelledby="journey-title"><h3 id="journey-title">このあと、どこへ。</h3><div class="quick-links"><a class="journey-link" href="#move"><span class="journey-icon">${icon("plane")}</span><span><strong>移動を調べる</strong><small>飛行機・フェリー・バスの公式案内</small></span><span class="journey-arrow" aria-hidden="true">→</span></a><a class="journey-link" href="#explore"><span class="journey-icon">${icon("compass")}</span><span><strong>島の情報を探す</strong><small>観光・施設・旅先の情報を検索</small></span><span class="journey-arrow" aria-hidden="true">→</span></a><a class="journey-link" href="#safety"><span class="journey-icon">${icon("shield")}</span><span><strong>防災情報を確認する</strong><small>台風・地震・津波・避難の公式情報</small></span><span class="journey-arrow" aria-hidden="true">→</span></a></div><p class="safety-status"><span aria-hidden="true">!</span><span><strong>地震・津波・気象警報は未接続</strong>最新情報は公式発表へ。</span></p></section>
  <section class="today-tide-chart"><div class="section-head"><h3>潮の動きを見る</h3><span>潮位予測</span></div><div id="tide-chart-content">${isReady ? tideChart() : '<p class="readable-note">潮汐の予測を取得できませんでした。</p>'}</div></section><details class="today-details" id="astronomy-details"><summary id="astronomy-toggle"><span><strong>満潮・干潮と太陽の時刻</strong><small>${date===todayJST() ? "今日" : "選択日"}のすべての時刻・出典を見る</small></span><span class="disclosure-symbol" aria-hidden="true">＋</span></summary><div class="astronomy-content"><section aria-label="潮汐の予測"><div class="section-head"><h3 id="tide-heading">${date===todayJST() ? "今日" : "この日"}の満潮・干潮</h3><span>${area().station ? "O9 / 予測" : "対象局未連携"}</span></div>${tide && isReady ? `<div class="tide-events"><div><div class="fact-label">満潮</div>${eventList(tide.highTides)}</div><div><div class="fact-label">干潮</div>${eventList(tide.lowTides)}</div></div>` : '<p class="readable-note">この地域・日付の潮汐予測は未取得です。</p>'}<p class="readable-note">天文潮位の予測です。実測ではありません。</p><details class="source-details" id="tide-source-details"><summary id="tide-source-toggle">潮汐の出典・予測について</summary><p class="source-note">気象庁・奄美（名瀬小湊）2026年の保存済み天文潮位予測を加工表示。基準面上cm。別地点へ流用しません。取得：${timeJST(snapshot?.tideSource?.fetchedAt ?? null)}。原データの発表時刻は未確認。</p><a class="inline-link" target="_blank" rel="noopener" href="https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=O9">気象庁の潮位表 · 名瀬小湊<span aria-hidden="true">↗</span></a></details></section><section class="sun-section" aria-label="日の出と日の入り"><div class="section-head"><h3>日の出・日の入り</h3><span>参考計算</span></div><div class="facts-grid"><div class="fact"><div class="fact-label">日の出</div><div class="fact-value">${sun.sunrise ?? "—"}</div><div class="fact-note">方位 ${sun.riseAzimuth ?? "—"}°</div></div><div class="fact"><div class="fact-label">日の入り</div><div class="fact-value">${sun.sunset ?? "—"}</div><div class="fact-note">方位 ${sun.setAzimuth ?? "—"}°</div></div></div><p class="readable-note">地点別の参考計算。地形・標高で見え方は変わります。</p></section></div></details>${isReady ? tideOutlook() : ""}
  </div>`;
}
function explore() {
  const results = findOfficialLinks(query,filter,areaId);
  return `${top("FIND YOUR ISLAND", "島を探す", "02")}<label class="search-label" for="search">施設・交通・公式情報を検索</label><input id="search" name="search" class="search-input" type="search" autocomplete="off" placeholder="例：空港、バス、津波…" value="${esc(query)}"><div class="filters" aria-label="検索対象"><button data-filter="all" aria-pressed="${filter === "all"}">すべて</button><button data-filter="transport" aria-pressed="${filter === "transport"}">移動</button><button data-filter="safety" aria-pressed="${filter === "safety"}">防災</button><button data-filter="explore" aria-pressed="${filter === "explore"}">観光</button></div><div id="search-results" aria-live="polite">${searchResults(results)}</div>`;
}
function searchResults(results) {
  if (state !== "ready" || fetchError) return statePanel();
  return results.length
    ? `<p class="source-note">${results.length}件の公式リンク</p><div class="link-directory">${results.map(linkRow).join("")}</div>`
    : `<div class="empty-illustration">${emptyArt()}</div><h3 class="empty-title">${query ? "条件に合う情報がありません" : "まだ知らない、島のかたち。"}</h3><p class="empty-copy">${query ? "キーワードや検索対象を変えてください。" : "空港・船・バス・観光・防災の公式情報を検索できます。"}<span>店舗・設備の地点情報は確認・整備中です。</span></p><div class="notice"><strong>スポット一覧は準備中</strong><p>施設の利用案内は公式ガイドをご確認ください。</p></div>${
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
  return `${top("GET AROUND", "島をめぐる", "03")}${flightPanel()}${statePanel()}<div class="link-directory">${LINKS.filter(
    (l) => l.category === "transport",
  )
    .map(linkRow)
    .join(
      "",
    )}</div><div class="section-head"><h3>タクシー・運転代行</h3><span>DIRECTORY</span></div><p class="body-copy compact">電話案内は準備中です。</p><a class="inline-link" href="https://www.city.amami.lg.jp/kanko/kanko/kanko/access.html" target="_blank" rel="noopener">奄美市の交通案内<span aria-hidden="true">↗</span></a><p class="source-note">運航状況は各社の公式発表をご確認ください。</p>`;
}
function safety() {
  return `${top("OFFICIAL INFORMATION", "防災と避難", "04")}<div class="notice"><div class="eyebrow">重要 / 状況未確認</div><strong>現在の状況を確認できません</strong><p>地震・津波・気象警報の自動取得は未接続です。公式発表をご確認ください。</p></div>${statePanel()}<p class="body-copy">強い揺れ・長い揺れを感じたら、情報を待たず、海岸から離れて高い場所へ避難してください。</p><div class="emergency"><button data-call="110"><span>警察</span><strong>110</strong></button><button data-call="119"><span>消防・救急</span><strong>119</strong></button></div><div class="link-directory">${safetyLinks(areaId).map(linkRow).join("")}</div>${areaId === "koniya" ? '<div class="notice"><strong>ここは瀬戸内町です</strong><p>奄美市ハザードマップの対象外です。この地域の公式情報は瀬戸内町ハザードマップをご確認ください。</p></div>' : ""}<details class="source-details"><summary>防災情報の取得状況</summary>${sourceBlock()}<p class="source-note">台風情報には、24時間以内に台風へ発達する見込みの熱帯低気圧が含まれます。その前段階のすべての熱帯低気圧を網羅しません。地震履歴・緊急地震速報・現在の津波警報は別の情報です。端末標準の緊急速報を代替しません。</p></details>`;
}
function more() {
  return `${top("MAKE IT YOURS", "島との付き合い方", "05")}${statePanel()}<div class="controls"><div class="control-row"><label for="region">表示する地域</label><select id="region" name="region">${AREAS.map((a) => `<option value="${a.id}" ${a.id === areaId ? "selected" : ""}>${a.name} · ${a.municipality}</option>`).join("")}</select></div>${INK_ONLY ? "" : `<div class="control-row"><label for="theme">画面のあしらい</label><select id="theme" name="theme"><option value="paper" ${theme === "paper" ? "selected" : ""}>朱と和紙</option><option value="ink" ${theme === "ink" ? "selected" : ""}>墨と金</option></select></div>`}<div class="control-row"><label for="large-text">文字を大きく</label><input type="checkbox" name="large-text" id="large-text" ${document.body.dataset.text === "large" ? "checked" : ""}></div></div><div class="section-head"><h3>保存した公式情報</h3><span>${saved.length} SAVED</span></div>${
    saved.length
      ? LINKS.filter((l) => saved.includes(l.id))
          .map(linkRow)
          .join("")
      : '<p class="body-copy compact">移動・防災の◇を押すと、ここに保存できます。</p>'
  }<label class="search-label" for="note">旅のメモ · この端末だけに保存</label><textarea id="note" name="note" autocomplete="off" class="note-input" maxlength="2000" placeholder="港の名前、帰りの時間、忘れたくないこと。">${esc(note)}</textarea><button class="text-button" data-action="save-note">メモを保存</button><p class="source-note">この端末に自動保存します。</p><details class="source-details"><summary>保存と通信について</summary><p class="source-note">メモ・選択地域・保存リンクはこのブラウザだけに保存します。サイトデータを消すと失われます。アカウント作成・GPS取得・当サイト独自の解析・通知送信はありません。地図はOpenStreetMap/国土地理院へ、空港表示は空港サイトへ接続します。再読み込みと最新情報の取得には通信が必要です。警報の最新性は保証しません。</p></details>${PUBLIC ? "" : `<details><summary class="text-button">試作の表示確認</summary><div class="control-row"><label for="data-state">データ表示の状態</label><select id="data-state">${Object.entries(
    STATE_COPY,
  )
    .map(
      ([id, copy]) =>
        `<option value="${id}" ${state === id ? "selected" : ""}>${copy.title}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="control-row"><label for="sky">天気のイラスト</label><select id="sky"><option value="sun" ${sky === "sun" ? "selected" : ""}>日輪と海</option><option value="rain" ${sky === "rain" ? "selected" : ""}>墨の雨雲</option></select></div><p class="source-note">表示確認専用です。実際の天気を変える操作ではありません。</p></details>`}<details class="source-details"><summary>出典・プライバシー</summary><p class="body-copy compact">太陽：SunCalc参考計算。潮汐：気象庁の名瀬小湊O9、2026年保存データ。天気：気象庁の地域予報・アメダス観測。防災：公式ページへの案内。公式リンク確認日：2026年10月13日。</p><p class="source-note">${PUBLIC ? '<a href="/amami-life/privacy.html">利用案内・プライバシー・情報訂正窓口</a>' : "利用規約・プライバシーポリシーと情報訂正窓口は公開前に整備予定です。"}</p></details><div class="brand-footer">奄美の、日々。<small>AMAMI LIFE — MADE BY SHIMA CRAFT</small></div>`;
}
function syncUrl() {
  if (PUBLIC && ["about", "service", "works", "flow", "price", "faq", "contact"].includes(location.hash.slice(1))) {
    location.replace("/studio" + location.hash);
    return false;
  }
  const url = new URL(location.href);
  for (const [key, value] of Object.entries({
    theme,
    celestial:celestialTab,
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
let renderedScope = null;
let renderedTab = null;
function render(focus = false) {
  if (syncUrl() === false) return;
  const scope = `${tab}:${areaId}:${date}`;
  const openDetails = renderedScope === scope
    ? Array.from($("#content").querySelectorAll("details[id][open]"), (item) => item.id) : [];
  const pageChanged = renderedTab !== null && renderedTab !== tab;
  const active = document.activeElement;
  let restoreSelector = null;
  let selection = null;
  if (!focus && active?.closest("#content")) {
    if (active.id) restoreSelector = "#" + CSS.escape(active.id);
    else {
      for (const attribute of ["data-date", "data-action", "data-day", "data-save", "data-filter"]) {
        if (active.hasAttribute(attribute)) {
          restoreSelector = `button[${attribute}="${CSS.escape(active.getAttribute(attribute))}"]`;
          break;
        }
      }
    }
    if (["search", "note"].includes(active.id)) selection = [active.selectionStart, active.selectionEnd];
  }
  document.body.dataset.theme = theme;
  document.body.dataset.tab = tab;
  document
    .querySelectorAll("button[data-theme]")
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
  destroyTrackMap();
  if(skyMain){skyView=skyMain.getView();skyMain.destroy();skyMain=null;}
  $("#content").innerHTML =
    '<h1 class="sr-only">' +
    tabs.find((t) => t[0] === tab)[1] +
    " · AMAMI LIFE</h1>" +
    { today, explore, move, safety, more }[tab]();
  if(tab==="today"){void mountSkyMap();void mountTrackMap();}else if($("#sky-map-dialog")?.open)$("#sky-map-dialog").close();
  for (const id of openDetails) {
    const detail = document.getElementById(id);
    if (detail instanceof HTMLDetailsElement) detail.open = true;
  }
  if(selectedTide?.scope===areaId+":"+date) selectTide(selectedTide.minute);
  renderedScope = scope;
  renderedTab = tab;
  document.dispatchEvent(new CustomEvent("amami:view-rendered", { detail: { pageChanged } }));
  if (restoreSelector) {
    const control = $("#content").querySelector(restoreSelector);
    control?.focus({ preventScroll: true });
    if (selection && control?.setSelectionRange) control.setSelectionRange(...selection);
  }
  if (focus) {
    $("#content").scrollTop = 0;
    $("#content").focus({ preventScroll: true });
    if (document.querySelector(".craft-header")) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
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
  const graph=event.target.closest("#interactive-tide");
  if(graph) {const bounds=graph.getBoundingClientRect();selectTide((event.clientX-bounds.left)/bounds.width*1440);return;}
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
  const chartLink=event.target.closest("[data-cyclone-image]");
  if(chartLink && $("#cyclone-image-dialog")){event.preventDefault();const image=chartLink.querySelector("img");$("#cyclone-large-image").innerHTML=`<img class="cyclone-large-image" src="${esc(image.src)}" width="600" height="581" alt="気象庁の実況天気図"/><p class="source-note">進路予報は気象庁の公式進路図をご確認ください。</p>`;$("#cyclone-image-dialog").showModal();return;}
  const target = event.target.closest("button");
  if (!target) return;
  if(target.dataset.cycloneId){cycloneId=target.dataset.cycloneId;trackHour=0;refreshCyclonePanel();void loadTrack();return;}
  if(target.hasAttribute('data-track-hour')){selectTrackHour(Number(target.dataset.trackHour));return;}
  if(target.hasAttribute('data-track-expand')){void openTrackMap();return;}
  if(target.hasAttribute('data-track-zoom')){(target.dataset.trackScope==='large' ? trackLarge : trackMain)?.zoom(Number(target.dataset.trackZoom));return;}
  if(target.hasAttribute('data-track-fit')){(target.dataset.trackScope==='large' ? trackLarge : trackMain)?.fit();return;}
  if(target.hasAttribute("data-sky-expand")){void openSkyMap();return;}
  const activeMap=target.dataset.skyScope==="large" ? skyLarge : skyMain;
  if(target.hasAttribute("data-sky-zoom")){activeMap?.zoom(Number(target.dataset.skyZoom));return;}
  if(target.hasAttribute("data-sky-center")){activeMap?.center();return;}
  if(target.hasAttribute("data-sky-reset")){skyPicked=null;skyPointArea=areaId;const point=skyPoint();skyMain?.reset(point);skyLarge?.reset(point);refreshCelestial();return;}
  if(target.dataset.action==="retry-cyclones") {void loadCyclones();return;}
  if(target.dataset.action==="open-flights") {flightOpened=true;$("#flight-embed").innerHTML=flightFrame();target.textContent="運航情報を更新";target.setAttribute("aria-expanded","true");$('[data-action="close-flights"]').hidden=false;return;}
  if(target.dataset.action==="close-flights") {flightOpened=false;$("#flight-embed").innerHTML="";target.hidden=true;const opener=$('[data-action="open-flights"]');opener.textContent="運航情報を表示";opener.setAttribute("aria-expanded","false");opener.focus({preventScroll:true});return;}
  if(target.dataset.celestial) {celestialTab=target.dataset.celestial;refreshCelestial(true);return;}
  if (target.dataset.action === "go-today") { date=todayJST(); snapshot=null; render(true); void load(); return; }
  if (target.dataset.theme && !INK_ONLY) {
    theme = target.dataset.theme;
    persist("theme", theme);
    render();
  }
  if (target.dataset.day && validDate(target.dataset.day)) {
    date=target.dataset.day; snapshot=null; render(true); void load();
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
  if (id === "view-date" && validDate(value)) { date=value; snapshot=null; render(); void load(); }
  if (id === "region") changeArea(value);
  if (id === "theme" && !INK_ONLY) {
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
  if(event.target.id==="tide-time") selectTide(Number(event.target.value));
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
  void loadCyclones();
});
render();
void load();
void loadCyclones();
setInterval(()=>{if(!document.hidden && navigator.onLine) void loadCyclones();},300_000);
if (!PUBLIC && "serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(() => {});

// Re-evaluate displayed age while a page remains open; this does not poll the source.
setInterval(() => {
  refreshCyclonePanel();
  const context=$(".date-context"), tideHeading=$("#tide-heading");
  if (context) context.textContent=date===todayJST() ? "今日" : "選択日";
  if (tideHeading) tideHeading.textContent=(date===todayJST() ? "今日" : "この日")+"の満潮・干潮";
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
      refreshWeatherDetails();
  const chart=$("#tide-chart-content");
  if (chart && snapshot?.date===date && !chart.contains(document.activeElement)) {chart.innerHTML=tideChart();if(selectedTide?.scope===areaId+":"+date) selectTide(selectedTide.minute);}
  const facts=$(".today-brief");
  if (facts) facts.outerHTML=todayFacts();
}, 60_000);

document.addEventListener("keydown",event=>{
 const target=event.target.closest("[data-celestial]");
 if(target && ["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){event.preventDefault();celestialTab=event.key==="Home" ? "sun" : event.key==="End" ? "moon" : celestialTab==="sun" ? "moon" : "sun";refreshCelestial(true);}
 if(event.key==="Escape" && event.target.closest(".today-tide-chart")){selectedTide=null;$("#tide-callout").hidden=true;$("#tide-selection").style.display="none";}
});
document.addEventListener("error",event=>{if(event.target.matches?.(".cyclone-large-image")){$("#cyclone-large-image").innerHTML='<p class="readable-note">画像を再取得できませんでした。閉じて台風情報を更新するか、気象庁の公式進路図をご確認ください。</p>';}
 if(event.target.matches?.(".cyclone-image")){const figure=event.target.closest("figure");if(figure){figure.innerHTML='<p class="source-note">画像を取得できませんでした。公式の進路図をご確認ください。</p>';}}
 if(event.target.matches?.(".gsi-tile")){const error=$(".map-error");if(error)error.hidden=false;}},true);

$("#sky-map-dialog")?.addEventListener("close",()=>{if(skyLarge){skyView=skyLarge.getView();skyLarge.destroy();skyLarge=null;skyMain?.setView(skyView);}$(".sky-expand")?.focus({preventScroll:true});});
$("#cyclone-image-dialog")?.addEventListener("close",()=>{$("[data-cyclone-image]")?.focus({preventScroll:true});});

$("#cyclone-track-dialog")?.addEventListener("close",()=>{trackLarge?.destroy();trackLarge=null;$("[data-track-expand]")?.focus({preventScroll:true});});

import { useEffect, useState } from "react";
import { Platform, Text, View, useWindowDimensions } from "react-native";
import { todayJST, timeJST } from "../../../packages/core/src";
import { OBSERVATION_STATIONS, type ObservationEnvelope } from "../../../packages/core/src/observations";
import { API_BASE } from "./api";
import { useApp } from "./state";
import { TodayFacts } from "./today-facts";
import { ForecastBrief } from "./weather";
import { Button, Copy, WeatherArt } from "./ui";

export function ObservationHero() {
  const { date, area, colors: c } = useApp();
  const { fontScale, height } = useWindowDimensions();
  const scope = area.id + ":" + date;
  const [result, setResult] = useState<{ scope: string; payload: ObservationEnvelope } | null>(null);
  const [details, setDetails] = useState(false);
  const [loading, setLoading] = useState(false), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!API_BASE || date !== todayJST()) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true); setFailed(false);
    const timer = setTimeout(() => controller.abort(), 5500);
    fetch(`${API_BASE}/v1/observations?area=${area.id}&date=${date}`, { signal: controller.signal })
      .then((r) => r.json()).then((p: ObservationEnvelope) => {
        const d = p.data;
        if (p.schemaVersion !== 1 || !p.source || !["ready", "empty", "stale", "unavailable", "refresh-failed"].includes(p.status) ||
          (d && (d.station.code !== OBSERVATION_STATIONS[area.id].code || !Number.isFinite(Date.parse(d.observedAt)) ||
            (d.temperatureC !== null && (typeof d.temperatureC !== "number" || !Number.isFinite(d.temperatureC) || d.qualityCode !== 0))))) throw new Error("invalid-observation");
        if (active) setResult({ scope, payload: p });
      }).catch(() => { if (active) setFailed(true); }).finally(() => {
        clearTimeout(timer); if (active) setLoading(false);
      });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [area.id, date, retry, scope]);
  const payload = result?.scope === scope && date === todayJST(now) ? result.payload : null;
  const d = payload?.data;
  const old = failed || (d && (!payload?.source.expiresAt || Date.parse(payload.source.expiresAt) <= now.getTime())) || ["stale", "refresh-failed"].includes(payload?.status ?? "");
  const temperature = d?.temperatureC?.toFixed(1) ?? "—";
  const status = date !== todayJST(now) ? "実況は今日のみ表示" : loading ? "観測値を読み込み中…" : !API_BASE ? "観測API未設定" : failed ? d ? "通信エラー · この画面の保存値" : "通信エラー · 再取得してください" : old ? "古い観測値です" : payload?.status === "unavailable" ? "観測値を取得できません。再取得してください" : !d || d.temperatureC === null ? "気温は未取得・欠測" : "気象庁の観測気温";
  return <>
    <View style={{ flexDirection: fontScale > 1.5 ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, gap: 12 }}>
      <View accessible accessibilityLabel={`${status} ${temperature}度`} style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text style={{ fontSize: 80, lineHeight: 96, fontWeight: "200", letterSpacing: -5, color: c.ink, fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Thin" : Platform.OS === "web" ? "Helvetica Neue" : undefined }}>{temperature}</Text>
        <View style={{ minHeight: 96 * fontScale, paddingTop: 6, paddingBottom: 12, justifyContent: "space-between", paddingLeft: 5 }}>
          <Text style={{ fontSize: 28, color: c.ink, fontWeight: "300" }}>°</Text><Text style={{ fontSize: 12, color: c.ink }}>C</Text>
        </View>
      </View>
      <View style={{ paddingTop: 12, flex: 1, alignItems: fontScale > 1.5 ? "flex-start" : "flex-end" }}>
        <Copy small>{OBSERVATION_STATIONS[area.id].name}</Copy>
        <View accessibilityLiveRegion="polite"><Copy small>{status}</Copy></View>
      </View>
    </View>
    {API_BASE && date === todayJST(now) && !loading && (failed || old || payload?.status === "unavailable") && <Button label="観測気温を再取得" onPress={() => setRetry(n => n + 1)} />}
    <ForecastBrief />
    <WeatherArt height={height < 740 ? 96 : 160} />
    <Copy small style={{ textAlign: "center", letterSpacing: 3 }}>AMAMI ŌSHIMA</Copy>
    <Copy small style={{ textAlign: "center", marginBottom: 8 }}>日輪は島の意匠です</Copy>
    <TodayFacts />
    <View style={{ height: 8 }} />
    <Button label={details ? "観測の時刻・出典を閉じる" : `観測の時刻・出典${d ? " · " + new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(new Date(d.observedAt)) : ""}`} onPress={() => setDetails(v => !v)} />
    {details && <View style={{ paddingVertical: 12 }}>
      <Copy small>観測：{timeJST(d?.observedAt ?? null)}{"\n"}取得：{timeJST(payload?.source.fetchedAt ?? null)}{"\n"}気象庁アメダス。観測から20分を鮮度の目安としています。日輪は天気の実況を示しません。</Copy>
      {API_BASE && date === todayJST(now) && !loading && !(failed || old || payload?.status === "unavailable") && <Button label="観測気温を再取得" onPress={() => setRetry(n => n + 1)} />}
    </View>}
    <View style={{ height: 12 }} />
  </>;
}

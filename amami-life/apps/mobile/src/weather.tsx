import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { precipitationWindow } from "../../../packages/core/src/usage";
import { timeJST, freshness } from "../../../packages/core/src";
import type { WeatherEnvelope } from "../../../packages/core/src/weather";
import { useApp } from "./state";
import { Button, Copy, Section, openOfficial } from "./ui";

import { API_BASE as base } from "./api";
function useForecastModel() {
  const { date, area, state } = useApp();
  const [result, setResult] = useState<{
    scope: string;
    payload: WeatherEnvelope;
  } | null>(null);
  const scope = area.id + ":" + date;
  const forecast = result?.scope === scope ? result.payload : null;
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setFailed(false);
    if (!base || state !== "ready") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 5500);
    fetch(`${base}/v1/weather?mode=live&area=${area.id}&date=${date}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((p: WeatherEnvelope) => {
        if (
          p.schemaVersion !== 1 ||
          !p.source ||
          ![
            "ready",
            "empty",
            "stale",
            "unavailable",
            "refresh-failed",
          ].includes(p.status) ||
          (p.data && (p.data.date !== date || p.data.region.code !== "460040"))
        )
          throw new Error("invalid-forecast-response");
        if (active) setResult({ scope: area.id + ":" + date, payload: p });
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [area.id, date, retry, state]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const currentStatus = failed && forecast ? "refresh-failed" :
    forecast?.status === "ready" && freshness(forecast.source, now) !== "recent"
      ? "stale"
      : forecast?.status;
  const d = forecast?.data;
  const label = loading
    ? "地域予報を読み込んでいます…"
    : !base
      ? "予報API未設定。公式ページをご確認ください。"
      : state !== "ready"
        ? "状態確認中は地域予報を取得しません。"
        : !forecast
          ? failed ? "通信エラー。地域予報を再取得してください。" : "地域予報を取得できませんでした。"
          : {
              ready: "取得済みの予報",
              empty: "この日付の予報はありません",
              stale: "一部の予報が古い可能性があります",
              unavailable: "予報を取得できません",
              "refresh-failed": "更新に失敗 · 保存済みの古い予報",
            }[currentStatus!];
  return { forecast, loading, failed, currentStatus, d, label, now, retry: () => setRetry(n => n + 1) };
}
const WeatherContext = createContext<ReturnType<typeof useForecastModel> | null>(null);
export function WeatherProvider({ children }: { children: ReactNode }) {
  const value = useForecastModel();
  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
export function useRegionalWeather() {
  const value = useContext(WeatherContext);
  if (!value) throw new Error("missing-weather-provider");
  return value;
}
export function ForecastBrief() {
  const { fontScale } = useWindowDimensions();
  const { d, label, loading, failed, currentStatus, now, retry } = useRegionalWeather();
  const { colors: c } = useApp();
  const pop = precipitationWindow(d ?? null, now);
  return <View style={{ marginTop: 4, marginBottom: 4 }}>
    <Copy small>奄美地方の予報</Copy>
    <Text numberOfLines={fontScale > 1.5 ? undefined : 2} accessibilityLabel={d?.description ?? label} style={{ color: c.ink, fontSize: 17, lineHeight: 26 }}>
      {d?.description ?? (loading ? "地域予報を読み込み中…" : label)}
    </Text>
    {pop ? <Copy small>雨の確率 {pop.percent === null ? "未取得" : pop.percent + "%"} · {pop.label}</Copy> : d?.weeklyPrecipitation !== null && d?.weeklyPrecipitation !== undefined ? <Copy small>雨の確率 {d.weeklyPrecipitation}% · 週間予報</Copy> : null}
    {!loading && base && (failed || currentStatus === "unavailable") && <Button label="予報をもう一度取得" onPress={retry} />}
    {["stale", "refresh-failed"].includes(currentStatus ?? "") && <Copy small style={{ color: c.accent }}>古い予報を含みます · 詳細で時刻を確認</Copy>}
  </View>;
}
export function RegionalForecast() {
  const { area } = useApp();
  const { forecast, loading, d, label, retry } = useRegionalWeather();
  return (
    <View>
      <Section title="気象庁の地域予報 · 奄美地方" />
      <View accessibilityLiveRegion="polite">
        <Copy>{label}</Copy>
      </View>
      {d && (
        <>
          <Copy style={{ marginTop: 12 }}>
            {d.description ?? "週間予報。詳細な天気文は未提供です。"}
          </Copy>
          {d.wind && <Copy small>風：{d.wind}</Copy>}
          {d.waves && <Copy small>波：{d.waves}</Copy>}
          {d.temperature && (
            <Copy>
              名瀬の週間気温予報：最低 {d.temperature.minC ?? "—"}°C / 最高{" "}
              {d.temperature.maxC ?? "—"}°C
            </Copy>
          )}
          {d.precipitation.length > 0 ? (
            <>
              <Copy small>降水確率（各時刻からの6時間）</Copy>
              {d.precipitation.map((p) => (
                <Copy small key={p.startsAt}>
                  {timeJST(p.startsAt)}：{p.percent ?? "—"}%
                </Copy>
              ))}
            </>
          ) : (
            d.weeklyPrecipitation !== null && (
              <Copy small>
                週間降水確率：{d.weeklyPrecipitation}% · 信頼度{" "}
                {d.reliability ?? "—"}
              </Copy>
            )
          )}
        </>
      )}
      <Copy small style={{ marginVertical: 12 }}>
        地域全体の予報で、{area.name}
        の実況ではありません。上の気温は観測所の値、絵は島の意匠です。
      </Copy>
      {forecast && (
        <Copy small>
          発表：{timeJST(forecast.source.issuedAt)}
          {"\n"}取得：{timeJST(forecast.source.fetchedAt)}
          {"\n"}鮮度目安：{timeJST(forecast.source.expiresAt)}
          {"\n"}発表から6時間で古い表示。気象庁が定めた有効期限ではありません。
        </Copy>
      )}
      {base && !loading && (
        <Button
          label="地域予報を再取得"
          onPress={retry}
        />
      )}
      <Button
        label="気象庁の地域予報 ↗"
        onPress={() =>
          void openOfficial(
            "https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=460040",
          )
        }
      />
    </View>
  );
}

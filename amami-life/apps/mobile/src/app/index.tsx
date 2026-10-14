import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import provenance from "../../../../server/data/tide-provenance.json";
import { timeJST, todayJST } from "../../../../packages/core/src";
import { router } from "expo-router";
import { ObservationHero } from "../observations";
import { RegionalForecast } from "../weather";
import { useApp, addDays } from "../state";
import {
  Page,
  Copy,
  Section,
  Notice,
  DataState,
  Button,
  openOfficial,
} from "../ui";
export default function Today() {
  const { date, setDate, goToday, area, sun, tide, colors: c, state } = useApp();
  const { fontScale } = useWindowDimensions();
  const label = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00+09:00`));
  return (
    <Page>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <Pressable
          accessibilityLabel="前の日"
          accessibilityRole="button"
          onPress={() => setDate(addDays(date, -1))}
          style={{ minWidth: 48, minHeight: 48, justifyContent: "center" }}
        >
          <Copy style={{ fontSize: 24 }}>‹</Copy>
        </Pressable>
        <Copy small heading level={1} style={{ textAlign: "center", flex: 1 }}>
          {label}
          {"\n"}
          {date} / JST
        </Copy>
        <Pressable
          accessibilityLabel="次の日"
          accessibilityRole="button"
          onPress={() => setDate(addDays(date, 1))}
          style={{
            minWidth: 48,
            minHeight: 48,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <Copy style={{ fontSize: 24 }}>›</Copy>
        </Pressable>
      </View>
      {date !== todayJST() && <Button label="今日の日付に戻る" onPress={goToday} />}
      {state === "ready" ? (
        <>
          <ObservationHero />
        </>
      ) : (
        <DataState />
      )}
      <Section title="太陽の時刻 · 参考計算" />
      <View
        style={{
          flexDirection: fontScale > 1.5 ? "column" : "row",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: c.hair,
        }}
      >
        {[
          ["日の出", sun.sunrise, sun.riseAzimuth],
          ["日の入り", sun.sunset, sun.setAzimuth],
        ].map(([name, time, angle], i) => (
          <View
            key={String(name)}
            style={{
              flex: 1,
              paddingVertical: 16,
              paddingLeft: i && fontScale <= 1.5 ? 20 : 0,
              borderLeftWidth: i && fontScale <= 1.5 ? 1 : 0,
              borderColor: c.hair,
            }}
          >
            <Copy small>{name}</Copy>
            <Text
              style={{
                fontSize: 34,
                color: c.ink,
                fontWeight: "300",
                fontVariant: ["tabular-nums"],
              }}
            >
              {time ?? "—"}
            </Text>
            <Copy small>{angle ?? "—"}° / 真北基準</Copy>
          </View>
        ))}
      </View>
      <Copy small style={{ marginTop: 12 }}>
        SunCalcによる地点別参考計算。地形・標高による見え方は異なります。
      </Copy>
      <RegionalForecast />
      <Section title="潮の満ち引き" />
      {tide && state === "ready" ? (
        <>
          <View
            style={{
              flexDirection: fontScale > 1.5 ? "column" : "row",
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Copy small>満潮</Copy>
              {tide.highTides.map((t) => (
                <Copy key={t.time}>
                  {t.time}　{t.heightCm} cm
                </Copy>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Copy small>干潮</Copy>
              {tide.lowTides.map((t) => (
                <Copy key={t.time}>
                  {t.time}　{t.heightCm} cm
                </Copy>
              ))}
            </View>
          </View>
          <Copy small style={{ marginVertical: 16 }}>
            気象庁・名瀬小湊O9の保存済み2026年天文潮位予測を加工表示。基準面上cm。実測値ではありません。取得：
            {timeJST(provenance.fetchedAt)}。原データ発表時刻は未確認。
          </Copy>
        </>
      ) : (
        <Copy small>
          {area.station
            ? "この日の予測データは未取得です。"
            : "この地点の潮汐は未連携です。名瀬小湊の値を流用しません。"}
        </Copy>
      )}
      <Button
        label="気象庁の潮位表 · 名瀬小湊 ↗"
        onPress={() =>
          void openOfficial(
            "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=O9",
          )
        }
      />
      <Section title="島で、すぐ使う" />
      <Button
        label="飛行機・フェリー・バス →"
        onPress={() => router.navigate("/move")}
      />
      <View style={{ height: 12 }} />
      <Button
        label="台風・地震・避難情報 →"
        onPress={() => router.navigate("/safety")}
      />
      <Notice
        title="防災の最新状況は公式発表へ"
        body="このアプリは警報の常時監視や緊急通知を行いません。防災タブから公式情報を確認できます。"
      />
    </Page>
  );
}

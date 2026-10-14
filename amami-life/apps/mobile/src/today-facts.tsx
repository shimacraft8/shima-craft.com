import { Text, View, useWindowDimensions } from "react-native";
import { todayJST } from "../../../packages/core/src";
import { nextTideEvent } from "../../../packages/core/src/usage";
import { useApp } from "./state";
import { useRegionalWeather } from "./weather";
import { Copy } from "./ui";
export function TodayFacts() {
  const { tide, tomorrowTide, date, area, sun, colors: c } = useApp();
  const { now } = useRegionalWeather();
  const { fontScale } = useWindowDimensions();
  const next = nextTideEvent(tide, tomorrowTide, now);
  return <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.hair, marginTop: 8 }}>
    <View style={{ flexDirection: fontScale > 1.5 ? "column" : "row", paddingVertical: 12, gap: 16 }}>
      <View style={{ flex: 1 }}>
        <Copy small>{date === todayJST(now) ? "次の潮 · 予測" : "この日の潮 · 予測"}</Copy>
        <Text style={{ fontSize: 26, fontWeight: "300", color: c.ink, fontVariant: ["tabular-nums"] }}>{next?.time ?? "—"}{next && <Text style={{ fontSize: 13 }}> {next.date !== date ? "明日 " : ""}{next.kind}</Text>}</Text>
        <Copy small>{area.station ? next ? "名瀬小湊 O9" : "次の予測は未取得" : "この地域は未連携"}</Copy>
      </View>
      <View style={{ flex: 1 }}>
        <Copy small>日の入り · 参考</Copy>
        <Text style={{ fontSize: 26, fontWeight: "300", color: c.ink, fontVariant: ["tabular-nums"] }}>{sun.sunset ?? "—"}</Text>
        <Copy small>{area.name}</Copy>
      </View>
    </View>
  </View>;
}

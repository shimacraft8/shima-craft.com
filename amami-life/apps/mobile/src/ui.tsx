import React, { useState } from "react";
import {
  Alert,
  Modal,
  Keyboard,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ColorValue,
} from "react-native";
import Svg, { Circle, Path, Line, G } from "react-native-svg";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, STATE_COPY, phoneUri, AREAS } from "./state";
import { officialUrlAllowed, type OfficialLink } from "../../../packages/core/src";
export function Copy({
  children,
  small = false,
  heading = false,
  level = 2,
  style,
}: {
  children: React.ReactNode;
  small?: boolean;
  heading?: boolean;
  level?: 1 | 2;
  style?: TextStyle;
}) {
  const { colors: c } = useApp();
  return (
    <Text
      accessibilityRole={heading ? "header" : undefined}
      aria-level={heading ? level : undefined}
      style={[
        {
          color: small ? c.muted : c.ink,
          fontSize: small ? 13 : 17,
          lineHeight: small ? 22 : 29,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const { colors: c } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: selected ? c.ink : "transparent",
        borderWidth: 1,
        borderColor: c.hair,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: selected ? c.paper : c.ink, fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Icon({ name, color }: { name: string; color: ColorValue }) {
  const paths: Record<string, string> = {
    today: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2m10-10 2-2",
    explore: "m16 8-2.5 5.5L8 16l2.5-5.5Z",
    move: "m21 3-7 18-3-8-8-3ZM21 3 11 13",
    safety: "m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6ZM12 8v5m0 4h.01",
    more: "M4 7h16M4 12h16M4 17h16",
  };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <G
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={paths[name] ?? paths.more} />
        {name === "today" && <Circle cx={12} cy={12} r={4} />}
        {name === "explore" && <Circle cx={12} cy={12} r={9} />}
      </G>
    </Svg>
  );
}
export function WeatherArt({ rain = false, height = 205 }: { rain?: boolean; height?: number }) {
  const { colors: c } = useApp();
  return (
    <Svg aria-hidden={true} width="100%" height={height} viewBox="0 0 320 245" accessible={false}>
      {rain ? (
        <>
          <Path
            d="M57 136c-15-25 5-50 29-48-3-47 61-57 76-16 20-13 49-1 52 23 28-2 45 15 51 45-19-18-36-9-46-3-27 20-44 1-61 5-36 7-55 13-65-4Z"
            fill={c.ink}
            opacity={0.85}
          />
          <Path
            d="M93 116c25 3 26-28 8-29-22-2-27 34-9 40 24 9 43-9 40-27M163 114c27 15 47-8 41-23"
            fill="none"
            stroke={c.paper}
            strokeWidth={5}
            strokeLinecap="round"
          />
          {Array.from({ length: 8 }, (_, i) => (
            <Line
              key={i}
              x1={110 + i * 13}
              y1={154 + (i % 2) * 8}
              x2={122 + i * 13}
              y2={170 + (i % 2) * 8}
              stroke={c.ink}
              strokeWidth={2}
            />
          ))}
        </>
      ) : (
        <>
          <Path d="M64 151a96 96 0 0 1 192 0Z" fill={c.art} />
          {Array.from({ length: 19 }, (_, i) => (
            <Line
              key={i}
              x1={(320 - (238 - i * 7)) / 2}
              y1={158 + i * 4.1}
              x2={(320 + (238 - i * 7)) / 2}
              y2={158 + i * 4.1}
              stroke={c.art}
              strokeWidth={2.6 - i * 0.075}
              opacity={1 - i / 19}
            />
          ))}
          <Path
            d="M65 145c21 0 22-13 12-17-9-4-15 8-7 10 9 3 13-16 3-23m1 19c15-2 19 12 35 8 17-5 12-19 4-17-8 3-2 10 4 8"
            fill="none"
            stroke={c.paper}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {[
            [213, 64],
            [231, 76],
            [195, 78],
            [253, 89],
            [222, 94],
          ].map(([x, y], i) => (
            <Path
              key={i}
              d="M-5-3Q-1-3 0 2Q2-3 6-4L3 1 0 4-2 1Z"
              fill={c.ink}
              transform={`translate(${x} ${y})`}
            />
          ))}
        </>
      )}
    </Svg>
  );
}
export function Page({ children }: { children: React.ReactNode }) {
  const { colors: c, area, storageError, update, goToday } = useApp();
  const [choosingArea, setChoosingArea] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
      <Image
        source={require("../assets/paper.png")}
        resizeMode="repeat"
        style={[
          StyleSheet.absoluteFill,
          { width: "100%", height: "100%", opacity: 0.06 },
        ]}
        accessible={false}
      />
      <View
        style={{
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          paddingBottom: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="今日へ戻る"
          onPress={() => { goToday(); router.navigate("/"); }}
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <Text
            style={{
              color: c.ink,
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 3,
            }}
          >
            AMAMI
          </Text>
          <Text
            style={{
              color: c.ink,
              fontSize: 9,
              letterSpacing: 5,
              marginTop: 4,
            }}
          >
            LIFE
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { Keyboard.dismiss(); setChoosingArea(true); }}
          accessibilityRole="button"
          accessibilityLabel="地域を選ぶ"
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <Copy small>{area.name}　⌄</Copy>
        </Pressable>
      </View>
      <View
        style={{
          paddingVertical: 8,
          paddingHorizontal: 18,
          borderBottomWidth: 1,
          borderColor: c.hair,
        }}
      >
        <Text style={{ color: c.muted, fontSize: 11, textAlign: "center" }}>
          気象庁の観測・予報 / 防災の最新状況は公式発表へ
        </Text>
      </View>
      <Modal transparent visible={choosingArea} animationType="none" onRequestClose={() => setChoosingArea(false)}>
        <View style={{ flex: 1, backgroundColor: "#00000066", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.paper, width: "100%", maxWidth: 420, maxHeight: "85%", padding: 24, borderWidth: 1, borderColor: c.hair }}>
            <ScrollView>
              <Copy style={{ fontSize: 23, marginBottom: 16 }}>表示する地域</Copy>
              {AREAS.map(a => <View key={a.id} style={{ marginBottom: 10 }}><Button label={`${a.name} · ${a.municipality}`} selected={a.id === area.id} onPress={() => { update({ areaId: a.id }); setChoosingArea(false); }} /></View>)}
              <Copy small>気温は各観測所、潮汐は名瀬小湊O9のみです。位置情報の許可は不要です。</Copy>
              <View style={{ marginTop: 16 }}><Button label="地域選択を閉じる" onPress={() => setChoosingArea(false)} /></View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40,
          maxWidth: 600,
          width: "100%",
          alignSelf: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        {storageError && (
          <Notice
            title="端末保存に失敗しました"
            body="設定とメモの永続保存を確認できません。"
          />
        )}
        {children}
      </ScrollView>
    </View>
  );
}
export function Heading({
  en,
  title,
  num,
}: {
  en: string;
  title: string;
  num: string;
}) {
  const { colors: c } = useApp();
  return (
    <View
      style={{
        marginTop: 30,
        marginBottom: 26,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, letterSpacing: 2, color: c.muted }}>
          {en}
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 30,
            color: c.ink,
            fontFamily:
              Platform.OS === "ios" ? "Hiragino Mincho ProN" : undefined,
            marginTop: 10,
            lineHeight: 42,
          }}
        >
          {title}
        </Text>
      </View>
      <Text style={{ fontSize: 28, fontWeight: "300", color: c.muted }}>
        {num}
      </Text>
    </View>
  );
}
export function Section({ title }: { title: string }) {
  return (
    <Copy
      heading
      style={{
        fontSize: 17,
        fontWeight: "500",
        marginTop: 28,
        marginBottom: 12,
      }}
    >
      {title}
    </Copy>
  );
}
export function Notice({ title, body }: { title: string; body: string }) {
  const { colors: c } = useApp();
  return (
    <View
      style={{
        marginVertical: 20,
        borderLeftWidth: 2,
        borderColor: c.accent,
        backgroundColor: c.panel,
        padding: 16,
      }}
    >
      <Copy style={{ fontSize: 16, fontWeight: "600" }}>{title}</Copy>
      <Copy small style={{ marginTop: 8 }}>
        {body}
      </Copy>
    </View>
  );
}
export function DataState() {
  const { state, setState } = useApp();
  if (state === "ready") return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ marginVertical: 24 }}>
      <Copy style={{ fontSize: 20, fontWeight: "500" }}>
        {STATE_COPY[state].title}
      </Copy>
      <Copy small style={{ marginTop: 12, marginBottom: 16 }}>
        {STATE_COPY[state].body}
      </Copy>
      {state !== "loading" && (
        <Button label="もう一度読み込む" onPress={() => setState("ready")} />
      )}
    </View>
  );
}
export async function openOfficial(url: string) {
  try {
    if (!officialUrlAllowed(url) && !legalUrlAllowed(url))
      throw new Error("invalid-link");
    await Linking.openURL(url);
  } catch {
    Alert.alert("リンクを開けません", "通信環境をご確認ください。");
  }
}
function legalUrlAllowed(url: string) {
  return [process.env.EXPO_PUBLIC_PRIVACY_URL, process.env.EXPO_PUBLIC_SUPPORT_URL].includes(url) && url.startsWith("https://");
}
export function LinkRow({
  link,
  index = 0,
}: {
  link: OfficialLink;
  index?: number;
}) {
  const { colors: c, prefs, toggleSave } = useApp();
  const saved = prefs.saved.includes(link.id);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderColor: c.hair,
        paddingVertical: 16,
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${link.title}、公式の外部サイトを開く`}
        onPress={() => void openOfficial(link.url)}
        style={({ pressed }) => ({
          flex: 1,
          opacity: pressed ? 0.6 : 1,
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        })}
      >
        <Text style={{ color: c.muted, fontSize: 17 }}>
          {String(index + 1).padStart(2, "0")}
        </Text>
        <View style={{ flex: 1 }}>
          <Copy style={{ fontWeight: "500" }}>{link.title}</Copy>
          <Copy small>
            {link.subtitle}
            {"\n"}
            {link.jurisdiction} · 確認 {link.checkedOn}
          </Copy>
        </View>
        <Copy>↗</Copy>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${link.title}を${saved ? "保存から外す" : "保存する"}`}
        accessibilityState={{ selected: saved }}
        onPress={() => toggleSave(link.id)}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderWidth: 1,
          borderColor: saved ? c.accent : c.hair,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: saved ? c.accent : c.ink, fontSize: 18 }}>
          {saved ? "◆" : "◇"}
        </Text>
      </Pressable>
    </View>
  );
}
export function Emergency({ number, label }: { number: "110" | "119"; label: string }) {
  const { colors: c } = useApp();
  const [confirming, setConfirming] = useState(false), [error, setError] = useState("");
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}、${number}へ電話する確認画面を開く`}
      onPress={() => { setError(""); setConfirming(true); }}
      style={{ padding: 18, minHeight: 108, flex: 1, borderWidth: 1, borderColor: c.hair }}>
      <Text style={{ color: c.accent, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: c.accent, fontSize: 38, fontWeight: "300", marginTop: 8 }}>{number}</Text>
    </Pressable>
    <Modal transparent visible={confirming} animationType="none" onRequestClose={() => setConfirming(false)}>
      <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: c.paper, width: "100%", maxWidth: 420, maxHeight: "85%", padding: 24, borderWidth: 1, borderColor: c.hair }}>
          <ScrollView>
            <Copy style={{ fontSize: 23 }}>{label} {number}</Copy>
            <Copy style={{ marginVertical: 16 }}>日本国内の緊急番号です。{number}への発信操作に進みます。</Copy>
            {!!error && <View accessibilityLiveRegion="polite"><Copy>{error}</Copy></View>}
            <Button label="発信せず閉じる" onPress={() => setConfirming(false)} />
            <View style={{ height: 12 }} />
            <Button label={`${number}への発信に進む`} onPress={() => {
              const uri = phoneUri(number, true);
              if (uri) Linking.openURL(uri).then(() => setConfirming(false)).catch(() => setError("電話を起動できません。端末の電話機能をご確認ください。"));
            }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

import { LegalInformation } from "../legal";
import { TextInput, View } from "react-native";
import { useApp, AREAS, LINKS, STATE_COPY, type LoadState } from "../state";
import {
  Page,
  Heading,
  Copy,
  Button,
  Section,
  LinkRow,
  DataState,
} from "../ui";
export default function More() {
  const {
    prefs,
    update,
    colors: c,
    state,
    setState,
    hydrated,
    storageError,
    saveStatus,
  } = useApp();
  return (
    <Page>
      <Heading en="MAKE IT YOURS" title="島との付き合い方" num="05" />
      <DataState />
      <Section title="表示する地域" />
      <View style={{ gap: 10 }}>
        {AREAS.map((a) => (
          <Button
            key={a.id}
            label={`${a.name} · ${a.municipality}`}
            selected={prefs.areaId === a.id}
            onPress={() => update({ areaId: a.id })}
          />
        ))}
      </View>
      <Copy small style={{ marginTop: 14 }}>
        位置情報の許可なしで選べます。潮汐は名瀬小湊O9のみ連携しています。
      </Copy>
      <Section title="画面のあしらい" />
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Button
          label="朱と和紙"
          selected={prefs.theme === "paper"}
          onPress={() => update({ theme: "paper" })}
        />
        <Button
          label="墨と金"
          selected={prefs.theme === "ink"}
          onPress={() => update({ theme: "ink" })}
        />
      </View>
      <Section title="保存した公式情報" />
      {prefs.saved.length ? (
        LINKS.filter((l) => prefs.saved.includes(l.id)).map((link, index) => (
          <LinkRow key={link.id} link={link} index={index} />
        ))
      ) : (
        <Copy small>移動・防災の◇から保存できます。</Copy>
      )}
      <Section title="旅のメモ" />
      <TextInput
        accessibilityLabel="旅のメモ、この端末だけに保存"
        multiline
        autoComplete="off"
        maxLength={2000}
        value={prefs.note}
        onChangeText={(value) => {
          update({ note: value });
        }}
        placeholder="港の名前、帰りの時間、忘れたくないこと。"
        placeholderTextColor={c.muted}
        style={{
          minHeight: 120,
          padding: 16,
          borderWidth: 1,
          borderColor: c.hair,
          fontSize: 17,
          lineHeight: 29,
          color: c.ink,
          textAlignVertical: "top",
        }}
      />
      <View style={{ marginTop: 12 }}>
        <Button
          label="メモを保存"
          onPress={() => {
            update({ note: prefs.note });
          }}
        />
      </View>
      <View accessibilityLiveRegion="polite">
        <Copy small>{!hydrated ? "保存データを読み込んでいます…" : storageError ? "保存できません。メモを保存から再試行してください。" : saveStatus === "saved" ? "この端末に自動保存しました" : "保存しています…"}</Copy>
      </View>
      <Copy small>メモは入力すると自動保存します。</Copy>
      <Copy small style={{ marginTop: 16 }}>
        選択地域・保存リンク・メモは端末内に保存します。位置情報取得・アクセス解析・通知送信・ログインはありません。文字サイズはOSの設定に従います。
      </Copy>
      <Section title="オフラインについて" />
      <Copy small>
        太陽の参考計算、保存済み2026年O9潮位予測、公式リンク名とメモは通信なしで使えます。外部ページと速報の更新には通信が必要です。
      </Copy>
      {__DEV__ && <>
      <Section title="開発用の表示確認" />
      <View style={{ gap: 10 }}>
        {(Object.keys(STATE_COPY) as LoadState[]).map((id) => (
          <Button
            key={id}
            label={STATE_COPY[id].title}
            selected={state === id}
            onPress={() => setState(id)}
          />
        ))}
      </View>
      </>}
      <Section title="出典と情報修正" />
      <Copy small>
        太陽：SunCalc参考計算。潮：気象庁O9の2026年保存データ。天気：気象庁の地域予報・アメダス観測。防災：公式ページへの案内。リンク確認日：2026年10月13日。
      </Copy>
      <LegalInformation />
      <Copy style={{ fontSize: 28, marginTop: 40 }}>奄美の、日々。</Copy>
      <Copy small style={{ marginTop: 12 }}>
        AMAMI LIFE — MADE BY SHIMA CRAFT
      </Copy>
    </Page>
  );
}

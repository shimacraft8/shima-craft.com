import { useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import { useApp } from "../state";
import { findOfficialLinks } from "../../../../packages/core/src/usage";
import { Page, Heading, Copy, Button, LinkRow, DataState } from "../ui";
export default function Explore() {
  const { colors: c, state, area } = useApp();
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("all");
  const found = findOfficialLinks(query, filter, area.id);
  const reset = () => { setQuery(""); setFilter("all"); Keyboard.dismiss(); };
  return <Page>
    <Heading en="FIND YOUR ISLAND" title="島を探す" num="02" />
    <Copy>移動・観光・防災の公式情報を。</Copy>
    <Copy small style={{ marginTop: 20 }}>施設・交通・公式情報を検索</Copy>
    <TextInput accessibilityLabel="施設・交通・公式情報を検索" autoComplete="off" returnKeyType="search"
      onSubmitEditing={() => Keyboard.dismiss()} value={query} onChangeText={setQuery}
      placeholder="例：飛行機、船、避難所…" placeholderTextColor={c.muted}
      style={{ color: c.ink, minHeight: 52, borderBottomWidth: 1, borderColor: c.ink, fontSize: 17, paddingVertical: 12 }} />
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 16 }}>
      {[["all", "すべて"], ["transport", "移動"], ["safety", "防災"], ["explore", "観光"]].map(([id,label]) =>
        <Button key={id} label={label} selected={filter === id} onPress={() => { setFilter(id); Keyboard.dismiss(); }} />)}
    </View>
    <DataState />
    {state === "ready" && <>
      <View accessibilityLiveRegion="polite"><Copy small>{found.length}件 · {area.name}から使う公式情報</Copy></View>
      {query || filter !== "all" ? <Button label="検索条件をリセット" onPress={reset} /> : null}
      {found.length ? found.map((link,index) => <LinkRow key={link.id} link={link} index={index} />) : <View style={{ marginVertical: 24 }}>
        <Copy>条件に合う掲載情報がありません</Copy>
        <Copy small>言葉やカテゴリを変えてお試しください。店舗・施設の網羅的な検索や、避難所の開設状況は提供していません。</Copy>
      </View>}
    </>}
  </Page>;
}

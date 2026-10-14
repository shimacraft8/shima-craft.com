import { View, useWindowDimensions } from "react-native";
import { useApp, safetyLinks } from "../state";
import {
  Page,
  Heading,
  Copy,
  Notice,
  LinkRow,
  DataState,
  Emergency,
  Section,
} from "../ui";
export default function Safety() {
  const { area } = useApp();
  const { fontScale } = useWindowDimensions();
  const links = safetyLinks(area.id);
  const priority = ["tsunami", "warnings", "typhoon", "weather-map", "quake"];
  return (
    <Page>
      <Heading en="OFFICIAL INFORMATION" title="防災と避難" num="04" />
      <Notice
        title="重要 · 現在の状況を確認できません"
        body="地震・津波・気象警報の自動取得は未接続です。公式発表をご確認ください。"
      />
      <DataState />
      <Copy>
        強い揺れ・長い揺れを感じたら、情報を待たず海岸から離れ、高い場所へ避難してください。
      </Copy>
      <Section title="いま確認する公式発表" />
      {priority.map(id => links.find(l => l.id === id)).filter(l => !!l).map((link,index) => <LinkRow key={link.id} link={link} index={index} />)}
      <Section title={`${area.municipality}の避難情報`} />
      <Copy small>避難場所の指定と、避難所が開設中かどうかは別です。最新の案内は自治体へ。</Copy>
      {links.filter(l => !priority.includes(l.id)).map((link,index) => <LinkRow key={link.id} link={link} index={index} />)}
      <Section title="緊急時の電話" />
      <View style={{ flexDirection: fontScale > 1.5 ? "column" : "row", gap: 8, marginVertical: 16 }}>
        <Emergency number="119" label="消防・救急" />
        <Emergency number="110" label="警察" />
      </View>
      {area.id === "koniya" && (
        <Notice
          title="ここは瀬戸内町です"
          body="奄美市ハザードマップの対象外です。この地域の公式情報は瀬戸内町ハザードマップをご確認ください。"
        />
      )}
      <Copy small style={{ marginTop: 24 }}>
        出典：気象庁{"\n"}発表：未取得{"\n"}取得：未取得{"\n"}有効期限：未取得
        {"\n"}現在の警報状況は未確認です。
      </Copy>
      <Copy small style={{ marginTop: 24 }}>
        台風情報には24時間以内に台風へ発達する見込みの熱帯低気圧が含まれます。それ以前のすべての熱帯低気圧を網羅しません。地震履歴・緊急地震速報・現在の津波警報は別の情報です。端末標準の緊急速報を代替しません。
      </Copy>
    </Page>
  );
}

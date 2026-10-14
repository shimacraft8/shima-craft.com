import { LINKS } from "../state";
import {
  Page,
  Heading,
  Copy,
  Section,
  LinkRow,
  DataState,
  Button,
  openOfficial,
} from "../ui";
export default function Move() {
  return (
    <Page>
      <Heading en="GET AROUND" title="島をめぐる" num="03" />
      <Copy>飛行機・船・バスの運航と時刻表。{"\n"}移動の前に、各社の公式発表を。</Copy>
      <DataState />
      {LINKS.filter((l) => l.category === "transport").map((link, index) => (
        <LinkRow key={link.id} link={link} index={index} />
      ))}
      <Section title="運転代行の個別連絡先" />
      <Copy small>
        個別番号は確認中です。上のタクシー・レンタカー案内は公式情報へのリンクで、配車・営業中を保証するものではありません。
      </Copy>
      <Button
        label="奄美市の交通案内 ↗"
        onPress={() =>
          void openOfficial(
            "https://www.city.amami.lg.jp/kanko/kanko/kanko/access.html",
          )
        }
      />
      <Copy small style={{ marginTop: 20 }}>
        このアプリは運航の正常・遅延・欠航を判定していません。日付・便・寄港地は各社の公式発表をご確認ください。
      </Copy>
    </Page>
  );
}

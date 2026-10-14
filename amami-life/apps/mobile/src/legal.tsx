import { View } from "react-native";
import { Button, Copy, Section, openOfficial } from "./ui";
import { apiBase } from "../../../packages/core/src/api-config";

function page(value: string | undefined) {
  try { const u = new URL(value ?? ""); return apiBase(u.origin) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
const privacy = page(process.env.EXPO_PUBLIC_PRIVACY_URL);
const support = page(process.env.EXPO_PUBLIC_SUPPORT_URL);
export function LegalInformation() {
  return <View>
    <Section title="プライバシー" />
    <Copy small>選択地域・画面の設定・保存リンク・旅のメモを端末内に保存します。メモを運営サーバーへ送信する機能はありません。端末のバックアップ設定が適用される場合があります。</Copy>
    <Copy small style={{ marginTop: 12 }}>観測・予報の取得時に、選択した地域と日付を情報APIへ送信します。通信先にはIPアドレス等の接続情報が伝わります。位置情報・カメラ・マイク・連絡先を取得せず、広告・行動解析・利用者ログイン・プッシュ通知はありません。外部の公式ページを開くと、そのサイトの規約が適用されます。</Copy>
    {privacy && <Button label="プライバシーポリシー ↗" onPress={() => void openOfficial(privacy)} />}
    <Section title="利用にあたって" />
    <Copy small>気象庁の観測・予報を加工表示しています。気象庁の公式アプリではありません。配信の遅れや欠測があるため、観測時刻・取得時刻・鮮度を確認してください。潮位は天文潮位の予測で、海況や航行の安全を保証しません。太陽は地点別の参考計算です。</Copy>
    <Copy small style={{ marginTop: 12 }}>防災・運航・避難施設の最新状況は各公式発表で確認してください。アプリは現行警報を常時監視せず、緊急速報を代替しません。</Copy>
    {support && <Button label="サポート・情報の訂正 ↗" onPress={() => void openOfficial(support)} />}
    {__DEV__ && (!privacy || !support) && <Copy small>公開用の運営者情報・プライバシー／サポートURLは未確定です。公開ビルドでは設定が必須です。</Copy>}
  </View>;
}

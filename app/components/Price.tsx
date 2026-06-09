import { Reveal } from "@/app/components/Reveal";

type Row = { service: string; price: string };

const ROWS: Row[] = [
  { service: "HP制作", price: "50,000円〜" },
  { service: "HP制作（写真撮影セット）", price: "70,000円〜" },
  { service: "HP制作（空撮・写真セット）", price: "120,000円〜" },
  { service: "ドメイン取得代行", price: "5,000円（初回のみ）" },
  { service: "サーバー設定", price: "5,000円（初回のみ）" },
  { service: "月額保守・ライト", price: "5,000円/月" },
  { service: "月額保守・スタンダード", price: "7,000円/月" },
  { service: "月額保守・フルサポート", price: "12,000円/月" },
  { service: "ネット集客サポート（各種登録・構築）", price: "30,000円〜" },
  { service: "空撮・映像制作", price: "30,000円〜/本" },
  { service: "動画編集", price: "3,000円〜/本" },
];

export function Price() {
  return (
    <section id="price">
      <div className="container">
        <div className="section-label">Price</div>
        <Reveal dir="up">
          <h2 className="section-title">PRICE</h2>
        </Reveal>

        <Reveal dir="left">
          <div className="price-wrap">
            <table>
              <thead>
                <tr>
                  <th>サービス</th>
                  <th>料金</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.service}>
                    <td>{row.service}</td>
                    <td>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="price-note">
              すべて税込表示。空撮は事前申請が必要な場合があります。詳細はお気軽にご相談ください。
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

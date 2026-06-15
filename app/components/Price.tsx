import { Reveal } from "@/app/components/Reveal";

/* ── HP制作（初期費用）────────────────────────── */
const INIT: { service: string; price: string; note?: string }[] = [
  {
    service: "HP制作",
    price: "150,000円",
    note: "初回ドメイン代・1年間の保守込み",
  },
  {
    service: "HP制作（写真撮影セット）",
    price: "180,000円〜",
    note: "上記＋写真撮影",
  },
  {
    service: "HP制作（空撮・写真セット）",
    price: "200,000円〜",
    note: "上記＋ドローン空撮・写真",
  },
];

/* ── 年間保守に含まれること / 含まれないこと ─────── */
const INCLUDED = [
  "HP維持・SSL管理",
  "セキュリティ更新",
  "年間を通じた軽微な修正対応",
];
const EXCLUDED = [
  "ページ追加・大幅なデザイン変更",
  "写真撮影・動画制作",
  "各種オプションサービス",
];

/* ── 都度対応 ────────────────────────────────── */
const SPOT: { service: string; price: string }[] = [
  { service: "ページ追加・デザイン変更", price: "要お見積もり" },
  { service: "写真撮影", price: "要お見積もり" },
  { service: "動画編集", price: "3000円〜/本" },
  { service: "空撮・映像制作", price: "30000円〜/本" },
  { service: "ネット集客サポート（じゃらん・ホットペッパー等の登録・構築）", price: "30000円〜" },
];

export function Price() {
  return (
    <section id="price">
      <div className="container">
        <div className="section-label">Price</div>
        <Reveal dir="up">
          <h2 className="section-title">PRICE</h2>
        </Reveal>

        <div className="price-blocks">

          {/* ── HP制作（初期費用）─────────────────── */}
          <Reveal dir="up">
            <div className="price-block price-block--feature">
              <div className="price-block-header">
                <span className="price-block-tag">初期費用</span>
                <h3 className="price-block-title">HP制作</h3>
              </div>
              <table className="price-table">
                <thead>
                  <tr><th>プラン</th><th>料金</th></tr>
                </thead>
                <tbody>
                  {INIT.map((r) => (
                    <tr key={r.service}>
                      <td>
                        {r.service}
                        {r.note && (
                          <span className="price-table-note">{r.note}</span>
                        )}
                      </td>
                      <td>{r.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#999", padding: "16px 28px 20px" }}>
                初回費用にドメイン取得代・1年間の保守がすべて含まれます。
              </p>
            </div>
          </Reveal>

          {/* ── 年間保守（2年目以降）─────────────────── */}
          <Reveal dir="up">
            <div className="price-block">
              <div className="price-block-header">
                <span className="price-block-tag">年間契約</span>
                <h3 className="price-block-title">保守プラン（2年目以降）</h3>
              </div>

              <p style={{ textAlign: "center", fontSize: "0.92rem", color: "#555", padding: "20px 28px 4px", lineHeight: 1.8 }}>
                ドメイン更新のタイミングで、年1回の契約更新。<br />
                <span style={{ fontSize: "0.82rem", color: "#999" }}>解約時はファイル一式をすべてお渡しします。ドメインの変更手続きはご自身でのご対応となります。</span>
              </p>

              <div className="price-checklist-wrap">
                <div className="price-checklist">
                  <p className="price-checklist-label price-checklist-label--in">含まれること</p>
                  <ul>
                    {INCLUDED.map((item) => (
                      <li key={item}>
                        <span className="price-check price-check--in" aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="price-checklist">
                  <p className="price-checklist-label price-checklist-label--out">含まれないこと</p>
                  <ul>
                    {EXCLUDED.map((item) => (
                      <li key={item}>
                        <span className="price-check price-check--out" aria-hidden="true">✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* オプション */}
              <div className="price-option-row">
                <span className="price-option-label">＋ オプション</span>
                <span className="price-option-item">
                  Googleマップ管理（口コミ返信・写真追加・投稿代行）
                </span>
                <span className="price-option-price">別途ご相談</span>
              </div>
            </div>
          </Reveal>

          {/* ── 都度対応 ───────────────────────────── */}
          <Reveal dir="up">
            <div className="price-block">
              <div className="price-block-header">
                <span className="price-block-tag">都度対応</span>
                <h3 className="price-block-title">スポット・オプション</h3>
              </div>
              <table className="price-table">
                <thead>
                  <tr><th>サービス</th><th>料金</th></tr>
                </thead>
                <tbody>
                  {SPOT.map((r) => (
                    <tr key={r.service}>
                      <td>{r.service}</td>
                      <td>{r.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

        </div>{/* /price-blocks */}

        <p className="price-note" style={{ marginTop: "32px" }}>
          すべて税込表示。事業者登録番号なし（免税事業者）。<br />
          空撮は事前申請が必要な場合があります。詳細はお気軽にご相談ください。
        </p>
      </div>
    </section>
  );
}

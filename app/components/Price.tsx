import { Reveal } from "@/app/components/Reveal";

/* ── HP制作（初期費用）────────────────────────── */
const INIT: { service: string; price: string }[] = [
  { service: "HP制作", price: "10,000円" },
  { service: "HP制作（写真撮影セット）", price: "30,000円〜" },
  { service: "HP制作（空撮・写真セット）", price: "50,000円〜" },
];

/* ── 月額保守に含まれること / 含まれないこと ─────── */
const INCLUDED = [
  "HP維持・SSL管理",
  "セキュリティ更新",
  "月1回の軽微な修正",
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
  { service: "動画編集", price: "3,000円〜/本" },
  { service: "空撮・映像制作", price: "30,000円〜/本" },
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
            <div className="price-block">
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
                      <td>{r.service}</td>
                      <td>{r.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* ── 月額保守（1プラン）─────────────────── */}
          <Reveal dir="up">
            <div className="price-block price-block--feature">
              <div className="price-block-header">
                <span className="price-block-tag">月額</span>
                <h3 className="price-block-title">月額保守プラン</h3>
              </div>

              <div className="price-monthly-hero">
                <span className="price-monthly-amount">4,800</span>
                <span className="price-monthly-unit">円<small>/月</small></span>
              </div>
              <p className="price-monthly-catch">プランは1つだけ。シンプルに、続けやすく。</p>

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
                <span className="price-option-price">3,000円/月</span>
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

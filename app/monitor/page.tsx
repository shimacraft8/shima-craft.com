import type { Metadata } from "next";

import { MonitorForm } from "./MonitorForm";
import styles from "./monitor.module.css";

export const metadata: Metadata = {
  title: "Web集客導線整備モニター募集｜全国・業種問わず - SHIMA CRAFT",
  description:
    "全国・業種問わず募集。Googleマップ、スマホ用1ページ、問い合わせ・予約導線を整えるモニターを残り3枠、初年度55,000円で募集します。",
  alternates: { canonical: "/monitor" },
  openGraph: {
    title: "Web集客導線整備モニター募集｜全国・業種問わず",
    description:
      "全国・業種問わず募集。Googleマップ、スマホ用1ページ、問い合わせ・予約導線を整えるモニターを残り3枠、初年度55,000円で募集します。",
    url: "/monitor",
    type: "website",
  },
};

export default function MonitorPage() {
  return (
    <div className={styles.root}>
      {/* ===== ページ固有ヘッダー ===== */}
      <header className={styles.siteHead}>
        <div className={styles.siteHeadInner}>
          <a className={styles.logo} href="/">
            SHIMA <span className={styles.logoAccent}>CRAFT</span>
          </a>
          <div className={styles.headNote}>奄美発・全国オンライン対応</div>
          <a className={styles.headCta} href="#apply">今すぐ申し込む</a>
        </div>
      </header>

      <main>
        {/* ===== Hero ===== */}
        <section className={styles.hero}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div>
              <span className={styles.badge}>全国・業種問わず｜残り3枠</span>
              <div className={styles.kicker}>Google &amp; Web Entrance Setup</div>
              <h1 className={styles.heroTitle}>
                <span>Googleで見つけてもらい、</span>
                <span><em>問い合わせ・予約に</em></span>
                <span><em>つながる</em>窓口を</span>
                <span>整えます。</span>
              </h1>
              <p className={styles.heroCopy}>
                Googleマップの営業時間や写真、スマホで見やすい紹介ページ、電話・LINE・予約先への導線を、
                <strong>お店に必要な分だけ</strong>まとめて整えます。
              </p>
              <div className={styles.heroActions}>
                <a className={`${styles.btn} ${styles.btnPrimary}`} href="#apply">今すぐ申し込む</a>
                <a className={`${styles.btn} ${styles.btnSecondary}`} href="#service">内容を見る</a>
              </div>
              <p className={styles.micro}>
                個人事業主・法人・店舗・宿・事務所・オンライン事業など、業種や地域を問わずお申し込みいただけます。電話営業は行いません。
              </p>
            </div>

            <aside className={styles.heroCard} aria-label="モニター料金と内容">
              <div className={styles.heroCardInner}>
                <div className={styles.priceLabel}>Monitor Price</div>
                <div className={styles.price}>55,000円<small>（税込）</small></div>
                <div className={styles.priceNote}>初期整備＋公開後1年間の見守り</div>
                <ul className={styles.heroList}>
                  <li>Googleビジネスプロフィールの初期整備</li>
                  <li>スマホ用1ページサイトの制作</li>
                  <li>問い合わせ・予約先への導線設定</li>
                  <li>1・3・6・12か月後の簡易レポート</li>
                  <li>年間6回までの軽微な情報変更</li>
                </ul>
                <div className={styles.slotBox}>残り3枠</div>
              </div>
            </aside>
          </div>
        </section>

        {/* ===== こんな状態を ===== */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>Is this you?</div>
              <h2>こんな状態を、そのままにしていませんか。</h2>
              <p className={styles.sectionLead}>
                ホームページを無理に作るサービスではありません。いま使っているGoogleマップ、電話、LINE、予約サイトなどを活かしながら、分かりにくい部分だけを整えます。
              </p>
            </div>
            <div className={styles.problemGrid}>
              <div className={styles.problem}><span>1</span><p>Googleマップの営業時間・定休日・業種が、現在の内容と合っているか分からない</p></div>
              <div className={styles.problem}><span>2</span><p>ホームページがなく、初めてのお客様がサービス内容や予約方法を確認しにくい</p></div>
              <div className={styles.problem}><span>3</span><p>電話に出られない時間があり、あとで折り返してもつながらないことがある</p></div>
              <div className={styles.problem}><span>4</span><p>InstagramやLINEはあるが、Googleマップからうまくつながっていない</p></div>
              <div className={styles.problem}><span>5</span><p>急な休業や営業時間変更を、どこで知らせればよいか決まっていない</p></div>
              <div className={styles.problem}><span>6</span><p>ITは苦手で、何を頼めばよいか自分でも整理できていない</p></div>
            </div>
          </div>
        </section>

        {/* ===== サービス内容 ===== */}
        <section className={styles.section} id="service">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>Service</div>
              <h2>3つをつなげて、ネット上の窓口を整えます。</h2>
            </div>
            <div className={styles.serviceGrid}>
              <article className={styles.service}>
                <span className={styles.serviceNo}>01</span>
                <h3>Googleで、正しい情報を見つけてもらう</h3>
                <p>営業時間、定休日、業種、サービス内容、写真、説明文を整理します。Google側の審査やオーナー確認には、事業者さまのご協力が必要です。</p>
              </article>
              <article className={styles.service}>
                <span className={styles.serviceNo}>02</span>
                <h3>スマホで見やすい1ページにまとめる</h3>
                <p>何を頼めるか、料金の考え方、場所、連絡方法などを整理。文章は、いただいた情報をもとにSHIMA CRAFT側でまとめます。</p>
              </article>
              <article className={styles.service}>
                <span className={styles.serviceNo}>03</span>
                <h3>電話・LINE・予約先へ迷わず進める</h3>
                <p>お店の運用に合わせて、電話、公式LINE、問い合わせフォーム、既存の予約サイトなど、必要な連絡先だけを設置します。</p>
              </article>
            </div>
            <div className={styles.scope}>
              <h3>公開後1年間の見守り</h3>
              <ul>
                <li>公開後1・3・6・12か月の簡易レポート</li>
                <li>年間6回までの営業時間・文章等の軽微な変更</li>
                <li>技術的な表示不具合への対応</li>
                <li>変更依頼は原則2営業日以内に反映</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== 含まれること・含まれないこと ===== */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>Scope</div>
              <h2>55,000円に含まれること・含まれないこと。</h2>
              <p className={styles.sectionLead}>あとから認識違いが起きないよう、最初から範囲を明確にします。</p>
            </div>
            <div className={styles.compare}>
              <div className={`${styles.box} ${styles.boxGood}`}>
                <h3>含まれること</h3>
                <ul>
                  <li>1ページ構成のスマホ向けページ制作</li>
                  <li>掲載写真10枚まで</li>
                  <li>文章整理・初回提案後の修正2回まで</li>
                  <li>Googleビジネスプロフィールの初期整備支援</li>
                  <li>電話・LINE・予約先などへの導線設定</li>
                  <li>1年間の軽微な変更・不具合対応</li>
                </ul>
              </div>
              <div className={`${styles.box} ${styles.boxNot}`}>
                <h3>別途見積りになること</h3>
                <ul>
                  <li>複数ページのホームページ制作</li>
                  <li>予約システム・決済機能・顧客管理</li>
                  <li>公式LINEの新規構築・継続配信</li>
                  <li>写真・動画・ドローン撮影</li>
                  <li>SNS投稿や日々の運用代行</li>
                  <li>広告費・有料サービス利用料・独自ドメイン費</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ===== なぜモニター価格か ===== */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>Why Monitor?</div>
              <h2>なぜ、モニター価格なのか。</h2>
            </div>
            <div className={styles.monitorGrid}>
              <div className={styles.monitorCopy}>
                <h3>安さには、きちんと理由があります。</h3>
                <p>このサービスを正式に広げる前に、さまざまな地域・業種の方と実例をつくり、どこまで役立つかを確認したいと考えています。</p>
                <p>そのため、残り3枠に限り、通常より抑えた価格でお受けします。</p>
              </div>
              <div className={styles.monitorList}>
                <div className={styles.monitorItem}>
                  <span>1</span>
                  <div>
                    <h4>事例掲載へのご協力</h4>
                    <p>店名を出すか、匿名にするかはお選びいただけます。</p>
                  </div>
                </div>
                <div className={styles.monitorItem}>
                  <span>2</span>
                  <div>
                    <h4>公開後の簡単な感想</h4>
                    <p>良かった点だけでなく、分かりにくかった点も教えてください。</p>
                  </div>
                </div>
                <div className={styles.monitorItem}>
                  <span>3</span>
                  <div>
                    <h4>数字の確認</h4>
                    <p>可能な範囲で、Google上の閲覧数や電話・経路検索などを一緒に確認します。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== お申し込みに必要なもの ===== */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>Before Applying</div>
              <h2>お申し込みに必要なもの。</h2>
              <p className={styles.sectionLead}>
                お申し込み前に、以下をご確認ください。すべて揃っていなくても申し込みは可能ですが、制作開始までにご用意いただきます。
              </p>
            </div>
            <div className={styles.problemGrid}>
              <div className={styles.problem}><span>1</span><p>お名前・店名または事業名・返信先メールアドレス</p></div>
              <div className={styles.problem}><span>2</span><p>現在のGoogleマップ、ホームページ、SNSなどのURL（ある場合）</p></div>
              <div className={styles.problem}><span>3</span><p>掲載したい基本情報：事業内容、営業時間、所在地、連絡方法など</p></div>
              <div className={styles.problem}><span>4</span><p>掲載に使える写真。目安は5〜10枚。写真がない場合は別途ご相談ください</p></div>
              <div className={styles.problem}><span>5</span><p>モニター条件への同意：事例掲載、完成後の感想、可能な範囲での数値確認</p></div>
              <div className={styles.problem}><span>6</span><p>制作内容の確認と修正に対応できる連絡手段。やり取りは原則メールです</p></div>
            </div>
          </div>
        </section>

        {/* ===== 流れ ===== */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>Flow</div>
              <h2>お申し込みから公開まで。</h2>
            </div>
            <div className={styles.flow}>
              <div className={styles.flowItem}>
                <h3>お申し込み</h3>
                <p>フォームに必要事項を入力し、モニターへお申し込みください。</p>
              </div>
              <div className={styles.flowItem}>
                <h3>受付・内容確認</h3>
                <p>内容を確認し、対応範囲と着手予定日をメールでご案内します。</p>
              </div>
              <div className={styles.flowItem}>
                <h3>情報・写真の共有</h3>
                <p>スマホで答えられる質問シートにご回答いただきます。</p>
              </div>
              <div className={styles.flowItem}>
                <h3>制作・公開</h3>
                <p>確認と修正を経て、通常3〜4週間ほどで公開します。</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div className={styles.eyebrow}>FAQ</div>
              <h2>よくあるご質問</h2>
            </div>
            <div className={styles.faq}>
              <details>
                <summary>必ず問い合わせや予約が増えますか？</summary>
                <p>増加を保証するサービスではありません。まず情報と導線を整え、公開後の数字を確認します。必要のない機能や、効果が見込めない追加提案は行いません。</p>
              </details>
              <details>
                <summary>ホームページがすでにあっても対象ですか？</summary>
                <p>対象です。既存サイトが十分機能している場合は、Googleマップや問い合わせ導線だけを見直すこともあります。</p>
              </details>
              <details>
                <summary>地域や業種に制限はありますか？</summary>
                <p>ありません。全国から、個人事業主・法人・店舗・宿泊業・サービス業・オンライン事業など、業種を問わずお申し込みいただけます。ただし、提供内容とご希望が大きく異なる場合は、受付後にその旨をご案内します。</p>
              </details>
              <details>
                <summary>途中で高額な契約を勧められませんか？</summary>
                <p>追加作業が必要な場合は、理由・範囲・金額を事前にお伝えします。必要がない場合は、そのまま1年間の見守りだけで終了します。</p>
              </details>
              <details>
                <summary>2年目以降はどうなりますか？</summary>
                <p>自動更新はしません。継続をご希望の場合のみ、内容を確認して改めてご案内します。制作したページやデータは、終了時にお渡しできます。</p>
              </details>
            </div>
          </div>
        </section>

        {/* ===== 申し込みフォーム ===== */}
        <section className={styles.apply} id="apply">
          <div className={styles.container}>
            <div className={styles.applyCard}>
              <div className={styles.applyCopy}>
                <div className={styles.eyebrow}>Contact</div>
                <h2>モニターへ今すぐ申し込む。</h2>
                <p>下記の必要事項を入力してお申し込みください。内容を確認後、受付可否・対応範囲・着手予定日をメールでご案内します。</p>
                <p className={styles.small}>お申し込みだけで料金は発生しません。正式な受付内容をご確認いただいた後に契約・お支払いとなります。営業電話は行いません。</p>
              </div>
              <MonitorForm />
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>奄美発・全国オンライン対応｜SHIMA CRAFT</div>
        <div>© 2026 SHIMA CRAFT All Rights Reserved.</div>
      </footer>
    </div>
  );
}

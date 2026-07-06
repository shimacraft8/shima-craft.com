import type { Metadata } from 'next';
import styles from './page.module.css';

// 奄美ロードクエスト SEOランディングページ (App Router用)
// 配置先: app/amami-road-quest/page.tsx
// ゲーム本体: public/amami-road-quest/play/ (静的ファイル)

const SITE = 'https://shima-craft.com';
const PAGE_URL = `${SITE}/amami-road-quest`;
const PLAY_URL = '/amami-road-quest/play/';

export const metadata: Metadata = {
  title: '奄美ロードクエスト｜奄美大島の道を出発前に体験できる無料Webゲーム',
  description:
    '奄美空港からあやまる岬・名瀬・古仁屋など5つの実在ルートを、ゲーム感覚で出発前に予習できる無料Webアプリ。レンタカー運転が不安な方の道の下見に。登録不要・スマホ対応。SHIMA CRAFT提供。',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: '奄美ロードクエスト｜奄美大島の道を出発前に体験できる無料Webゲーム',
    description:
      '奄美空港から主要観光地までの道をゲーム感覚で予習。チェックポイントを集めてゴールを目指そう。無料・登録不要・スマホ対応。',
    url: PAGE_URL,
    siteName: 'SHIMA CRAFT',
    images: [{ url: `${SITE}/amami-road-quest/ogp.png`, width: 1200, height: 630 }],
    locale: 'ja_JP',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: '奄美ロードクエスト｜奄美大島の道を出発前に体験できる無料Webゲーム',
    description: '奄美空港から主要観光地までの道をゲーム感覚で予習できる無料Webアプリ。'
  }
};

const ROUTES = [
  { icon: '🌊', name: '奄美空港 → あやまる岬', description: '北部の海岸ルート。到着後すぐ行ける絶景スポットへの道を予習。', minutes: '約3分' },
  { icon: '🎨', name: '奄美空港 → 奄美パーク', description: '空港から一番近い文化スポットへ。到着直後の移動に。', minutes: '約2分' },
  { icon: '🚙', name: '奄美空港 → 名瀬市街地', description: '島の中心地への主要ルート。多くの旅行者が最初に走る道。', minutes: '約5分' },
  { icon: '🛶', name: '名瀬 → マングローブ周辺', description: '市街地から南の自然エリアへ。カヌー体験の前の下見に。', minutes: '約4分' },
  { icon: '⛴️', name: '名瀬 → 古仁屋', description: '島南部の港町まで。加計呂麻島へ渡る前の長距離ルート。', minutes: '約6分' }
];

const FAQ = [
  {
    q: '本当に無料で使えますか?',
    a: 'はい。登録不要・完全無料でご利用いただけます。ブラウザだけで動作し、アプリのインストールも不要です。'
  },
  {
    q: 'カーナビの代わりになりますか?',
    a: 'なりません。奄美ロードクエストは出発前にルートの雰囲気や目印を予習するためのもので、実運転用のナビゲーションではありません。実際の走行では道路状況・交通規制を必ずご確認ください。'
  },
  {
    q: '運転中に使ってもいいですか?',
    a: 'いいえ。運転中の操作は禁止です。出発前・停車中、または同乗者の方がご利用ください。'
  },
  {
    q: 'スマートフォンでも遊べますか?',
    a: 'はい。スマートフォン・タブレット・パソコンのブラウザに対応しています。'
  },
  {
    q: '実際の景色が見られますか?',
    a: '実写表示が有効な場合、Google ストリートビューの実際の風景がルートに沿って表示されます。実写が利用できない環境でも、デモ景観ですべての機能をお試しいただけます。'
  },
  {
    q: 'ルートの座標は正確ですか?',
    a: 'ルートは主要道路に沿った概略です。ゲーム内の道順・距離は参考情報であり、実際の運転では最新の地図・道路標識に従ってください。'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: '奄美ロードクエスト',
      url: PAGE_URL,
      description:
        '奄美大島の主要ドライブルートを出発前にゲーム感覚で予習できる無料Webアプリ。',
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web',
      inLanguage: 'ja',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      publisher: { '@type': 'Organization', name: 'SHIMA CRAFT', url: SITE }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE },
        { '@type': 'ListItem', position: 2, name: '奄美ロードクエスト', item: PAGE_URL }
      ]
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    }
  ]
};

export default function AmamiRoadQuestPage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="パンくずリスト" className={styles.breadcrumb}>
        <ol>
          <li><a href="/">ホーム</a></li>
          <li aria-current="page">奄美ロードクエスト</li>
        </ol>
      </nav>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>FREE WEB EXPERIENCE</p>
        <h1>奄美ロードクエスト</h1>
        <p className={styles.lead}>
          奄美大島の道を、行く前に冒険する。<br />
          空港から観光地までの実在ルートをゲーム感覚で予習できる、無料のWebアプリです。
        </p>
        <a className={styles.cta} href={PLAY_URL}>
          無料で冒険をはじめる
        </a>
        <p className={styles.ctaNote}>登録不要・インストール不要・スマホ対応</p>
      </section>

      <section aria-labelledby="about-heading" className={styles.section}>
        <h2 id="about-heading">はじめての奄美の道でも、迷わず走りたい方へ</h2>
        <p>
          「奄美大島でレンタカーを借りるけれど、知らない道を走るのが不安」「目的地の入口や曲がり角を事前に知っておきたい」。
          奄美ロードクエストは、そんな旅行前の不安を小さくするために作られました。
        </p>
        <p>
          空港や名瀬から主要な観光地までのルートを、景色を眺めながら自動で進み、
          分岐やチェックポイントをゲームのように確認できます。実写表示が有効な場合は、
          Google ストリートビューの実際の風景で道の雰囲気をつかめます。
        </p>
      </section>

      <section aria-labelledby="routes-heading" className={styles.section}>
        <h2 id="routes-heading">収録している5つのルート</h2>
        <ul className={styles.routeList}>
          {ROUTES.map((route) => (
            <li key={route.name}>
              <span className={styles.routeIcon} aria-hidden="true">{route.icon}</span>
              <div>
                <strong>{route.name}</strong>
                <p>{route.description}</p>
              </div>
              <span className={styles.routeTime}>{route.minutes}</span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          ルートは主要道路に沿った概略です。実際の運転では最新の地図・道路標識・交通規制に従ってください。
        </p>
      </section>

      <section aria-labelledby="how-heading" className={styles.section}>
        <h2 id="how-heading">遊び方は3ステップ</h2>
        <ol className={styles.steps}>
          <li><strong>ルートを選ぶ</strong> — 行く予定の場所や気になる道を5ルートから選択。</li>
          <li><strong>景色を進む</strong> — 「出発する」を押すと景色が自動で進行。一時停止・速度変更も自由。</li>
          <li><strong>目印を覚えてゴール</strong> — チェックポイントと分岐クイズで道を確認し、ポイントと称号を獲得。</li>
        </ol>
      </section>

      <section aria-labelledby="safety-heading" className={styles.sectionSafety}>
        <h2 id="safety-heading">安全にお使いいただくために</h2>
        <ul>
          <li>運転中の操作は禁止です。出発前・停車中・同乗者の方がご利用ください。</li>
          <li>本アプリは実運転用のナビゲーションではありません。</li>
          <li>道路状況・規制・施設の営業情報は、必ず公式情報でご確認ください。</li>
          <li>位置情報の取得や個人情報の収集は行いません。プレイ記録はお使いの端末内にのみ保存されます。</li>
        </ul>
      </section>

      <section aria-labelledby="faq-heading" className={styles.section}>
        <h2 id="faq-heading">よくある質問</h2>
        <dl className={styles.faq}>
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.bottomCta}>
        <h2>さっそく奄美の道を予習してみる</h2>
        <a className={styles.cta} href={PLAY_URL}>
          無料で冒険をはじめる
        </a>
        <p className={styles.related}>
          あわせて読みたい: <a href="/amami-dialect">奄美方言辞書</a> ・ <a href="/">SHIMA CRAFTトップ</a>
        </p>
      </section>

      <p className={styles.operator}>
        運営: <a href="/">SHIMA CRAFT</a>(奄美大島のWeb制作)｜実写表示にはGoogle
        ストリートビューを利用しています。地図データ・画像は各権利者に帰属します。
      </p>
    </main>
  );
}

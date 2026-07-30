import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import tideDataJson from "@/data/generated/amami-o9-2026.json";
import type { TideDataset } from "@/app/lib/amami-tide/types";
import { addDays, formatJapaneseDate, getTokyoToday, normalizeDateParam } from "@/app/lib/amami-tide/date";
import { calculateMoonPhase, calculateSunTimes } from "@/app/lib/amami-tide/astronomy";
import {
  buildActivityWindows,
  buildPlainLanguageSummary,
  getTideDay,
  getTideSnapshot,
  tideTrendLabel,
} from "@/app/lib/amami-tide/tide";
import { getAmamiWeather, weatherCodeLabel, weatherIconKind } from "@/app/lib/amami-tide/weather";
import { ActivityIcon } from "./components/ActivityIcon";
import { DateNavigator } from "./components/DateNavigator";
import {
  CalendarIcon,
  HighTideIcon,
  HomeIcon,
  LocationIcon,
  LowTideIcon,
  MenuIcon,
  MoonIcon,
  SunriseIcon,
  SunsetIcon,
  WaveMark,
} from "./components/icons";
import { TideChart } from "./components/TideChart";
import { WeatherIcon } from "./components/WeatherIcon";
import styles from "./amami-tide.module.css";

const dataset = tideDataJson as TideDataset;
export const revalidate = 3600;

function minuteInTokyo(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return (Number(values.hour) % 24) * 60 + Number(values.minute);
}

export function generateMetadata({ searchParams }: { searchParams?: { date?: string | string[] } }): Metadata {
  const selectedDate = normalizeDateParam(searchParams?.date, 2026);
  const dateLabel = formatJapaneseDate(selectedDate);
  const canonical = "https://shima-craft.com/amami-tide";
  const isDateQuery = Boolean(searchParams?.date);
  return {
    title: `奄美大島の潮見表｜${dateLabel}の満潮・干潮・日の出・天気`,
    description: `${dateLabel}の奄美大島・名瀬小湊基準の潮位予測、満潮・干潮、日の出・日の入り、直近の天気と観光の参考時間をスマホで分かりやすく確認できます。`,
    alternates: { canonical },
    openGraph: {
      title: `奄美の潮と空｜${dateLabel}`,
      description: "潮・天気・日の出入りから、今日の奄美を楽しむ時間を見つけよう。",
      url: canonical,
      type: "website",
      locale: "ja_JP",
    },
    robots: isDateQuery ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function AmamiTidePage({ searchParams }: { searchParams?: { date?: string | string[] } }) {
  const today = getTokyoToday();
  const selectedDate = normalizeDateParam(searchParams?.date, 2026);
  const day = getTideDay(dataset, selectedDate) ?? dataset.days[0];
  const isToday = selectedDate === today;
  const currentMinute = isToday ? minuteInTokyo() : null;
  const snapshot = getTideSnapshot(day, currentMinute ?? 12 * 60);
  const sun = calculateSunTimes(selectedDate, dataset.station.latitude, dataset.station.longitude);
  const moon = calculateMoonPhase(selectedDate);
  const activities = buildActivityWindows({ day, sunrise: sun.sunrise, sunset: sun.sunset, moonIllumination: moon.illumination });
  const weather = await getAmamiWeather();
  const selectedWeather = weather?.days.find((item) => item.date === selectedDate) ?? null;
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(selectedDate, index);
    const tide = getTideDay(dataset, date);
    const forecast = weather?.days.find((item) => item.date === date) ?? null;
    return { date, tide, forecast };
  }).filter((item) => item.tide);
  const dateLabel = formatJapaneseDate(selectedDate);
  const summary = buildPlainLanguageSummary({ dateLabel, stationLabel: "奄美・名瀬小湊", day, sunrise: sun.sunrise, sunset: sun.sunset });
  const nextHigh = snapshot.nextHigh ?? day.highTides[0] ?? null;
  const nextLow = snapshot.nextLow ?? day.lowTides[0] ?? null;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://shima-craft.com/amami-tide#webpage",
        url: "https://shima-craft.com/amami-tide",
        name: `奄美大島の潮見表｜${dateLabel}`,
        description: summary,
        inLanguage: "ja-JP",
        dateModified: dataset.source.retrievedAt,
        isPartOf: { "@id": "https://shima-craft.com/#website" },
        about: { "@id": "https://shima-craft.com/amami-tide#dataset" },
      },
      {
        "@type": "Dataset",
        "@id": "https://shima-craft.com/amami-tide#dataset",
        name: "奄美・名瀬小湊 2026年潮位予測データ",
        description: "気象庁の2026年潮位表を表示用に加工した、毎時潮位および満潮・干潮のデータ。",
        temporalCoverage: "2026-01-01/2026-12-31",
        spatialCoverage: {
          "@type": "Place",
          name: dataset.station.locationJa,
          geo: {
            "@type": "GeoCoordinates",
            latitude: dataset.station.latitude,
            longitude: dataset.station.longitude,
          },
        },
        creator: { "@type": "Organization", name: "気象庁" },
        includedInDataCatalog: { "@type": "DataCatalog", name: "気象庁 潮位表" },
        license: "https://www.jma.go.jp/jma/kishou/info/coment.html",
        isBasedOn: dataset.source.pageUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SHIMA CRAFT", item: "https://shima-craft.com/" },
          { "@type": "ListItem", position: 2, name: "奄美の潮と空", item: "https://shima-craft.com/amami-tide" },
        ],
      },
    ],
  };

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true"><span/><span/><span/></div>
        <header className={styles.appHeader}>
          <Link href="/" className={styles.brand} aria-label="SHIMA CRAFT トップへ">
            <Image src="/logo-white.png" alt="SHIMA CRAFT" width={150} height={33} className={styles.brandLogo} priority />
            <small>AMAMI ISLANDS GUIDE</small>
          </Link>
          <div className={styles.headerActions}>
            <a href="#date-search" className={styles.circleAction}><CalendarIcon/><span>日付検索</span></a>
            <button type="button" className={styles.circleAction} aria-label="メニュー"><MenuIcon/><span>メニュー</span></button>
          </div>
        </header>
        <div className={styles.heroCopy}>
          <WaveMark className={styles.heroWave} />
          <p className={styles.eyebrow}>AMAMI TIDE &amp; SKY</p>
          <h1>奄美の潮と空</h1>
          <p>潮・天気・日の出入りから、今日の奄美を楽しむ時間を見つけよう。</p>
          <span className={styles.locationPill}><LocationIcon/>{dataset.station.locationJa} 基準</span>
        </div>
      </section>

      <div className={styles.shell}>
        <section id="date-search" className={styles.todayCard}>
          <div className={styles.cardTopline}>
            <div><span className={styles.todayBadge}>{isToday ? "今日" : "選択日"}</span><h2>{dateLabel}</h2></div>
            <DateNavigator selectedDate={selectedDate} today={today} />
          </div>

          <div className={styles.quickGrid}>
            <article className={`${styles.quickPanel} ${styles.weatherPanel}`}>
              <WeatherIcon kind={weatherIconKind(selectedWeather?.weatherCode ?? null)} className={styles.weatherArt}/>
              <div><span className={styles.panelLabel}>天気予報</span><strong>{weatherCodeLabel(selectedWeather?.weatherCode ?? null, selectedWeather?.weatherText ?? null)}</strong><p>{selectedWeather?.maxTempC ?? "--"}℃ / {selectedWeather?.minTempC ?? "--"}℃　降水 {selectedWeather?.precipitationProbability ?? "--"}%</p></div>
            </article>
            <article className={styles.quickPanel}><SunriseIcon className={styles.sunriseColor}/><div><span className={styles.panelLabel}>日の出</span><strong>{sun.sunrise}</strong></div></article>
            <article className={styles.quickPanel}><SunsetIcon className={styles.sunsetColor}/><div><span className={styles.panelLabel}>日の入り</span><strong>{sun.sunset}</strong></div></article>
            <article className={styles.quickPanel}><MoonIcon className={styles.moonColor}/><div><span className={styles.panelLabel}>月齢（概算）</span><strong>{moon.age}</strong><p>{moon.label}</p></div></article>
          </div>

          <div className={styles.tideStatusGrid}>
            <article className={`${styles.statusPanel} ${styles.currentStatus}`}><WaveMark/><div><span>推定潮位</span><strong>{snapshot.estimatedHeightCm}cm</strong><p>{tideTrendLabel(snapshot.trend)}</p></div></article>
            <article className={styles.statusPanel}><HighTideIcon/><div><span>{isToday ? "次の満潮" : "満潮"}</span><strong>{nextHigh?.time ?? "--:--"}</strong><p>{nextHigh ? `${nextHigh.heightCm}cm` : "該当なし"}</p></div></article>
            <article className={styles.statusPanel}><LowTideIcon/><div><span>{isToday ? "次の干潮" : "干潮"}</span><strong>{nextLow?.time ?? "--:--"}</strong><p>{nextLow ? `${nextLow.heightCm}cm` : "該当なし"}</p></div></article>
          </div>

          <TideChart day={day} sunrise={sun.sunrise} sunset={sun.sunset} currentMinute={currentMinute}/>
          <p className={styles.graphNote}>毎時潮位は気象庁の天文潮位予測です。時刻間の推定潮位は線形補間した参考値で、実測値ではありません。</p>
        </section>

        <section className={styles.section} aria-labelledby="activities-title">
          <div className={styles.sectionHeading}><div><p>PLAN YOUR ISLAND DAY</p><h2 id="activities-title">今日のおすすめ島時間</h2></div><WaveMark/></div>
          <div className={styles.activityGrid}>
            {activities.map((activity) => (
              <article key={activity.id} className={`${styles.activityCard} ${styles[`tone_${activity.tone}`]}`}>
                <ActivityIcon id={activity.id} className={styles.activityIcon}/>
                <h3>{activity.title}</h3>
                <span>{activity.label}</span>
                <strong>{activity.start && activity.end ? `${activity.start}〜${activity.end}` : "要確認"}</strong>
                <p>{activity.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="week-title">
          <div className={styles.sectionHeading}><div><p>YOUR TRIP AT A GLANCE</p><h2 id="week-title">7日間の潮と天気</h2></div><Link href="#month-table">月間を見る →</Link></div>
          <div className={styles.weekScroller}>
            {weekDays.map(({ date, tide, forecast }, index) => {
              const high = tide?.highTides[0];
              const low = tide?.lowTides[0];
              return <Link key={date} href={`/amami-tide?date=${date}`} className={`${styles.weekCard} ${index === 0 ? styles.weekCardActive : ""}`}>
                <time dateTime={date}>{new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${date}T12:00:00+09:00`))}</time>
                <WeatherIcon kind={weatherIconKind(forecast?.weatherCode ?? null)} className={styles.weekWeather}/>
                <span>{forecast?.maxTempC ?? "--"}° / {forecast?.minTempC ?? "--"}°</span>
                <small>満 {high?.time ?? "--:--"}</small>
                <small>干 {low?.time ?? "--:--"}</small>
              </Link>;
            })}
          </div>
        </section>

        <section className={`${styles.section} ${styles.answerSection}`} aria-labelledby="answer-title">
          <div><p className={styles.answerEyebrow}>今日の潮を一言で</p><h2 id="answer-title">旅行中に知りたいことを、数字のまま終わらせない。</h2><p>{summary}</p></div>
          <div className={styles.answerFact}><span>基準地点</span><strong>{dataset.station.locationJa}</strong><small>緯度 {dataset.station.latitude.toFixed(4)} / 経度 {dataset.station.longitude.toFixed(4)}</small></div>
        </section>

        <section id="month-table" className={styles.section} aria-labelledby="month-title">
          <details className={styles.monthDetails}>
            <summary><span><CalendarIcon/>2026年の月間潮見表を開く</span><small>日付検索では1年分を確認できます</small></summary>
            <div className={styles.monthTableWrap}>
              <table className={styles.monthTable}>
                <caption>{selectedDate.slice(0, 7).replace("-", "年")}月の満潮・干潮</caption>
                <thead><tr><th>日付</th><th>満潮</th><th>干潮</th><th>日の出</th><th>日の入り</th></tr></thead>
                <tbody>
                  {dataset.days.filter((item) => item.date.startsWith(selectedDate.slice(0, 7))).map((item) => {
                    const itemSun = calculateSunTimes(item.date, dataset.station.latitude, dataset.station.longitude);
                    return <tr key={item.date}><td><Link href={`/amami-tide?date=${item.date}`}>{item.date.slice(5).replace("-", "/")}</Link></td><td>{item.highTides.map((event) => `${event.time} ${event.heightCm}cm`).join(" / ") || "–"}</td><td>{item.lowTides.map((event) => `${event.time} ${event.heightCm}cm`).join(" / ") || "–"}</td><td>{itemSun.sunrise}</td><td>{itemSun.sunset}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section className={`${styles.section} ${styles.sourceCard}`} aria-labelledby="source-title">
          <div><h2 id="source-title">このページのデータについて</h2><p>{dataset.source.attribution}</p><p>天気予報：気象庁の府県天気予報（奄美地方を含む鹿児島県予報データ）を1時間キャッシュして表示。</p><p>日の出・日の入り：地点座標と日付から算出した参考値。月齢は簡易計算による概算です。</p></div>
          <div className={styles.sourceMeta}><span>潮位データ取得日</span><strong>{dataset.source.retrievedAt.slice(0, 10)}</strong><a href={dataset.source.pageUrl} target="_blank" rel="noreferrer">気象庁の元データを確認</a></div>
          <p className={styles.safetyNote}>このページは旅行計画の参考情報です。遊泳、航行、釣り、ツアー催行などの安全判断には使用せず、気象庁・海上保安庁・現地事業者の最新情報を確認してください。</p>
        </section>
      </div>

      <nav className={styles.bottomNav} aria-label="奄美の潮と空 メニュー">
        <Link href="/amami-tide" aria-current="page"><HomeIcon/><span>ホーム</span></Link>
        <a href="#date-search"><WaveMark/><span>今日の潮</span></a>
        <a href="#month-table"><CalendarIcon/><span>カレンダー</span></a>
        <a href="#activities-title"><LocationIcon/><span>島時間</span></a>
      </nav>
    </main>
  );
}

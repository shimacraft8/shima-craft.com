import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import tideDataJson from "@/data/generated/amami-o9-2026.json";
import type { TideDataset } from "@/app/lib/amami-tide/types";
import { calculateSunTimes } from "@/app/lib/amami-tide/astronomy";
import styles from "../../amami-tide.module.css";

const dataset = tideDataJson as TideDataset;

export function generateStaticParams() {
  return Array.from({ length: 12 }, (_, index) => ({ month: String(index + 1).padStart(2, "0") }));
}

export function generateMetadata({ params }: { params: { month: string } }): Metadata {
  const month = Number(params.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) return {};
  return {
    title: `奄美大島の潮見表 2026年${month}月｜満潮・干潮・日の出一覧`,
    description: `2026年${month}月の奄美大島・名瀬小湊基準の満潮・干潮、潮位、日の出・日の入りを日別に確認できます。`,
    alternates: { canonical: `https://shima-craft.com/amami-tide/2026/${params.month}` },
  };
}

export default function MonthlyTidePage({ params }: { params: { month: string } }) {
  const month = Number(params.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) notFound();
  const key = `2026-${params.month}`;
  const days = dataset.days.filter((day) => day.date.startsWith(key));
  if (days.length === 0) notFound();

  return <main className={styles.archivePage}>
    <div className={styles.archiveShell}>
      <div className={styles.archiveNav}><Link href="/amami-tide">← 今日の潮</Link><Link href="/amami-tide/2026">2026年一覧</Link></div>
      <p className={styles.archiveEyebrow}>MONTHLY TIDE TABLE</p>
      <h1>2026年{month}月の潮見表</h1>
      <p className={styles.archiveLead}>奄美市・名瀬小湊基準。日付を押すと、潮位グラフと観光の参考時間を確認できます。</p>
      <div className={styles.archiveTableWrap}><table className={styles.archiveTable}>
        <thead><tr><th>日付</th><th>満潮</th><th>干潮</th><th>日の出</th><th>日の入り</th></tr></thead>
        <tbody>{days.map((day) => {
          const sun = calculateSunTimes(day.date, dataset.station.latitude, dataset.station.longitude);
          return <tr key={day.date}><td><Link href={`/amami-tide?date=${day.date}`}>{day.date.slice(5).replace("-", "/")}</Link></td><td>{day.highTides.map((event) => `${event.time} ${event.heightCm}cm`).join(" / ") || "–"}</td><td>{day.lowTides.map((event) => `${event.time} ${event.heightCm}cm`).join(" / ") || "–"}</td><td>{sun.sunrise}</td><td>{sun.sunset}</td></tr>;
        })}</tbody>
      </table></div>
      <p className={styles.archiveNote}>{dataset.source.attribution}。安全判断には公的機関と現地事業者の最新情報をご確認ください。</p>
    </div>
  </main>;
}

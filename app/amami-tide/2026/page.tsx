import type { Metadata } from "next";
import Link from "next/link";
import tideDataJson from "@/data/generated/amami-o9-2026.json";
import type { TideDataset } from "@/app/lib/amami-tide/types";
import styles from "../amami-tide.module.css";

const dataset = tideDataJson as TideDataset;

export const metadata: Metadata = {
  title: "奄美大島の潮見表 2026年｜月別の満潮・干潮一覧",
  description: "奄美大島・名瀬小湊基準の2026年潮位予測を月別に確認できます。毎時潮位、満潮・干潮、日の出・日の入りを旅行計画に役立つ形で掲載します。",
  alternates: { canonical: "https://shima-craft.com/amami-tide/2026" },
};

export default function AnnualTidePage() {
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const key = `2026-${String(month).padStart(2, "0")}`;
    const days = dataset.days.filter((day) => day.date.startsWith(key));
    const heights = days.flatMap((day) => day.hourly.map((item) => item.heightCm));
    return {
      month,
      days: days.length,
      min: Math.min(...heights),
      max: Math.max(...heights),
    };
  });

  return <main className={styles.archivePage}>
    <div className={styles.archiveShell}>
      <Link href="/amami-tide" className={styles.archiveBack}>← 奄美の潮と空へ</Link>
      <p className={styles.archiveEyebrow}>AMAMI TIDE CALENDAR</p>
      <h1>2026年 奄美大島の潮見表</h1>
      <p className={styles.archiveLead}>気象庁「潮位表 奄美（AMAMI）」をもとに、名瀬小湊基準の潮位予測を月別に整理しています。</p>
      <div className={styles.monthCards}>
        {months.map((item) => <Link key={item.month} href={`/amami-tide/2026/${String(item.month).padStart(2, "0")}`} className={styles.monthCard}>
          <span>2026</span><strong>{item.month}月</strong><small>{item.days}日分</small><p>月内予測 {item.min}〜{item.max}cm</p>
        </Link>)}
      </div>
      <p className={styles.archiveNote}>{dataset.source.attribution}。潮位は天文潮位の予測値で、実測値とは異なります。</p>
    </div>
  </main>;
}

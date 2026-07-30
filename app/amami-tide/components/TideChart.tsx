import type { TideDay } from "@/app/lib/amami-tide/types";
import { minutesFromTime } from "@/app/lib/amami-tide/tide";
import styles from "../amami-tide.module.css";

const WIDTH = 720;
const HEIGHT = 286;
const PAD_X = 42;
const PAD_TOP = 34;
const PAD_BOTTOM = 54;

function xForHour(hour: number): number {
  return PAD_X + (hour / 23) * (WIDTH - PAD_X * 2);
}

function buildPoints(day: TideDay): Array<{ x: number; y: number; height: number }> {
  const values = day.hourly.map((item) => item.heightCm);
  const min = Math.min(...values) - 15;
  const max = Math.max(...values) + 15;
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  return day.hourly.map((item) => ({
    x: xForHour(item.hour),
    y: PAD_TOP + ((max - item.heightCm) / Math.max(1, max - min)) * chartHeight,
    height: item.heightCm,
  }));
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function TideChart({
  day,
  sunrise,
  sunset,
  currentMinute,
}: {
  day: TideDay;
  sunrise: string;
  sunset: string;
  currentMinute: number | null;
}) {
  const points = buildPoints(day);
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? WIDTH - PAD_X} ${HEIGHT - PAD_BOTTOM} L ${points[0]?.x ?? PAD_X} ${HEIGHT - PAD_BOTTOM} Z`;
  const values = points.map((point) => point.height);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const currentX = currentMinute === null
    ? null
    : PAD_X + (currentMinute / 1439) * (WIDTH - PAD_X * 2);

  return (
    <div className={styles.chartWrap} aria-label="24時間の潮位予測グラフ">
      <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="tide-chart-title tide-chart-desc">
        <title id="tide-chart-title">24時間の潮位予測</title>
        <desc id="tide-chart-desc">0時から23時までの毎時潮位と満潮、干潮、日の出、日の入りを示します。</desc>
        <defs>
          <linearGradient id="tide-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#48b8c7" stopOpacity=".36" />
            <stop offset="100%" stopColor="#48b8c7" stopOpacity=".03" />
          </linearGradient>
          <filter id="tide-glow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0d8ea0" floodOpacity=".18" />
          </filter>
        </defs>
        {[0, 1, 2, 3].map((index) => {
          const y = PAD_TOP + (index / 3) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
          const label = Math.round(max - (index / 3) * (max - min));
          return (
            <g key={index}>
              <line x1={PAD_X} x2={WIDTH - PAD_X} y1={y} y2={y} className={styles.chartGrid} />
              <text x={8} y={y + 4} className={styles.chartAxisLabel}>{label}</text>
            </g>
          );
        })}
        <text x={8} y={18} className={styles.chartUnit}>cm</text>
        <path d={areaPath} fill="url(#tide-area)" />
        <path d={linePath} className={styles.chartLine} filter="url(#tide-glow)" />

        {day.highTides.map((event) => {
          const minute = minutesFromTime(event.time);
          const x = PAD_X + (minute / 1439) * (WIDTH - PAD_X * 2);
          return <g key={`high-${event.time}`}><line x1={x} x2={x} y1={28} y2={HEIGHT - PAD_BOTTOM} className={styles.eventLineHigh}/><circle cx={x} cy={48} r={6} className={styles.eventDotHigh}/><text x={x} y={18} textAnchor="middle" className={styles.eventTextHigh}>満 {event.time}</text></g>;
        })}
        {day.lowTides.map((event) => {
          const minute = minutesFromTime(event.time);
          const x = PAD_X + (minute / 1439) * (WIDTH - PAD_X * 2);
          return <g key={`low-${event.time}`}><line x1={x} x2={x} y1={28} y2={HEIGHT - PAD_BOTTOM} className={styles.eventLineLow}/><text x={x} y={18} textAnchor="middle" className={styles.eventTextLow}>干 {event.time}</text></g>;
        })}
        {[{ label: "日の出", time: sunrise }, { label: "日の入り", time: sunset }].map((event) => {
          const minute = minutesFromTime(event.time);
          const x = PAD_X + (minute / 1439) * (WIDTH - PAD_X * 2);
          return <g key={event.label}><line x1={x} x2={x} y1={28} y2={HEIGHT - PAD_BOTTOM} className={styles.sunLine}/><text x={x} y={HEIGHT - 17} textAnchor="middle" className={styles.sunText}>{event.label} {event.time}</text></g>;
        })}
        {currentX !== null ? <g><line x1={currentX} x2={currentX} y1={26} y2={HEIGHT - PAD_BOTTOM} className={styles.currentLine}/><circle cx={currentX} cy={HEIGHT - PAD_BOTTOM} r={5} className={styles.currentDot}/><text x={currentX} y={HEIGHT - 5} textAnchor="middle" className={styles.currentText}>現在</text></g> : null}
        {[0, 6, 12, 18, 23].map((hour) => <text key={hour} x={xForHour(hour)} y={HEIGHT - 34} textAnchor="middle" className={styles.chartHour}>{hour}時</text>)}
      </svg>
    </div>
  );
}

"use client";

import { useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  width: number;
  height: number;
};

/**
 * Before/After比較スライダー。
 * ネイティブの range input をそのまま比較の操作ハンドルとして使うことで、
 * マウス・タッチ・キーボード操作とfocus-visibleを追加実装なしで満たす。
 */
export function BeforeAfterSlider({ beforeSrc, afterSrc, width, height }: Props) {
  const [position, setPosition] = useState(50);

  return (
    <div
      className="colorize-compare"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterSrc} alt="AIでカラー化した後の写真" className="colorize-compare-img" />
      <div
        className="colorize-compare-before-wrap"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeSrc} alt="カラー化前の白黒写真" className="colorize-compare-img" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="colorize-compare-range"
        aria-label="スライダーを動かして、カラー化前と後の写真を比較する"
      />
    </div>
  );
}

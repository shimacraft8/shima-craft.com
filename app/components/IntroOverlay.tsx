"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* =========================================================================
 *  オープニング（イントロ）オーバーレイ
 *  流れ: 白背景 → 中央にロゴ(logo.png)を“全体まとめて”フェードイン＋わずかに
 *        スケール(0.96→1) → ごく短く静止 → オーバーレイをフェードアウトして
 *        ヒーローを表示。終了時は必ず最上部へ戻してからスクロールを解放する。
 *
 *  既存ロゴ(PNG)の見た目を崩さないため、1枚画像のまま opacity / transform で
 *  上品に出すだけのシンプルな構成。
 * =========================================================================
 *
 *  ── 表示回数の制御 ──────────────────────────────────────────────
 *  デフォルト（false）: ページを読み込むたびに毎回再生。
 *  セッション中に一度だけ再生したい場合は ONCE_PER_SESSION を true にする。
 *  （同一タブ・同一セッションでは2回目以降スキップ。再訪・別タブでは再生）
 * ------------------------------------------------------------------------ */
const ONCE_PER_SESSION = false;
const SESSION_KEY = "shima-intro-played";

// ease-out（指定の cubic-bezier）
const EASE = [0.22, 1, 0.36, 1] as const;

// タイムライン（秒 / ミリ秒）
const REVEAL = { delay: 0.05, duration: 0.6 }; // ロゴのフェードイン＋スケール
const HOLD_MS = 900; //  ロゴ表示(≒0.65s)後、約0.25s静止してフェード開始
const OUT_DURATION = 0.45; // オーバーレイのフェードアウト
// 総尺 ≒ 0.9s + 0.45s ≒ 1.35s

type Phase = "pending" | "playing" | "done";

export function IntroOverlay() {
  const [phase, setPhase] = useState<Phase>("pending");
  const playedRef = useRef(false);
  // 再生可否は一度だけ判定（StrictModeの二重実行でも sessionStorage を二重書きしない）
  const decisionRef = useRef<boolean | null>(null);

  // 再生可否の判定＋タイムライン開始（クライアントのみ）
  useEffect(() => {
    if (decisionRef.current === null) {
      const prefersReduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      let play = !prefersReduce;
      if (play && ONCE_PER_SESSION) {
        try {
          if (sessionStorage.getItem(SESSION_KEY)) play = false;
          else sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* sessionStorage が使えない場合も再生は継続 */
        }
      }
      decisionRef.current = play;
    }

    if (!decisionRef.current) {
      // reduced-motion / セッション既再生: イントロ省略 → 即・最上部の通常表示
      setPhase("done");
      return;
    }

    // タイマーは毎回張り直す（StrictModeのクリーンアップ後も確実に発火させる）
    playedRef.current = true;
    setPhase("playing");
    const t = window.setTimeout(() => setPhase("done"), HOLD_MS);
    return () => window.clearTimeout(t);
  }, []);

  // フェーズに応じてスクロールロック/解放。
  // 終了時(done)は必ず最上部へ戻してから解放する。
  useEffect(() => {
    if (phase === "playing") {
      document.body.style.overflow = "hidden";
    } else if (phase === "done") {
      window.scrollTo(0, 0);
      document.body.style.overflow = "";
    }
  }, [phase]);

  // アンマウント時の保険：スクロールを必ず元に戻す
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const skip = () => setPhase("done");
  const playing = phase === "playing";

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="intro"
          className="intro"
          aria-hidden="true"
          onClick={skip}
          initial={false}
          exit={{
            opacity: 0,
            // 再生した場合のみフェード。省略時（reduced-motion等）は即時に消す
            transition: { duration: playedRef.current ? OUT_DURATION : 0, ease: EASE },
          }}
        >
          {/* 既存ロゴ(PNG・カラー版)を全体まとめて表示（opacity / transform のみ） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            className="intro-logo"
            src="/logo.png"
            alt=""
            width={480}
            height={206}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={playing ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={{ delay: REVEAL.delay, duration: REVEAL.duration, ease: EASE }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

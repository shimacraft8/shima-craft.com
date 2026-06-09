"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "left" | "right";

type RevealProps = {
  children: ReactNode;
  /** 登場方向。セクションごとに左右交互で使う想定。 */
  dir?: Direction;
  delay?: number;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "ref" | "children">;

const offsetFor = (dir: Direction) => {
  switch (dir) {
    case "left":
      return { x: -60, y: 0 };
    case "right":
      return { x: 60, y: 0 };
    default:
      return { x: 0, y: 36 };
  }
};

/**
 * スクロールで一度だけ fadeIn しながらスライドインする汎用ラッパー。
 * shima-craft-v2.html の `.reveal`（from-left / from-right / from-up）を
 * Framer Motion に置き換えたもの。`prefers-reduced-motion` 時はフェードのみ。
 */
export function Reveal({
  children,
  dir = "up",
  delay = 0,
  className,
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();
  const offset = offsetFor(dir);

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, ease: "easeOut", delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

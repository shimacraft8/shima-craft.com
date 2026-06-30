"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/app/lib/site";

/**
 * フッターの「プライバシーポリシー」リンク＋モーダル本体。
 * ×ボタン / Escキー / 背景クリックで閉じる。開いている間は背景スクロールを固定。
 * 文面は shima-craft-v2.html のものをそのまま掲載。
 */
export function PrivacyPolicy() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="pp-link"
        onClick={() => setOpen(true)}
      >
        プライバシーポリシー
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="プライバシーポリシー"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <button
                type="button"
                className="modal-close"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
              >
                &times;
              </button>
              <h3>プライバシーポリシー</h3>
              <p>
                SHIMA CRAFT（以下「当方」）は、お客様の個人情報を以下の方針に基づき適切に取り扱います。
              </p>

              <h4>1. 取得する情報</h4>
              <p>
                当方は、お問い合わせやご依頼の際に、お名前・メールアドレス・事業者情報・URLなど、業務上必要な範囲の情報を取得します。また、「Web導線かんたんチェック」からのご相談フォームにおいては、上記に加えて診断回答内容を取得します。
              </p>

              <h4>2. 利用目的</h4>
              <p>
                取得した情報は、ご相談への回答、お見積もり・制作・撮影・納品・保守運用などのサービス提供、および必要なご連絡のためにのみ利用します。診断回答内容は、ご相談内容の把握と適切な提案のために利用します。
              </p>

              <h4>3. 第三者提供</h4>
              <p>
                法令に基づく場合を除き、ご本人の同意なく第三者に個人情報を提供することはありません。
              </p>

              <h4>4. 撮影・空撮データの取り扱い</h4>
              <p>
                撮影・空撮で取得した写真・映像は、ご依頼の納品物としてのみ利用し、ご本人の許可なく実績掲載や第三者提供を行うことはありません。
              </p>

              <h4>5. 外部サービスの利用</h4>
              <p>
                サイトの運用・分析のため、サーバー・解析ツール等の外部サービスを利用する場合があります。これらの取得情報は各サービスのポリシーに従って管理されます。
              </p>

              <h4>6. 情報の管理</h4>
              <p>
                取得した個人情報は、漏えい・滅失・毀損の防止に努め、適切に管理します。業務上不要となった情報は速やかに削除します。
              </p>

              <h4>7. 開示・訂正・削除</h4>
              <p>
                ご本人からの個人情報の開示・訂正・削除のご請求には、ご本人確認のうえ、合理的な範囲で速やかに対応します。
              </p>

              <h4>8. お問い合わせ</h4>
              <p>
                本ポリシーに関するお問い合わせは、{site.email} までご連絡ください。
              </p>

              <h4>9. 改定</h4>
              <p>
                本ポリシーは、必要に応じて予告なく改定する場合があります。最新の内容は本ページに掲載します。
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { mailtoHref } from "@/app/lib/site";

/**
 * スマホ専用の固定CTA（画面下に常時表示）。表示制御は CSS のメディアクエリで行う。
 */
export function StickyContact() {
  return (
    <div className="sticky-cta">
      <a href={mailtoHref}>お問い合わせ</a>
    </div>
  );
}

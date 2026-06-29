import { mailtoHref } from "@/app/lib/site";
import { TrackedLink } from "@/app/components/TrackedLink";

/**
 * スマホ専用の固定CTA（画面下に常時表示）。表示制御は CSS のメディアクエリで行う。
 */
export function StickyContact() {
  return (
    <div className="sticky-cta">
      <TrackedLink
        href={mailtoHref}
        eventName="contact_click"
        eventParams={{ location: "sticky", method: "email" }}
      >
        相談する
      </TrackedLink>
    </div>
  );
}

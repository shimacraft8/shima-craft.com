import { Reveal } from "@/app/components/Reveal";
import { mailtoHref, site } from "@/app/lib/site";
import { TrackedLink } from "@/app/components/TrackedLink";

export function Contact() {
  return (
    <section id="contact">
      <Reveal dir="right" className="contact">
        <div className="section-label">Contact</div>
        <h2 className="section-title" style={{ marginBottom: 28 }}>
          まずは現在の状況をお聞かせください
        </h2>
        <p className="lead">
          依頼内容が整理できていなくても大丈夫です。ホームページ、問い合わせまでの流れ、予約・顧客管理など、気になっていることをご相談ください。
        </p>
        <TrackedLink
          href="/web-check"
          className="btn-contact"
          eventName="web_check_contact_cta_click"
        >
          1分でWeb導線をチェックする
        </TrackedLink>
        <p className="contact-sub">
          8つの質問で、優先して見直したい項目が分かります
        </p>
        <div className="contact-direct-wrap">
          <p className="contact-direct-label">
            診断を使わず、直接相談したい方はこちら
          </p>
          <TrackedLink
            href={mailtoHref}
            className="contact-email-link"
            eventName="contact_click"
            eventParams={{ location: "contact", method: "email" }}
          >
            {site.email}
          </TrackedLink>
        </div>
        <p className="reply">48時間以内にご返信します</p>
      </Reveal>
    </section>
  );
}

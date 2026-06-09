import { Reveal } from "@/app/components/Reveal";
import { mailtoHref, site } from "@/app/lib/site";

export function Contact() {
  return (
    <section id="contact">
      <Reveal dir="right" className="contact">
        <div className="section-label">Contact</div>
        <h2 className="section-title" style={{ marginBottom: 28 }}>
          CONTACT
        </h2>
        <p className="lead">
          まずは気軽にメールでご連絡ください。離島・地方の事業者さん大歓迎です。
        </p>
        <a href={mailtoHref} className="btn-contact">
          {site.email}
        </a>
        <p className="reply">48時間以内にご返信します</p>
      </Reveal>
    </section>
  );
}

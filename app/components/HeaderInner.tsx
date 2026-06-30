import Image from "next/image";
import Link from "next/link";

const NAV = [
  { href: "/#service", label: "SERVICE" },
  { href: "/#works", label: "WORKS" },
  { href: "/#price", label: "PRICE" },
  { href: "/#contact", label: "CONTACT" },
] as const;

export function HeaderInner() {
  return (
    <header className="site-header scrolled">
      <Link className="logo" href="/" aria-label="SHIMA CRAFT トップへ">
        <Image
          src="/logo.png"
          alt="SHIMA CRAFT"
          width={170}
          height={38}
          className="logo-img"
          style={{ position: "static", opacity: 1 }}
          priority
        />
      </Link>
      <nav className="site-nav" aria-label="グローバルナビゲーション">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

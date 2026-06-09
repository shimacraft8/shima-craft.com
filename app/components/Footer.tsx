import Image from "next/image";
import { PrivacyPolicy } from "@/app/components/PrivacyPolicy";

export function Footer() {
  return (
    <footer className="site-footer">
      <Image
        className="footer-logo"
        src="/logo.png"
        alt="SHIMA CRAFT"
        width={189}
        height={42}
      />
      © 2026 SHIMA CRAFT All Rights Reserved.
      <PrivacyPolicy />
    </footer>
  );
}

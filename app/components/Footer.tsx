import Image from "next/image";
import Link from "next/link";

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
      <nav className="footer-nav" aria-label="フッターナビゲーション">
        <Link href="/amami-dialect" className="footer-nav-link">
          奄美方言辞書
        </Link>
        <Link href="/amami-tide" className="footer-nav-link">
          奄美の潮と空
        </Link>
        <Link href="/amami-road-quest" className="footer-nav-link">
          奄美ロードクエスト
        </Link>
        <Link href="/web-check" className="footer-nav-link">
          Web導線チェック
        </Link>
        <Link href="/services" className="footer-nav-link">
          サービス一覧
        </Link>
      </nav>
      © 2026 SHIMA CRAFT All Rights Reserved.
      <Link href="/privacy" className="pp-link">
        プライバシーポリシー
      </Link>
    </footer>
  );
}

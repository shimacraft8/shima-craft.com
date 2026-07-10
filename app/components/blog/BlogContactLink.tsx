"use client";

import Link from "next/link";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type BlogContactLinkProps = {
  articleSlug: string;
  className?: string;
  children: React.ReactNode;
};

export function BlogContactLink({
  articleSlug,
  className,
  children,
}: BlogContactLinkProps) {
  return (
    <Link
      href="/#contact"
      className={className}
      onClick={() => {
        window.gtag?.("event", "blog_contact_click", {
          article_slug: articleSlug,
          link_location: "article_cta",
        });
      }}
    >
      {children}
    </Link>
  );
}

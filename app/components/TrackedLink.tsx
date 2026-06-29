"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

type EventParams = Record<string, string | number | boolean | undefined>;

type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, params?: EventParams) => void;
};

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  eventName?: string;
  eventParams?: EventParams;
};

export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window === "undefined") return;
  const gtag = (window as GtagWindow).gtag;
  if (!gtag) return;
  gtag("event", eventName, params);
}

export function TrackedLink({
  children,
  eventName,
  eventParams,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        if (eventName) trackEvent(eventName, eventParams);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

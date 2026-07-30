import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function BaseIcon({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} {...props}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function WaveMark(props: IconProps) {
  return <BaseIcon {...props}><path d="M5 20c6 0 6-7 12-7s6 7 12 7 6-7 14-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M5 29c6 0 6-5 12-5s6 5 12 5 6-5 14-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M19 8l4-4 4 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></BaseIcon>;
}

export function CalendarIcon(props: IconProps) {
  return <BaseIcon {...props}><rect x="7" y="10" width="34" height="31" rx="8" stroke="currentColor" strokeWidth="3"/><path d="M7 19h34M16 6v9M32 6v9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><circle cx="17" cy="27" r="2" fill="currentColor"/><circle cx="25" cy="27" r="2" fill="currentColor"/><circle cx="33" cy="27" r="2" fill="currentColor"/><circle cx="17" cy="35" r="2" fill="currentColor"/><circle cx="25" cy="35" r="2" fill="currentColor"/></BaseIcon>;
}

export function LocationIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M24 43s14-13.1 14-25A14 14 0 1 0 10 18c0 11.9 14 25 14 25Z" stroke="currentColor" strokeWidth="3"/><circle cx="24" cy="18" r="5" stroke="currentColor" strokeWidth="3"/></BaseIcon>;
}

export function SunIcon(props: IconProps) {
  return <BaseIcon {...props}><circle cx="24" cy="24" r="9" fill="currentColor" opacity=".22"/><circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="3"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M38.1 9.9l-4.2 4.2M14.1 33.9l-4.2 4.2" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></BaseIcon>;
}

export function SunriseIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M7 37h34M11 42h26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M15 32a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="3"/><path d="M24 6v8M8 22h6M34 22h6M12.7 10.7l5.1 5.1M35.3 10.7l-5.1 5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></BaseIcon>;
}

export function SunsetIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M7 37h34M11 42h26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M15 32a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="3"/><path d="M24 14V6m0 0-4 4m4-4 4 4M8 22h6M34 22h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></BaseIcon>;
}

export function MoonIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M35.5 34.5A16 16 0 0 1 16 9.2 17 17 0 1 0 35.5 34.5Z" fill="currentColor" opacity=".2"/><path d="M35.5 34.5A16 16 0 0 1 16 9.2 17 17 0 1 0 35.5 34.5Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><path d="M34 9l1.2 3.2L38.5 13l-3.3 1-1.2 3-1.1-3-3.4-1 3.4-.8L34 9Z" fill="currentColor"/></BaseIcon>;
}

export function HighTideIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M6 31c6 0 6-6 12-6s6 6 12 6 6-6 12-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M6 39c6 0 6-4 12-4s6 4 12 4 6-4 12-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M24 21V6m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></BaseIcon>;
}

export function LowTideIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M6 31c6 0 6-6 12-6s6 6 12 6 6-6 12-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M6 39c6 0 6-4 12-4s6 4 12 4 6-4 12-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M24 5v15m0 0-6-6m6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></BaseIcon>;
}

export function MangroveIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M24 42V22" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M24 24c-7-1-12-6-12-13 7 0 12 4 12 13ZM24 24c7-1 12-6 12-13-7 0-12 4-12 13Z" fill="currentColor" opacity=".22"/><path d="M24 24c-7-1-12-6-12-13 7 0 12 4 12 13ZM24 24c7-1 12-6 12-13-7 0-12 4-12 13Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round"/><path d="M24 34l-8 8M24 34l8 8M24 30l-13 12M24 30l13 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></BaseIcon>;
}

export function ShoreIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M7 36c7-1 10-8 16-10 7-3 10 4 18 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M6 42c8 0 8-4 16-4s8 4 20 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M31 8v11M26 13.5h10M27.5 10l7 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><circle cx="31" cy="13.5" r="7.5" stroke="currentColor" strokeWidth="2.6"/></BaseIcon>;
}

export function StarsIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M24 5l3.3 9.7L38 18l-10.7 3.3L24 32l-3.3-10.7L10 18l10.7-3.3L24 5Z" fill="currentColor" opacity=".22"/><path d="M24 5l3.3 9.7L38 18l-10.7 3.3L24 32l-3.3-10.7L10 18l10.7-3.3L24 5Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round"/><path d="M38 30l1.7 5.3L45 37l-5.3 1.7L38 44l-1.7-5.3L31 37l5.3-1.7L38 30ZM10 29l1.2 3.8L15 34l-3.8 1.2L10 39l-1.2-3.8L5 34l3.8-1.2L10 29Z" fill="currentColor"/></BaseIcon>;
}

export function CloudRainIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M13 31h23a8 8 0 0 0 0-16 12 12 0 0 0-22-3 9.5 9.5 0 0 0-1 19Z" fill="currentColor" opacity=".18"/><path d="M13 31h23a8 8 0 0 0 0-16 12 12 0 0 0-22-3 9.5 9.5 0 0 0-1 19Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M16 36l-2 5M25 36l-2 5M34 36l-2 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></BaseIcon>;
}

export function HomeIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M6 23 24 7l18 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 20v21h10V29h6v12h10V20" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></BaseIcon>;
}

export function MenuIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M9 14h30M9 24h30M9 34h30" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></BaseIcon>;
}

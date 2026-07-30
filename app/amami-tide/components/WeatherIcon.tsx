import { CloudRainIcon, SunIcon } from "./icons";

export function WeatherIcon({ kind, className }: { kind: "sun" | "cloud" | "rain" | "mixed"; className?: string }) {
  if (kind === "sun") return <SunIcon className={className} />;
  if (kind === "rain") return <CloudRainIcon className={className} />;
  if (kind === "cloud") return <CloudRainIcon className={className} />;
  return <div className={className} aria-hidden="true" style={{ position: "relative" }}><SunIcon style={{ position: "absolute", inset: "0 auto auto 0", width: "72%", height: "72%" }}/><CloudRainIcon style={{ position: "absolute", inset: "26% 0 0 22%", width: "78%", height: "78%" }}/></div>;
}

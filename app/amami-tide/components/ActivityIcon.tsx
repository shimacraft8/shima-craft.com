import type { ActivityWindow } from "@/app/lib/amami-tide/types";
import { MangroveIcon, ShoreIcon, StarsIcon, SunsetIcon } from "./icons";

export function ActivityIcon({ id, className }: { id: ActivityWindow["id"]; className?: string }) {
  if (id === "mangrove") return <MangroveIcon className={className} />;
  if (id === "shore") return <ShoreIcon className={className} />;
  if (id === "sunset") return <SunsetIcon className={className} />;
  return <StarsIcon className={className} />;
}

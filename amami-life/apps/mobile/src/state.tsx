import tokens from "../../../design-system/tokens.json";
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  AREAS,
  LINKS,
  solarForDate,
  todayJST,
  addDays,
  type AreaId,
  type LoadState,
} from "../../../packages/core/src";
import { createOrderedWriter } from "../../../packages/core/src/usage";
import { storage } from "./storage";
import tideDays from "./tides.json";
export {
  AREAS,
  LINKS,
  safetyLinks,
  STATE_COPY,
  addDays,
  phoneUri,
  type LoadState,
} from "../../../packages/core/src";
type Theme = "paper" | "ink";
type Prefs = { areaId: AreaId; theme: Theme; saved: string[]; note: string };
const defaults: Prefs = { areaId: "naze", theme: "paper", saved: [], note: "" };
const light = tokens.themes.paper;
const dark = tokens.themes.ink;
function useModel() {
  const write = useRef(createOrderedWriter((key, value) => storage.setItem(key, value)));
  const revision = useRef(0);
  const [prefs, setPrefs] = useState(defaults),
    [hydrated, setHydrated] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [date, setDate] = useState(todayJST()),
    [state, setState] = useState<LoadState>("ready");
  useEffect(() => {
    let active = true;
    storage
      .getItem("amami-prefs")
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const p = JSON.parse(raw) as Partial<Prefs>;
            setPrefs({
              areaId: AREAS.some((a) => a.id === p.areaId) ? p.areaId! : "naze",
              theme: p.theme === "ink" ? "ink" : "paper",
              saved: Array.isArray(p.saved)
                ? p.saved.filter((id) => LINKS.some((l) => l.id === id))
                : [],
              note: typeof p.note === "string" ? p.note.slice(0, 2000) : "",
            });
          } catch {
            setStorageError(true);
          }
        }
        setHydrated(true);
      })
      .catch(() => {
        if (active) {
          setStorageError(true);
          setHydrated(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (hydrated) {
      const current = ++revision.current;
      setSaveStatus("saving");
      write.current("amami-prefs", JSON.stringify(prefs))
        .then(() => {
          if (current === revision.current) {
            setSaveStatus("saved");
            setStorageError(false);
          }
        })
        .catch(() => { if (current === revision.current) setStorageError(true); });
    }
  }, [prefs, hydrated]);
  const area = AREAS.find((a) => a.id === prefs.areaId)!;
  const sun = solarForDate(date, area.lat, area.lon);
  const tide =
    area.station === "O9"
      ? (tideDays.find((d) => d.date === date) ?? null)
      : null;
  const tomorrowTide = area.station === "O9" ? tideDays.find(d => d.date === addDays(date, 1)) ?? null : null;
  const goToday = () => setDate(todayJST());
  const update = (change: Partial<Prefs>) => {
    setSaveStatus("saving");
    setPrefs((p) => ({ ...p, ...change }));
  };
  const toggleSave = (id: string) =>
    setPrefs((p) => ({
      ...p,
      saved: p.saved.includes(id)
        ? p.saved.filter((s) => s !== id)
        : [...p.saved, id],
    }));
  return {
    prefs,
    update,
    date,
    setDate,
    goToday,
    tomorrowTide,
    state,
    setState,
    area,
    sun,
    tide,
    colors: prefs.theme === "paper" ? light : dark,
    toggleSave,
    storageError,
    hydrated,
    saveStatus,
  };
}
const Context = createContext<ReturnType<typeof useModel> | null>(null);
export function ModelProvider({ children }: { children: React.ReactNode }) {
  const value = useModel();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("missing-provider");
  return value;
}

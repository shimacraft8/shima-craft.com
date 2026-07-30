"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackEvent } from "@/app/components/TrackedLink";
import { CalendarIcon } from "./icons";
import styles from "../amami-tide.module.css";

export function DateNavigator({ selectedDate, today }: { selectedDate: string; today: string }) {
  const router = useRouter();
  const [value, setValue] = useState(selectedDate);

  function move(date: string) {
    trackEvent("amami_tide_date_search", { selected_date: date });
    setValue(date);
    router.push(`/amami-tide?date=${date}`, { scroll: false });
  }

  return (
    <div className={styles.dateNavigator}>
      <label className={styles.dateInputLabel}>
        <CalendarIcon className={styles.dateInputIcon} />
        <span>日付を選ぶ</span>
        <input
          aria-label="潮見表の日付"
          type="date"
          min="2026-01-01"
          max="2026-12-31"
          value={value}
          onChange={(event: { target: { value: string } }) => move(event.target.value)}
          className={styles.dateInput}
        />
      </label>
      <button type="button" className={styles.todayButton} onClick={() => move(today)}>今日へ</button>
    </div>
  );
}

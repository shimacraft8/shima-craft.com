"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  basePath: string;
  q: string;
  type: string;
  datasetLabels: string[];
};

export function SearchFilterForm({ basePath, q, type, datasetLabels }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, rawValue] of Array.from(data.entries())) {
      const value = String(rawValue).trim();
      if (!value || value === "all") continue;
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function submitNow() {
    if (formRef.current) navigate(formRef.current);
  }

  function submitDebounced() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(submitNow, 350);
  }

  return (
    <form
      ref={formRef}
      className="dialect-search-box"
      role="search"
      aria-label="ことわざ・あいさつ・語彙をまとめて検索"
      action={basePath}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
    >
      <label htmlFor="dialect-cross-search-input" className="dialect-search-box-label">
        ことわざ・あいさつ・語彙をまとめて検索
      </label>
      <div className="dialect-search-box-row">
        <input
          id="dialect-cross-search-input"
          type="search"
          name="q"
          defaultValue={q}
          onChange={submitDebounced}
          placeholder="例：喜界島 おはよう／標準語／方言表記／読み"
          autoComplete="off"
        />
        <button type="submit" className="btn">
          検索
        </button>
      </div>

      <div
        className="dialect-controls"
        role="search"
        aria-label="種類の絞り込み"
        style={{ marginTop: 16 }}
      >
        <label className="dialect-field dialect-field-select">
          <span>種類</span>
          <select name="type" defaultValue={type} onChange={submitNow}>
            <option value="all">すべて</option>
            {datasetLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <noscript>
          <button type="submit" className="btn">
            絞り込む
          </button>
        </noscript>
      </div>
    </form>
  );
}

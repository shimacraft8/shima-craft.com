"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { WORD_REGION_SLUGS, WORD_SORT_OPTIONS } from "@/app/lib/amamiDialect";

type CategoryOption = {
  label: string;
  slug: string;
  count: number;
};

type Props = {
  basePath: string;
  q: string;
  categorySlug: string;
  regionSlug: string;
  sort: string;
  categories: CategoryOption[];
  regions: string[];
};

export function WordFilterForm({
  basePath,
  q,
  categorySlug,
  regionSlug,
  sort,
  categories,
  regions,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, rawValue] of Array.from(data.entries())) {
      const value = String(rawValue).trim();
      if (!value) continue;
      if (value === "all") continue;
      if (key === "sort" && value === "id") continue;
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
      className="dialect-controls"
      role="search"
      aria-label="語彙の検索・絞り込み"
      action={basePath}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
    >
      <label className="dialect-field">
        <span>語彙検索</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          onChange={submitDebounced}
          placeholder="標準語・方言表記・読み・地域名（例：喜界島 祖父）"
        />
      </label>
      <label className="dialect-field dialect-field-select">
        <span>カテゴリ</span>
        <select name="category" defaultValue={categorySlug} onChange={submitNow}>
          <option value="all">すべて</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.label}（{category.count}）
            </option>
          ))}
        </select>
      </label>
      <label className="dialect-field dialect-field-select">
        <span>地域</span>
        <select name="region" defaultValue={regionSlug} onChange={submitNow}>
          <option value="all">すべて</option>
          {regions.map((label) => (
            <option key={label} value={WORD_REGION_SLUGS[label] ?? label}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="dialect-field dialect-field-select">
        <span>並び順</span>
        <select name="sort" defaultValue={sort} onChange={submitNow}>
          {WORD_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="btn">
          絞り込む
        </button>
      </noscript>
    </form>
  );
}

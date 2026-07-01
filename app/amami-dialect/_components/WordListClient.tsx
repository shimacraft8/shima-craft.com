"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WordRecord } from "@/app/lib/amamiDialect";
import { AMAMI_DIALECT_PATH, normalizeDialectSearch } from "@/app/lib/amamiDialect";

type CategoryOption = {
  label: string;
  slug: string;
  count: number;
};

type Props = {
  items: WordRecord[];
  categories: CategoryOption[];
  regions: string[];
  initialCategorySlug?: string;
};

export function WordListClient({
  items,
  categories,
  regions,
  initialCategorySlug = "all",
}: Props) {
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [region, setRegion] = useState("all");

  const categoryLabelBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.label])),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeDialectSearch(query.trim());
    const targetCategory = categoryLabelBySlug.get(categorySlug);

    return items.filter((item) => {
      const matchesCategory =
        categorySlug === "all" || item.category === targetCategory;
      const matchesRegion =
        region === "all" || item.regions.some((entry) => entry.region === region);

      if (!matchesCategory || !matchesRegion) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = normalizeDialectSearch(
        [
          item.id,
          item.standardWord,
          item.category,
          ...item.regions.flatMap((entry) => [entry.region, ...entry.forms]),
        ].join(" "),
      );

      return haystack.includes(normalizedQuery);
    });
  }, [categoryLabelBySlug, categorySlug, items, query, region]);

  return (
    <div className="dialect-list-wrap">
      <div className="dialect-controls" role="search">
        <label className="dialect-field">
          <span>語彙検索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="標準語・方言表記・読み"
          />
        </label>
        <label className="dialect-field dialect-field-select">
          <span>カテゴリ</span>
          <select
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
          >
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
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="all">すべて</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="dialect-count">{filteredItems.length}件</p>

      {filteredItems.length > 0 ? (
        <div className="dialect-card-grid">
          {filteredItems.map((item) => (
            <article className="dialect-card" key={item.id}>
              <p className="dialect-card-id">{item.id}</p>
              <h2>
                <Link href={`${AMAMI_DIALECT_PATH}/words/${item.id}`}>
                  {item.standardWord}
                </Link>
              </h2>
              <p className="dialect-meaning">{item.category}</p>
              <ul className="dialect-word-regions">
                {item.regions.map((entry) => (
                  <li key={entry.region}>
                    <span className="dialect-word-region-name">{entry.region}</span>
                    <span>{entry.forms.slice(0, 3).join("・")}</span>
                  </li>
                ))}
              </ul>
              <Link
                className="text-link"
                href={`${AMAMI_DIALECT_PATH}/words/${item.id}`}
              >
                詳細を見る
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="dialect-empty">
          <p>該当する項目はありません。</p>
        </div>
      )}
    </div>
  );
}

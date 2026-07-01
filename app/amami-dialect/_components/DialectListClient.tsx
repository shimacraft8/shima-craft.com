"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DialectListItem } from "@/app/lib/amamiDialect";
import { normalizeDialectSearch } from "@/app/lib/amamiDialect";

type FilterOption = {
  label: string;
  value: string;
};

type Props = {
  items: DialectListItem[];
  filterOptions: FilterOption[];
  filterLabel: string;
  searchLabel: string;
};

export function DialectListClient({
  items,
  filterOptions,
  filterLabel,
  searchLabel,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeDialectSearch(query.trim());

    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.filterValue === filter;
      if (!normalizedQuery) {
        return matchesFilter;
      }

      const haystack = normalizeDialectSearch(
        [
          item.id,
          item.title,
          item.reading,
          item.meaning,
          item.description,
          ...item.meta,
        ].join(" "),
      );

      return matchesFilter && haystack.includes(normalizedQuery);
    });
  }, [filter, items, query]);

  return (
    <div className="dialect-list-wrap">
      <div className="dialect-controls" role="search">
        <label className="dialect-field">
          <span>{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="語句・読み・意味"
          />
        </label>
        <label className="dialect-field dialect-field-select">
          <span>{filterLabel}</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">すべて</option>
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
                <Link href={item.href}>{item.title}</Link>
              </h2>
              {item.reading ? (
                <p className="dialect-reading">{item.reading}</p>
              ) : null}
              {item.meaning ? (
                <p className="dialect-meaning">{item.meaning}</p>
              ) : null}
              {item.description ? (
                <p className="dialect-description">{item.description}</p>
              ) : null}
              <div className="dialect-meta">
                {item.meta.map((meta) => (
                  <span key={`${item.id}-${meta}`}>{meta}</span>
                ))}
              </div>
              <Link className="text-link" href={item.href}>
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


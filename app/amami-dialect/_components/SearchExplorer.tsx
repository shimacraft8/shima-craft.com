import Link from "next/link";
import type { SearchDatasetItem } from "@/app/lib/amamiDialect";
import { AMAMI_DIALECT_PATH, matchesQueryTokens } from "@/app/lib/amamiDialect";
import { SearchFilterForm } from "@/app/amami-dialect/_components/SearchFilterForm";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  items: SearchDatasetItem[];
  datasetLabels: string[];
  searchParams: SearchParams;
};

const searchPath = `${AMAMI_DIALECT_PATH}/search`;

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function SearchExplorer({ items, datasetLabels, searchParams }: Props) {
  const q = paramString(searchParams.q);
  const typeRaw = paramString(searchParams.type);
  const type = datasetLabels.includes(typeRaw) ? typeRaw : "all";

  const filteredItems = items.filter((item) => {
    if (type !== "all" && item.dataset !== type) return false;
    if (!q.trim()) return true;

    const haystack = [
      item.id,
      item.title,
      item.reading,
      item.meaning,
      item.description,
      ...item.meta,
    ].join(" ");

    return matchesQueryTokens(haystack, q);
  });

  const groups = datasetLabels
    .map((label) => ({
      label,
      items: filteredItems.filter((item) => item.dataset === label),
    }))
    .filter((group) => group.items.length > 0);

  const hasActiveFilters = Boolean(q.trim()) || type !== "all";

  function buildHref(patch: Record<string, string | null>) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type !== "all") params.set("type", type);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    return `${searchPath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="dialect-list-wrap">
      <SearchFilterForm basePath={searchPath} q={q} type={type} datasetLabels={datasetLabels} />

      {hasActiveFilters ? (
        <div className="dialect-filter-chips" aria-label="選択中の条件">
          {q.trim() ? (
            <Link className="dialect-chip" href={buildHref({ q: null })}>
              検索「{q.trim()}」<span aria-hidden="true">×</span>
            </Link>
          ) : null}
          {type !== "all" ? (
            <Link className="dialect-chip" href={buildHref({ type: null })}>
              種類：{type}
              <span aria-hidden="true">×</span>
            </Link>
          ) : null}
          <Link className="dialect-reset" href={searchPath}>
            条件をリセット
          </Link>
        </div>
      ) : null}

      <p className="dialect-count" aria-live="polite">
        {filteredItems.length}件
      </p>

      {groups.length > 0 ? (
        <div className="dialect-search-groups">
          {groups.map((group) => (
            <div className="dialect-search-group" key={group.label}>
              <h3>
                {group.label}（{group.items.length}件）
              </h3>
              <div className="dialect-card-grid">
                {group.items.map((item) => (
                  <article className="dialect-card" key={item.id}>
                    <p className="dialect-card-id">{item.id}</p>
                    <h2>
                      <Link href={item.href}>{item.title}</Link>
                    </h2>
                    {item.reading ? <p className="dialect-reading">{item.reading}</p> : null}
                    {item.meaning ? <p className="dialect-meaning">{item.meaning}</p> : null}
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
            </div>
          ))}
        </div>
      ) : (
        <div className="dialect-empty">
          <p>
            該当する項目は見つかりませんでした。表記のゆれや、記録の有無をご確認ください。
          </p>
          <Link className="btn btn-soft" href={searchPath}>
            条件をリセット
          </Link>
        </div>
      )}
    </div>
  );
}

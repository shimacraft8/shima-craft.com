import Link from "next/link";
import type { WordRecord } from "@/app/lib/amamiDialect";
import {
  AMAMI_DIALECT_PATH,
  WORD_REGION_SLUG_TO_LABEL,
  WORD_SORT_OPTIONS,
  isWordSortKey,
  matchesQueryTokens,
  representativeForms,
  sortWordRecords,
  totalVariantCount,
} from "@/app/lib/amamiDialect";
import { WordFilterForm } from "@/app/amami-dialect/_components/WordFilterForm";

type CategoryOption = {
  label: string;
  slug: string;
  count: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  items: WordRecord[];
  categories: CategoryOption[];
  regions: string[];
  searchParams: SearchParams;
  /** フィルター変更時の遷移先。既定は語彙一覧そのもの */
  basePath?: string;
  /** カテゴリ固定ページ等で、URLにcategoryが無い場合の初期値 */
  defaultCategorySlug?: string;
};

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function WordExplorer({
  items,
  categories,
  regions,
  searchParams,
  basePath = `${AMAMI_DIALECT_PATH}/words`,
  defaultCategorySlug,
}: Props) {
  const q = paramString(searchParams.q);
  const categorySlug = paramString(searchParams.category) || defaultCategorySlug || "all";
  const regionSlug = paramString(searchParams.region) || "all";
  const sortRaw = paramString(searchParams.sort);
  const sort = isWordSortKey(sortRaw) ? sortRaw : "id";

  const categoryLabelBySlug = new Map(categories.map((c) => [c.slug, c.label]));
  const categoryLabel = categorySlug !== "all" ? categoryLabelBySlug.get(categorySlug) : undefined;
  const regionLabel = regionSlug !== "all" ? WORD_REGION_SLUG_TO_LABEL[regionSlug] : undefined;

  const filtered = items.filter((item) => {
    if (categoryLabel && item.category !== categoryLabel) return false;
    if (regionLabel && !item.regions.some((entry) => entry.region === regionLabel)) {
      return false;
    }
    if (!q.trim()) return true;

    const haystack = [
      item.id,
      item.standardWord,
      item.category,
      ...item.regions.flatMap((entry) => [entry.region, ...entry.forms]),
    ].join(" ");

    return matchesQueryTokens(haystack, q);
  });
  const sorted = sortWordRecords(filtered, sort);

  function buildHref(patch: Record<string, string | null>) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categorySlug !== "all") params.set("category", categorySlug);
    if (regionSlug !== "all") params.set("region", regionSlug);
    if (sort !== "id") params.set("sort", sort);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  const hasActiveFilters =
    Boolean(q.trim()) || categorySlug !== "all" || regionSlug !== "all" || sort !== "id";

  return (
    <div className="dialect-list-wrap">
      <WordFilterForm
        basePath={basePath}
        q={q}
        categorySlug={categorySlug}
        regionSlug={regionSlug}
        sort={sort}
        categories={categories}
        regions={regions}
      />

      {hasActiveFilters ? (
        <div className="dialect-filter-chips" aria-label="選択中の条件">
          {q.trim() ? (
            <Link className="dialect-chip" href={buildHref({ q: null })}>
              検索「{q.trim()}」<span aria-hidden="true">×</span>
            </Link>
          ) : null}
          {categoryLabel ? (
            <Link className="dialect-chip" href={buildHref({ category: null })}>
              カテゴリ：{categoryLabel}
              <span aria-hidden="true">×</span>
            </Link>
          ) : null}
          {regionLabel ? (
            <Link className="dialect-chip" href={buildHref({ region: null })}>
              地域：{regionLabel}
              <span aria-hidden="true">×</span>
            </Link>
          ) : null}
          {sort !== "id" ? (
            <Link className="dialect-chip" href={buildHref({ sort: null })}>
              並び順：{WORD_SORT_OPTIONS.find((option) => option.value === sort)?.label}
              <span aria-hidden="true">×</span>
            </Link>
          ) : null}
          <Link className="dialect-reset" href={basePath}>
            条件をリセット
          </Link>
        </div>
      ) : null}

      <p className="dialect-count" aria-live="polite">
        {sorted.length}件
      </p>

      {sorted.length > 0 ? (
        <div className="dialect-card-grid">
          {sorted.map((item) => (
            <article className="dialect-card" key={item.id}>
              <p className="dialect-card-id">{item.id}</p>
              <h2>
                <Link href={`${AMAMI_DIALECT_PATH}/words/${item.id}`}>
                  {item.standardWord}
                </Link>
              </h2>
              <p className="dialect-meaning">
                {item.category}
                {sort === "variants" ? `｜記録形${totalVariantCount(item)}件` : ""}
              </p>
              <ul className="dialect-word-regions">
                {item.regions.map((entry) => (
                  <li key={entry.region}>
                    <span className="dialect-word-region-name">{entry.region}</span>
                    <span>{representativeForms(entry.forms, 2)}</span>
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
          <p>該当する語彙はありません。条件を変えてお試しください。</p>
          <Link className="btn btn-soft" href={basePath}>
            条件をリセット
          </Link>
        </div>
      )}

      <p className="dialect-representative-note">
        地域ごとの表記は資料に記録された一例です。集落によって異なる場合があります。
      </p>
    </div>
  );
}

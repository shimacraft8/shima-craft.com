import greetingsJson from "@/public/data/amami-greetings.json";
import proverbsJson from "@/public/data/amami-proverbs.json";
import wordsJson from "@/public/data/amami-words.json";

export type ProverbRecord = {
  id: string;
  title: string;
  reading: string;
  meaning: string;
  description: string;
  evidenceLevel: string;
  evidenceLabel: string;
  sourceId: string;
  sourceTitle: string;
  sourcePage: string;
  sourceUrl: string;
  sourceRegion: string;
  actualUsageArea: string | null;
  modernUsage: string | null;
  caution: string;
};

export type GreetingRecord = {
  id: string;
  title: string;
  reading: string;
  meaning: string;
  otherTranslations: string;
  timeOfDay: string;
  politeness: string;
  usageRegion: string;
  evidenceLevel: string;
  evidenceLabel: string;
  publicationStatus: string;
  source: string;
  sourceUrl: string;
  caution: string;
};

export type WordRegionEntry = {
  region: string;
  forms: string[];
};

export type WordRecord = {
  id: string;
  category: string;
  standardWord: string;
  sourceId: string;
  sourceTitle: string;
  sourcePage: string;
  sourceUrl: string;
  trustTier: string;
  regions: WordRegionEntry[];
  caution: string;
  publicationStatus: string;
};

export type DialectListItem = {
  id: string;
  title: string;
  reading: string;
  meaning: string;
  description: string;
  href: string;
  filterValue: string;
  filterLabel: string;
  meta: string[];
};

export const AMAMI_DIALECT_PATH = "/amami-dialect";

export const amamiProverbs = [...proverbsJson.records].sort((a, b) =>
  a.id.localeCompare(b.id),
) as ProverbRecord[];

export const amamiGreetings = [...greetingsJson.records].sort((a, b) =>
  a.id.localeCompare(b.id),
) as GreetingRecord[];

export const amamiWords = [...wordsJson.records].sort((a, b) =>
  a.id.localeCompare(b.id),
) as WordRecord[];

export const WORD_CATEGORY_ORDER = [
  "あいさつ",
  "食事",
  "家族",
  "自然",
  "生き物",
  "道具",
] as const;

export const WORD_CATEGORY_SLUGS: Record<string, string> = {
  あいさつ: "greetings",
  食事: "meals",
  家族: "family",
  自然: "nature",
  生き物: "creatures",
  道具: "tools",
};

export const WORD_CATEGORY_SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(WORD_CATEGORY_SLUGS).map(([label, slug]) => [slug, label]),
);

export const WORD_REGION_ORDER = [
  "奄美大島",
  "喜界島",
  "徳之島",
  "沖永良部島",
  "与論島",
];

export const WORD_REGION_SLUGS: Record<string, string> = {
  奄美大島: "amami-oshima",
  喜界島: "kikai",
  徳之島: "tokunoshima",
  沖永良部島: "okinoerabu",
  与論島: "yoron",
};

export const WORD_REGION_SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(WORD_REGION_SLUGS).map(([label, slug]) => [slug, label]),
);

export const wordRegions = WORD_REGION_ORDER.map((label) => ({
  label,
  slug: WORD_REGION_SLUGS[label],
  count: amamiWords.filter((record) =>
    record.regions.some((entry) => entry.region === label),
  ).length,
}));

export const wordCategories = WORD_CATEGORY_ORDER.filter((category) =>
  amamiWords.some((record) => record.category === category),
).map((category) => ({
  label: category,
  slug: WORD_CATEGORY_SLUGS[category] ?? category,
  count: amamiWords.filter((record) => record.category === category).length,
}));

export const proverbSourcePages = Array.from(
  new Set(amamiProverbs.map((record) => record.sourcePage)),
).sort((a, b) => a.localeCompare(b, "ja"));

export const greetingStatuses = Array.from(
  new Set(amamiGreetings.map((record) => record.publicationStatus)),
).sort((a, b) => a.localeCompare(b, "ja"));

export function getProverbById(id: string) {
  return amamiProverbs.find((record) => record.id === id);
}

export function getGreetingById(id: string) {
  return amamiGreetings.find((record) => record.id === id);
}

export function getWordById(id: string) {
  return amamiWords.find((record) => record.id === id);
}

export function getWordsByCategorySlug(slug: string) {
  const label = WORD_CATEGORY_SLUG_TO_LABEL[slug];
  if (!label) {
    return [];
  }
  return amamiWords.filter((record) => record.category === label);
}

export function getWordsByRegionSlug(slug: string) {
  const label = WORD_REGION_SLUG_TO_LABEL[slug];
  if (!label) {
    return [];
  }
  return amamiWords.filter((record) =>
    record.regions.some((entry) => entry.region === label),
  );
}

/** 指定地域について、カテゴリごとの件数を語彙カテゴリの表示順で集計する */
export function regionCategoryBreakdown(regionLabel: string) {
  const records = amamiWords.filter((record) =>
    record.regions.some((entry) => entry.region === regionLabel),
  );
  return WORD_CATEGORY_ORDER.filter((category) =>
    records.some((record) => record.category === category),
  ).map((category) => ({
    label: category,
    slug: WORD_CATEGORY_SLUGS[category] ?? category,
    count: records.filter((record) => record.category === category).length,
  }));
}

export type WordSortKey = "standard" | "id" | "category" | "variants";

export const WORD_SORT_OPTIONS: { value: WordSortKey; label: string }[] = [
  { value: "standard", label: "標準語順" },
  { value: "id", label: "ID順" },
  { value: "category", label: "カテゴリ順" },
  { value: "variants", label: "記録形の件数順" },
];

const jaCollator = new Intl.Collator("ja");

export function totalVariantCount(record: WordRecord): number {
  return record.regions.reduce((sum, entry) => sum + entry.forms.length, 0);
}

export function sortWordRecords(
  records: WordRecord[],
  sort: WordSortKey,
): WordRecord[] {
  const arr = [...records];
  switch (sort) {
    case "standard":
      return arr.sort((a, b) => jaCollator.compare(a.standardWord, b.standardWord));
    case "category":
      return arr.sort((a, b) => {
        const ai = WORD_CATEGORY_ORDER.indexOf(a.category as (typeof WORD_CATEGORY_ORDER)[number]);
        const bi = WORD_CATEGORY_ORDER.indexOf(b.category as (typeof WORD_CATEGORY_ORDER)[number]);
        if (ai !== bi) return ai - bi;
        return a.id.localeCompare(b.id);
      });
    case "variants":
      return arr.sort((a, b) => {
        const diff = totalVariantCount(b) - totalVariantCount(a);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      });
    case "id":
    default:
      return arr.sort((a, b) => a.id.localeCompare(b.id));
  }
}

export function isWordSortKey(value: string | null | undefined): value is WordSortKey {
  return value === "standard" || value === "id" || value === "category" || value === "variants";
}

/** 全角/半角・ひらがな/カタカナのゆらぎを吸収したうえで、空白区切りのAND検索を行う */
export function matchesQueryTokens(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeDialectSearch(query.trim());
  if (!normalizedQuery) {
    return true;
  }
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const normalizedHaystack = normalizeDialectSearch(haystack);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

/** カード表示用に、代表表記1〜2件＋「ほかN件」の形へ圧縮する（唯一の正解に見せないための注記付き） */
export function representativeForms(forms: string[], limit = 2): string {
  if (forms.length <= limit) {
    return forms.join("・");
  }
  const shown = forms.slice(0, limit).join("・");
  const rest = forms.length - limit;
  return `${shown} ほか${rest}件`;
}

export function normalizeDialectSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[ぁ-ん]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) + 0x60),
    )
    .toLocaleLowerCase("ja-JP");
}

export function displayText(value: string | null | undefined) {
  if (!value || value === "未確認") {
    return "";
  }

  return value
    .replace(/《[^》]*(?:音声|音韻)[^》]*》/g, "")
    .replace(/\[[^\]]*[ʔːϊёɑa-zA-Z][^\]]*\]/g, "")
    .replace(/[‘’'A-Za-z0-9:%._-]*[A-Za-z][‘’'A-Za-z0-9:%._-]*/g, "")
    .replace(/\(\)/g, "")
    .replace(/（）/g, "")
    .replace(/\s+([。、）」])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toProverbListItem(record: ProverbRecord): DialectListItem {
  return {
    id: record.id,
    title: record.title,
    reading: record.reading,
    meaning: record.meaning,
    description: displayText(record.description),
    href: `${AMAMI_DIALECT_PATH}/proverbs/${record.id}`,
    filterValue: record.sourcePage,
    filterLabel: record.sourcePage,
    meta: [record.evidenceLabel, record.sourceRegion, record.sourcePage],
  };
}

export function toGreetingListItem(record: GreetingRecord): DialectListItem {
  return {
    id: record.id,
    title: record.title,
    reading: displayText(record.reading) || record.title,
    meaning: displayText(record.meaning) || displayText(record.otherTranslations),
    description: displayText(record.politeness),
    href: `${AMAMI_DIALECT_PATH}/greetings/${record.id}`,
    filterValue: record.publicationStatus,
    filterLabel: record.publicationStatus,
    meta: [record.evidenceLabel, record.publicationStatus],
  };
}

export function wordRegionSummary(record: WordRecord, limit = 3): string {
  const shown = record.regions
    .slice(0, limit)
    .map((entry) => `${entry.region}：${representativeForms(entry.forms, 2)}`)
    .join("／");
  const rest = record.regions.length - limit;
  return rest > 0 ? `${shown}／ほか${rest}地域の記録` : shown;
}

export function toWordListItem(record: WordRecord): DialectListItem {
  return {
    id: record.id,
    title: record.standardWord,
    reading: wordRegionSummary(record),
    meaning: record.category,
    description: "",
    href: `${AMAMI_DIALECT_PATH}/words/${record.id}`,
    filterValue: WORD_CATEGORY_SLUGS[record.category] ?? record.category,
    filterLabel: record.category,
    meta: [record.category, `${record.regions.length}地域の記録`],
  };
}

export type SearchDatasetItem = DialectListItem & { dataset: string };

export const dialectSearchIndex: SearchDatasetItem[] = [
  ...amamiProverbs.map((record) => ({ ...toProverbListItem(record), dataset: "ことわざ" })),
  ...amamiGreetings.map((record) => ({ ...toGreetingListItem(record), dataset: "あいさつ" })),
  ...amamiWords.map((record) => ({ ...toWordListItem(record), dataset: "語彙" })),
];

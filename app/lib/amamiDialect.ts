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
  return record.regions
    .slice(0, limit)
    .map((entry) => `${entry.region}：${entry.forms.slice(0, 2).join("・")}`)
    .join("／");
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

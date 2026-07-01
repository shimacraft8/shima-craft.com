import greetingsJson from "@/public/data/amami-greetings.json";
import proverbsJson from "@/public/data/amami-proverbs.json";

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

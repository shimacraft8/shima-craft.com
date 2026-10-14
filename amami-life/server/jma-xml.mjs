import { DOMParser } from "@xmldom/xmldom";
import { validDate } from "../packages/core/src/index.ts";

const NS = {
  atom: "http://www.w3.org/2005/Atom",
  report: "http://xml.kishou.go.jp/jmaxml1/",
  head: "http://xml.kishou.go.jp/jmaxml1/informationBasis1/",
  quake: "http://xml.kishou.go.jp/jmaxml1/body/seismology1/",
  weather: "http://xml.kishou.go.jp/jmaxml1/body/meteorology1/",
  element: "http://xml.kishou.go.jp/jmaxml1/elementBasis1/",
};
const TYPES = {
  VXSE51: "earthquake-history",
  VXSE52: "earthquake-history",
  VXSE53: "earthquake-history",
  VTSE41: "tsunami",
  VPTW61: "cyclone",
  VPWW53: "weather-warning",
  VPWW54: "weather-warning",
};
export const JMA_FEEDS = [
  "https://www.data.jma.go.jp/developer/xml/feed/eqvol_l.xml",
  "https://www.data.jma.go.jp/developer/xml/feed/extra_l.xml",
];
function xmlDocument(xml, maxBytes) {
  if (
    typeof xml !== "string" ||
    Buffer.byteLength(xml) > maxBytes ||
    /<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)
  )
    throw new Error("unsafe-or-oversized-xml");
  // Reject deep input before building a DOM; no entity expansion or external resolution.
  let depth = 0;
  for (const match of xml.matchAll(/<\/?([\w:.-]+)(?:\s[^<>]*)?\s*\/?>/g)) {
    if (match[0].startsWith("</")) depth--;
    else if (!match[0].endsWith("/>")) depth++;
    if (depth < 0 || depth > 80) throw new Error("invalid-xml-depth");
  }
  let invalid = false;
  const doc = new DOMParser({
    errorHandler: {
      warning: () => {
        invalid = true;
      },
      error: () => {
        invalid = true;
      },
      fatalError: () => {
        invalid = true;
      },
    },
  }).parseFromString(xml, "application/xml");
  if (invalid || !doc.documentElement) throw new Error("malformed-xml");
  return doc.documentElement;
}
const children = (node, namespace, name) =>
  Array.from(node?.childNodes ?? []).filter(
    (n) =>
      n.nodeType === 1 && n.namespaceURI === namespace && n.localName === name,
  );
function child(node, namespace, name, required = true) {
  const matches = children(node, namespace, name);
  if (matches.length > 1 || (required && matches.length !== 1))
    throw new Error("ambiguous-or-missing-xml:" + name);
  return matches[0] ?? null;
}
const text = (node, namespace, name, required = true) =>
  child(node, namespace, name, required)?.textContent.trim() ?? null;
function iso(value) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value)) ||
    !validDate(value.slice(0, 10))
  )
    throw new Error("invalid-xml-time");
  return new Date(value).toISOString();
}
export function bulletinUrl(value) {
  const u = new URL(value);
  if (
    u.origin !== "https://www.data.jma.go.jp" ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !/^\/developer\/xml\/data\/\d{14}_\d+_[A-Z0-9]{6}_\d{6}\.xml$/.test(
      u.pathname,
    )
  )
    throw new Error("untrusted-bulletin-url");
  return u.href;
}
export function bulletinKind(url) {
  return TYPES[new URL(bulletinUrl(url)).pathname.split("_")[2]] ?? null;
}
export function parseAtomFeed(xml) {
  const root = xmlDocument(xml, 4 * 1024 * 1024);
  if (root.namespaceURI !== NS.atom || root.localName !== "feed")
    throw new Error("invalid-atom-namespace");
  const entries = [];
  for (const entry of children(root, NS.atom, "entry")) {
    const links = children(entry, NS.atom, "link").filter(
      (l) => !l.getAttribute("rel") || l.getAttribute("rel") === "alternate",
    );
    if (links.length !== 1) throw new Error("ambiguous-atom-link");
    const url = bulletinUrl(links[0].getAttribute("href"));
    const kind = bulletinKind(url);
    if (kind)
      entries.push({
        url,
        kind,
        title: text(entry, NS.atom, "title"),
        updatedAt: iso(text(entry, NS.atom, "updated")),
      });
  }
  const unique = new Map();
  for (const e of entries) {
    if (
      unique.has(e.url) &&
      JSON.stringify(unique.get(e.url)) !== JSON.stringify(e)
    )
      throw new Error("conflicting-atom-entry");
    unique.set(e.url, e);
  }
  return {
    updatedAt: iso(text(root, NS.atom, "updated")),
    entries: [...unique.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  };
}
function quakeDetails(body) {
  const eq = child(body, NS.quake, "Earthquake", false),
    observation = child(
      child(body, NS.quake, "Intensity", false),
      NS.quake,
      "Observation",
      false,
    );
  const area = child(
    child(eq, NS.quake, "Hypocenter", false),
    NS.quake,
    "Area",
    false,
  );
  const rawIntensity = text(observation, NS.quake, "MaxInt", false);
  const maxIntensity = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5-",
    "5+",
    "6-",
    "6+",
    "7",
  ].includes(rawIntensity)
    ? rawIntensity
    : null;
  const cities = Array.from(
    observation?.getElementsByTagNameNS(NS.quake, "City") ?? [],
  ).map((c) => ({
    code: text(c, NS.quake, "Code"),
    name: text(c, NS.quake, "Name"),
    intensity: text(c, NS.quake, "MaxInt", false),
  }));
  return {
    originTime: eq ? iso(text(eq, NS.quake, "OriginTime")) : null,
    hypocenter: area
      ? {
          code: text(area, NS.quake, "Code"),
          name: text(area, NS.quake, "Name"),
        }
      : null,
    maxIntensity,
    cities,
  };
}
function tsunamiDetails(body) {
  const forecast = child(
    child(body, NS.quake, "Tsunami", false),
    NS.quake,
    "Forecast",
    false,
  );
  return {
    areas: children(forecast, NS.quake, "Item").map((item) => {
      const area = child(item, NS.quake, "Area"),
        category = child(item, NS.quake, "Category"),
        kind = child(category, NS.quake, "Kind"),
        last = child(category, NS.quake, "LastKind", false);
      return {
        code: text(area, NS.quake, "Code"),
        name: text(area, NS.quake, "Name"),
        categoryCode: text(kind, NS.quake, "Code"),
        categoryName: text(kind, NS.quake, "Name"),
        previousCategoryCode: text(last, NS.quake, "Code", false),
      };
    }),
  };
}
function cycloneDetails(body) {
  const group = children(body, NS.weather, "MeteorologicalInfos").find(
    (n) => n.getAttribute("type") === "台風情報",
  );
  const actual = children(group, NS.weather, "MeteorologicalInfo").find(
    (n) => child(n, NS.weather, "DateTime")?.getAttribute("type") === "実況",
  );
  if (!actual) return null;
  const classes = Array.from(
    actual.getElementsByTagNameNS(NS.element, "TyphoonClass"),
  );
  const rawClass =
    classes
      .find((n) => n.getAttribute("type") === "熱帯擾乱種類")
      ?.textContent.trim() ?? null;
  const nameParts = Array.from(
    actual.getElementsByTagNameNS(NS.weather, "TyphoonNamePart"),
  );
  if (nameParts.length > 1) throw new Error("ambiguous-cyclone-name");
  const name = nameParts[0];
  // TD can be developing or weakening. The class alone does not establish development potential.
  const stage = rawClass?.includes("熱帯低気圧")
    ? "tropical-depression"
    : rawClass?.includes("温帯低気圧")
      ? "extratropical"
      : rawClass?.startsWith("台風(")
        ? "typhoon"
        : "unknown";
  return {
    observedAt: iso(text(actual, NS.weather, "DateTime")),
    rawClass,
    stage,
    developmentWithin24h: null,
    number: text(name, NS.weather, "Number", false) || null,
    name: text(name, NS.weather, "NameKana", false) || null,
  };
}
function warningDetails(body) {
  return {
    groups: children(body, NS.weather, "Warning").map((group) => ({
      type: group.getAttribute("type"),
      areas: children(group, NS.weather, "Item").map((item) => {
        const area = child(item, NS.weather, "Area");
        return {
          code: text(area, NS.weather, "Code"),
          name: text(area, NS.weather, "Name"),
          kinds: children(item, NS.weather, "Kind").map((k) => ({
            code: text(k, NS.weather, "Code", false),
            name: text(k, NS.weather, "Name", false),
            status: text(k, NS.weather, "Status"),
          })),
        };
      }),
    })),
  };
}
/** Document-level inspection only. This does not establish current regional warning state. */
export function parseJmaBulletin(xml, sourceUrl) {
  const url = bulletinUrl(sourceUrl),
    kind = bulletinKind(url);
  if (!kind) throw new Error("unsupported-bulletin-kind");
  const root = xmlDocument(xml, 700 * 1024);
  if (root.namespaceURI !== NS.report || root.localName !== "Report")
    throw new Error("invalid-report-namespace");
  const control = child(root, NS.report, "Control"),
    head = child(root, NS.head, "Head"),
    status = text(control, NS.report, "Status");
  const infoKind = text(head, NS.head, "InfoKind");
  const expected = {
    "earthquake-history": "地震情報",
    tsunami: "津波警報・注意報・予報",
    cyclone: "台風解析・予報情報（５日予報）",
    "weather-warning": "気象警報・注意報",
  };
  if (infoKind !== expected[kind]) throw new Error("bulletin-kind-mismatch");
  const infoType = text(head, NS.head, "InfoType");
  if (!["発表", "訂正", "取消"].includes(infoType))
    throw new Error("unsupported-info-type");
  const rawSerial = text(head, NS.head, "Serial"),
    serial = rawSerial === "" ? null : Number(rawSerial);
  if (
    serial !== null &&
    (!/^\d+$/.test(rawSerial) || !Number.isSafeInteger(serial))
  )
    throw new Error("invalid-bulletin-serial");
  const bodyNamespace =
    kind === "cyclone" || kind === "weather-warning" ? NS.weather : NS.quake;
  const body = child(root, bodyNamespace, "Body", infoType !== "取消");
  const details =
    infoType === "取消"
      ? null
      : kind === "earthquake-history"
        ? quakeDetails(body)
        : kind === "tsunami"
          ? tsunamiDetails(body)
          : kind === "cyclone"
            ? cycloneDetails(body)
            : warningDetails(body);
  return {
    sourceUrl: url,
    kind,
    infoKind,
    infoKindVersion: text(head, NS.head, "InfoKindVersion"),
    scope: "document-only",
    isCurrentState: false,
    status,
    operational: status === "通常",
    title: text(head, NS.head, "Title"),
    eventId: text(head, NS.head, "EventID") || null,
    serial,
    infoType,
    action:
      infoType === "取消"
        ? "cancel"
        : infoType === "訂正"
          ? "correct"
          : "issue",
    issuedAt: iso(text(head, NS.head, "ReportDateTime")),
    controlledAt: iso(text(control, NS.report, "DateTime")),
    validUntil: text(head, NS.head, "ValidDateTime", false)
      ? iso(text(head, NS.head, "ValidDateTime"))
      : null,
    headline: text(
      child(head, NS.head, "Headline", false),
      NS.head,
      "Text",
      false,
    ),
    details,
  };
}

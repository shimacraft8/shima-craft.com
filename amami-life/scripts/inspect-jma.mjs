import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  parseAtomFeed,
  parseJmaBulletin,
  JMA_FEEDS,
} from "../server/jma-xml.mjs";

// No recurring background polling, publication, or notification side effects.
const fetchMode = process.argv.includes("--fetch");
const out = resolve("research/jma-inspection");
await mkdir(out, { recursive: true });
const documents = [];
const evidence = [];
async function bounded(url, maxBytes) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(9000),
    redirect: "error",
    headers: { Accept: "application/xml" },
  });
  if (!res.ok) throw new Error("source-http:" + res.status);
  let size = 0;
  const chunks = [],
    reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("source-too-large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
if (fetchMode) {
  for (const url of JMA_FEEDS) {
    const xml = await bounded(url, 4 * 1024 * 1024),
      feed = parseAtomFeed(xml);
    evidence.push({
      url,
      fetchedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(xml).digest("hex"),
      updatedAt: feed.updatedAt,
    });
    const selected = new Map();
    for (const entry of feed.entries)
      if (!selected.has(entry.kind)) selected.set(entry.kind, entry);
    for (const entry of selected.values()) {
      const xml = await bounded(entry.url, 700 * 1024),
        fetchedAt = new Date().toISOString();
      const document = parseJmaBulletin(xml, entry.url);
      const filename = entry.url.split("/").at(-1);
      await writeFile(resolve(out, filename), xml);
      evidence.push({
        url: entry.url,
        fetchedAt,
        sha256: createHash("sha256").update(xml).digest("hex"),
        filename,
      });
      documents.push(document);
    }
  }
} else {
  const provenance = JSON.parse(
    await readFile(
      new URL("../tests/fixtures/provenance.json", import.meta.url),
      "utf8",
    ),
  );
  for (const entry of provenance.bulletins)
    documents.push(
      parseJmaBulletin(
        await readFile(
          new URL("../tests/fixtures/" + entry.file, import.meta.url),
          "utf8",
        ),
        entry.url,
      ),
    );
}
const outputFile = resolve(
  out,
  fetchMode ? "inspection-live.json" : "inspection-fixtures.json",
);
const result = {
  inspectedAt: new Date().toISOString(),
  mode: fetchMode ? "official-sample-download" : "saved-official-fixtures",
  coverage:
    "one-sample-per-supported-kind; not current warnings or a complete event history",
  documents,
  evidence,
};
await writeFile(outputFile, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    mode: result.mode,
    documents: documents.length,
    output: outputFile,
    currentStateVerified: false,
  }),
);

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseAtomFeed,
  parseJmaBulletin,
  bulletinKind,
  bulletinUrl,
} from "../server/jma-xml.mjs";
const provenance = JSON.parse(
  await readFile(
    new URL("./fixtures/provenance.json", import.meta.url),
    "utf8",
  ),
);
const fixtures = await Promise.all(
  provenance.bulletins.map(async (p) => ({
    ...p,
    xml: await readFile(
      new URL("./fixtures/" + p.file, import.meta.url),
      "utf8",
    ),
  })),
);

test("actual official earthquake report has event ID, serial, correct hypocenter and intensity; not EEW/current state", () => {
  const f = fixtures[0],
    r = parseJmaBulletin(f.xml, f.url);
  assert.equal(r.kind, "earthquake-history");
  assert.equal(r.eventId, "20261013220530");
  assert.equal(r.serial, 1);
  assert.equal(r.details.hypocenter.name, "宮城県沖");
  assert.equal(r.details.maxIntensity, "1");
  assert.equal(r.issuedAt, "2026-10-13T13:08:00.000Z");
  assert.equal(r.isCurrentState, false);
  assert.equal(
    r.details.cities.some((c) => c.code === "4622200"),
    false,
  ); // no substring match to Amami
  const unknown = f.xml.replace("<MaxInt>1</MaxInt>", "<MaxInt>---</MaxInt>");
  assert.equal(parseJmaBulletin(unknown, f.url).details.maxIntensity, null);
});
test("actual 2026 tsunami report preserves empty serial, official validity, regional categories and previous categories", () => {
  const f = fixtures[1],
    r = parseJmaBulletin(f.xml, f.url);
  assert.equal(r.serial, null);
  assert.equal(r.validUntil, "2026-10-11T11:00:00.000Z");
  assert.equal(r.details.areas[0].categoryCode, "71");
  assert.equal(r.details.areas[0].previousCategoryCode, "00");
  assert.equal(r.isCurrentState, false);
  assert.notEqual(r.action, "release");
});
test("actual cyclone parses the observation rather than future class; TD alone does not mean developing within 24h", () => {
  const f = fixtures[2],
    r = parseJmaBulletin(f.xml, f.url);
  assert.equal(r.eventId, "TC2634");
  assert.equal(r.serial, 73);
  assert.equal(r.details.name, "コグマ");
  assert.equal(r.details.stage, "typhoon");
  const td = f.xml.replace("台風(STS)", "熱帯低気圧(TD)");
  const d = parseJmaBulletin(td, f.url);
  assert.equal(d.details.stage, "tropical-depression");
  assert.equal(d.details.developmentWithin24h, null);
  const ex = f.xml.replace("台風(STS)", "温帯低気圧");
  assert.equal(parseJmaBulletin(ex, f.url).details.stage, "extratropical");
});
test("official old/new weather warning documents preserve area codes, individual statuses and no-warning aggregates", () => {
  for (const f of fixtures.slice(3)) {
    const r = parseJmaBulletin(f.xml, f.url);
    assert.equal(r.kind, "weather-warning");
    const groups = r.details.groups;
    assert.ok(
      groups.some((g) =>
        g.areas.some((a) => a.kinds.some((k) => k.status === "継続")),
      ),
    );
    assert.ok(
      groups.some((g) =>
        g.areas.some((a) =>
          a.kinds.some((k) => k.status === "発表警報・注意報はなし"),
        ),
      ),
    );
    assert.equal(r.isCurrentState, false);
  }
});
test("document cancellation remains a tombstone with event ID; correction preserves serial; training cannot be operational", () => {
  const f = fixtures[0];
  const cancel = f.xml
    .replace("<InfoType>発表</InfoType>", "<InfoType>取消</InfoType>")
    .replace(/<Body[\s\S]*<\/Body>/, "");
  const r = parseJmaBulletin(cancel, f.url);
  assert.equal(r.action, "cancel");
  assert.equal(r.eventId, "20261013220530");
  assert.equal(r.details, null);
  const correction = f.xml.replace(
    "<InfoType>発表</InfoType>",
    "<InfoType>訂正</InfoType>",
  );
  assert.equal(parseJmaBulletin(correction, f.url).action, "correct");
  const training = f.xml.replace(
    "<Status>通常</Status>",
    "<Status>訓練</Status>",
  );
  assert.equal(parseJmaBulletin(training, f.url).operational, false);
});
test("namespaces, duplicate heads, malformed XML, entity declarations and untrusted URLs fail closed", () => {
  const f = fixtures[0];
  for (const xml of [
    f.xml.replace("http://xml.kishou.go.jp/jmaxml1/", "https://evil.test/"),
    f.xml.replace(
      "</Report>",
      '<Head xmlns="http://xml.kishou.go.jp/jmaxml1/informationBasis1/"/></Report>',
    ),
    f.xml.slice(0, -15),
    '<!DOCTYPE Report [<!ENTITY x "boom">]>' + f.xml,
    "<Report>" + "<x>".repeat(81),
  ])
    assert.throws(() => parseJmaBulletin(xml, f.url));
  for (const url of [
    "http://www.data.jma.go.jp/developer/xml/data/a.xml",
    "https://evil.test/developer/xml/data/20261013130813_0_VXSE53_010000.xml",
    f.url + "?redirect=foo",
    "https://user@www.data.jma.go.jp/developer/xml/data/20261013130813_0_VXSE53_010000.xml",
  ])
    assert.throws(() => bulletinUrl(url));
  assert.equal(bulletinKind(f.url.replace("VXSE53", "VXSE43")), null); // EEW never enters earthquake history
});
test("actual Atom subset keeps separate report URLs and includes typed tsunami/cyclone records", async () => {
  const a = parseAtomFeed(
    await readFile(
      new URL("./fixtures/jma-eqvol-feed-subset.xml", import.meta.url),
      "utf8",
    ),
  );
  const b = parseAtomFeed(
    await readFile(
      new URL("./fixtures/jma-extra-feed-subset.xml", import.meta.url),
      "utf8",
    ),
  );
  assert.ok(a.entries.some((e) => e.kind === "tsunami"));
  assert.ok(b.entries.some((e) => e.kind === "cyclone"));
  const withNamespace = (
    await readFile(
      new URL("./fixtures/jma-eqvol-feed-subset.xml", import.meta.url),
      "utf8",
    )
  ).replace("http://www.w3.org/2005/Atom", "https://evil.test/");
  assert.throws(() => parseAtomFeed(withNamespace));
});

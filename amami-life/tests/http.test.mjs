import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../server/index.mjs";
import { createWeatherProvider } from "../server/weather.mjs";
import { readFile } from "node:fs/promises";
const forecastFixture = await readFile(
  new URL("./fixtures/jma-forecast-20261013.json", import.meta.url),
  "utf8",
);
test("local HTTP contract, failure, static boundary and rate limit", async (t) => {
  const server = createApp({
    weatherProvider: createWeatherProvider({
      fetcher: async () => new Response(forecastFixture),
      clock: () => new Date("2026-10-13T03:00:00Z"),
    }),
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await t.test(
      "real HTTP returns reference tide provenance and demo envelope",
      async () => {
        const res = await fetch(base + "/v1/today?area=naze&date=2026-10-13");
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.mode, "demo");
        assert.equal(json.data.tideSource.station, "O9");
        assert.ok(json.data.tideSource.fetchedAt);
        assert.equal(json.data.hazards.source.issuedAt, null);
      },
    );
    await t.test(
      "injected source failure stays 503 with no-store",
      async () => {
        const res = await fetch(base + "/v1/today?state=error");
        assert.equal(res.status, 503);
        assert.equal(res.headers.get("cache-control"), "no-store");
      },
    );
    await t.test("POST cannot mutate API", async () => {
      assert.equal(
        (await fetch(base + "/v1/today", { method: "POST" })).status,
        405,
      );
    });
    await t.test(
      "live weather travels through HTTP with exact regional scope, provenance and local-development CORS",
      async () => {
        const res = await fetch(
          base + "/v1/weather?mode=live&area=koniya&date=2026-10-15",
          { headers: { Origin: "http://localhost:4901" } },
        );
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.mode, "live");
        assert.equal(body.data.region.code, "460040");
        assert.equal(body.data.temperature, null);
        assert.equal(body.source.issuedAt, "2026-10-13T02:00:00.000Z");
        assert.equal(
          res.headers.get("access-control-allow-origin"),
          "http://localhost:4901",
        );
        assert.equal(res.headers.get("cache-control"), "no-store");
        const remote = await fetch(base + "/v1/weather", {
          headers: { Origin: "https://example.com" },
        });
        assert.equal(remote.headers.get("access-control-allow-origin"), null);
      },
    );
    await t.test(
      "only built public files served; source and malformed paths not exposed",
      async () => {
        assert.equal((await fetch(base + "/package.json")).status, 404);
        assert.equal((await fetch(base + "/%ZZ")).status, 404);
        assert.equal((await fetch(base + "/index.html")).status, 200);
        assert.equal(
          (await fetch(base + "/%2e%2e%2fserver/data/tide-provenance.json"))
            .status,
          403,
        );
      },
    );
    await t.test("120/minute rate limit responds with retry hint", async () => {
      let response;
      for (let i = 0; i < 121; i++)
        response = await fetch(base + "/v1/service-health");
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("retry-after"), "60");
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

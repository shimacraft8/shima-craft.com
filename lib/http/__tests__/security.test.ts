import { afterEach, describe, expect, it, vi } from "vitest";
import { readJSON, RequestError, allowRequest, beginSubmission, finishSubmission, verifyChallenge } from "../security";
import { isSameOrigin } from "../origin";
import { NextRequest } from "next/server";
const request = (body: string) => new Request("https://shima-craft.com/api/test", { method: "POST", headers: { "Content-Type": "application/json" }, body });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("bounded request and origin boundary", () => {
  it("counts UTF-8 bytes, not characters", async () => { await expect(readJSON(request('{"x":"ああ"}'), 10)).rejects.toMatchObject({ status: 413 }); });
  it.each(["null", "[]", "\"str\"", "{"])("rejects non-object/malformed JSON %s", async body => { await expect(readJSON(request(body))).rejects.toMatchObject({ status: 400 }); });
  it("rejects unsupported content type", async () => { await expect(readJSON(new Request("https://shima-craft.com", { method: "POST", body: "{}" }))).rejects.toMatchObject({ status: 415 }); });
  it("accepts valid JSON", async () => { expect(await readJSON(request('{"consent":true}'))).toEqual({ consent: true }); });
  it.each([null,"https://shima-craft.com.evil.test","http://shima-craft.com","https://user@shima-craft.com"])("rejects origin %s", origin => {
    const r = new NextRequest("https://shima-craft.com/api/test", { headers: origin ? { Origin: origin } : {} }); expect(isSameOrigin(r)).toBe(false);
  });
  it("accepts exactly same scheme and origin", () => { expect(isSameOrigin(new NextRequest("https://shima-craft.com/api/test", { headers: { Origin: "https://shima-craft.com" } }))).toBe(true); });
});
describe("bounded retry and local throttle", () => {
  it("allows failed sends to retry but blocks in-flight, changed and ambiguous sends", () => {
    const t = "retry-1234567890123456";
    expect(beginSubmission("test",t,{ x:1 })).toBe("new");
    expect(() => beginSubmission("test",t,{ x:1 })).toThrow(RequestError);
    finishSubmission("test",t,"failed"); expect(beginSubmission("test",t,{x:1})).toBe("new");
    finishSubmission("test",t,"unknown"); expect(() => beginSubmission("test",t,{x:1})).toThrow();
    finishSubmission("test",t,"done"); expect(beginSubmission("test",t,{x:1})).toBe("done");
    expect(() => beginSubmission("test",t,{x:2})).toThrow();
  });
  it("bounds token size", () => { expect(() => beginSubmission("test","x".repeat(129),{})).toThrow(); });
  it("enforces limits and expires buckets", () => { expect(allowRequest("unit","one",1,60,100)).toBe(true); expect(allowRequest("unit","one",1,60,101)).toBe(false); expect(allowRequest("unit","one",1,60,160)).toBe(true); });
});
describe("Turnstile fails closed before a send", () => {
  it("requires server configuration", async () => { vi.stubEnv("TURNSTILE_SECRET_KEY",""); await expect(verifyChallenge(request("{}"),"token","monitor")).rejects.toMatchObject({status:503}); });
  it("requires a token", async () => { vi.stubEnv("TURNSTILE_SECRET_KEY","dummy"); await expect(verifyChallenge(request("{}"),"","monitor")).rejects.toMatchObject({status:400}); });
  it.each([{success:false},{success:true,hostname:"evil.test",action:"monitor"},{success:true,hostname:"shima-craft.com",action:"other"}])("rejects failed/expired/replayed or mismatched result", async result => {
    vi.stubEnv("TURNSTILE_SECRET_KEY","dummy"); vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(result)));
    await expect(verifyChallenge(request("{}"),"token","monitor")).rejects.toMatchObject({status:400});
  });
  it("does not trust a successful HTTP status alone", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY","dummy"); vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(verifyChallenge(request("{}"),"token","monitor")).rejects.toMatchObject({status:503});
  });
  it("accepts only success with the expected hostname and action", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY","dummy"); const fetcher=vi.fn().mockResolvedValue(Response.json({success:true,hostname:"shima-craft.com",action:"monitor"})); vi.stubGlobal("fetch",fetcher);
    await verifyChallenge(request("{}"),"token","monitor"); expect(fetcher.mock.calls[0][0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  });
});

it("stops a body that never completes before doing external work", async () => {
 const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{"x":'));}});
 const req=new Request("https://shima-craft.com/api/test",{method:"POST",headers:{"Content-Type":"application/json"},body,duplex:"half"} as RequestInit & {duplex:string});
 await expect(readJSON(req,100,10)).rejects.toMatchObject({status:408,code:"BODY_TIMEOUT"});
});

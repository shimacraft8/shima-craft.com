import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
let POST: typeof import("../route").POST;
let fetcher: ReturnType<typeof vi.fn>;
const valid = {name:"テスト",business:"店",url:"https://example.test",issue:"相談",email:"test@example.test",area:"奄美",consent:true,token:"test-1234567890123456",challengeToken:"dummy"};
const request=(data:unknown,origin="https://shima-craft.com")=>new NextRequest("https://shima-craft.com/api/monitor",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(data)});
beforeEach(async()=>{
 vi.resetModules(); vi.stubEnv("RESEND_API_KEY","dummy-not-a-real-key");vi.stubEnv("RESEND_FROM","contact@example.test");vi.stubEnv("TURNSTILE_SECRET_KEY","dummy");vi.stubEnv("TRUST_CLOUDFLARE_IP","false");
 fetcher=vi.fn(async(url:string)=>url.includes("siteverify")?Response.json({success:true,hostname:"shima-craft.com",action:"monitor"}):Response.json({id:"dummy"}));vi.stubGlobal("fetch",fetcher);
 ({POST}=await import("../route"));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("monitor send boundary",()=>{
 it("rejects an origin prefix without contacting any provider",async()=>{expect((await POST(request(valid,"https://shima-craft.com.evil.test"))).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();});
 it.each([{...valid,consent:false},{...valid,email:"bad\r\ncc:x@example.test"},{...valid,name:[]},{...valid,issue:"x".repeat(4001)},{...valid,url:"javascript:void(0)"}])("rejects invalid or unconsented payload before external verification",async data=>{expect((await POST(request(data))).status).toBe(422);expect(fetcher).not.toHaveBeenCalled();});
 it("does not send mail on failed challenge",async()=>{fetcher.mockResolvedValue(Response.json({success:false}));expect((await POST(request(valid))).status).toBe(400);expect(fetcher).toHaveBeenCalledTimes(1);});
 it("sends exactly once for duplicate submissions with a fresh verification",async()=>{
  expect((await POST(request(valid))).status).toBe(200);expect((await POST(request(valid))).status).toBe(200);
  const mail=fetcher.mock.calls.filter(([url])=>String(url).includes("resend.com"));expect(mail).toHaveLength(1);
  const options=mail[0][1] as RequestInit;const body=JSON.parse(String(options.body));expect(body.to).toEqual(["shimacraft8@gmail.com"]);expect(body.reply_to).toBe(valid.email);expect(options.headers).toMatchObject({"Idempotency-Key":"monitor-"+valid.token});
 });
 it("keeps ambiguous delivery pending rather than sending twice",async()=>{
  fetcher.mockImplementation(async(url:string)=>{if(url.includes("siteverify"))return Response.json({success:true,hostname:"shima-craft.com",action:"monitor"});throw Error("dummy timeout");});
  expect((await POST(request(valid))).status).toBe(503);expect((await POST(request(valid))).status).toBe(409);
  expect(fetcher.mock.calls.filter(([url])=>String(url).includes("resend.com"))).toHaveLength(1);
 });
 it("allows retry after an explicit provider rejection with provider idempotency",async()=>{
  let sends=0;fetcher.mockImplementation(async(url:string)=>url.includes("siteverify")?Response.json({success:true,hostname:"shima-craft.com",action:"monitor"}):new Response("",{status:++sends===1?503:200}));
  expect((await POST(request(valid))).status).toBe(503);expect((await POST(request(valid))).status).toBe(200);expect(sends).toBe(2);
 });
});

import test from 'node:test';import assert from 'node:assert/strict';import {checkHealth} from '../scripts/check-health.mjs';
const now=new Date('2026-10-22T04:00:00Z');
const fetcher=async url=>{
 if(url.endsWith('/'))return new Response('AMAMI LIFE <html data-release="public">');
 if(url.includes('service-health'))return Response.json({schemaVersion:1,mode:'public-web',currentHazardsIntegrated:false});
 const cyclone=url.includes('cyclones');return Response.json({schemaVersion:1,status:cyclone?'empty':'ready',data:cyclone?[]:{temperatureC:25},source:{fetchedAt:now.toISOString(),expiresAt:'2026-10-22T04:10:00Z'}});
};
test('health distinguishes checked-empty from old or missing data and does not send notifications',async()=>{
 const result=await checkHealth({fetcher,clock:()=>now});assert.equal(result.passed,true);assert.equal(result.checks[3].code,'VERIFIED_EMPTY');
 const old=await checkHealth({fetcher,clock:()=>new Date('2026-10-22T05:00:00Z')});assert.equal(old.passed,false);assert.equal(old.checks[2].state,'failed');
});
test('health is bounded, rejects oversized responses and never follows a redirect',async()=>{
 const result=await checkHealth({clock:()=>now,fetcher:async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(new URL(url).hostname,'shima-craft.com');return new Response('x'.repeat(131073));}});assert.equal(result.passed,false);assert.ok(result.checks.every(row=>row.code==='body-limit'));
});

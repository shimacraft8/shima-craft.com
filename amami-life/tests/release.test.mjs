import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { apiBase } from '../packages/core/src/api-config.ts';
import { createApp } from '../server/index.mjs';
const require=createRequire(import.meta.url);
const { releaseValues }=require('../apps/mobile/release-config.cjs');
test('release API requires a public HTTPS origin without credentials/query/path',()=>{
  for (const s of ['http://localhost:4837','http://api.amami-life.jp','https://127.0.0.1','https://api.example.com','https://api.amami-life.jp/v1','https://user:pass@api.amami-life.jp','https://api.amami-life.jp?key=x','https://api.amami-life.jp#fragment','https://[::1]']) assert.equal(apiBase(s),null);
  assert.equal(apiBase('https://api.amami-life.jp/'),'https://api.amami-life.jp'); // syntax-only test; this domain is not registered or used
  assert.equal(apiBase('http://192.168.1.9:4837',true),'http://192.168.1.9:4837');assert.equal(apiBase('http://evil.org',true),null);
});
test('API-only mode never serves the web app, demo data or unfinished hazard endpoints', async()=>{
  const server=createApp({apiOnly:true,weatherProvider:{get:async()=>({status:'ready',mode:'live',data:null})},observationProvider:{get:async()=>({status:'empty',data:null})},cycloneProvider:{get:async()=>({schemaVersion:1,status:'empty',data:[]}),image:async()=>null}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try {
    for(const path of ['/','/design/review.html','/v1/today','/v1/hazards','/v1/places']) assert.equal((await fetch(origin+path)).status,404);
    assert.equal((await fetch(origin+'/v1/weather')).status,400);
    assert.equal((await fetch(origin+'/v1/weather?mode=live')).status,200);
    assert.equal((await fetch(origin+'/v1/observations')).status,200);
    assert.equal((await (await fetch(origin+'/v1/cyclones')).json()).status,'empty');
    assert.equal((await (await fetch(origin+'/v1/service-health')).json()).currentHazardsIntegrated,false);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
test('release config fails before cloud operations when owner/IDs/API/legal URLs are missing',()=>{
  assert.throws(()=>releaseValues({}),/AMAMI_IOS_BUNDLE_ID/);
  const env={AMAMI_IOS_BUNDLE_ID:'jp.unit.amamilife',AMAMI_ANDROID_PACKAGE:'jp.unit.amamilife',AMAMI_EXPO_OWNER:'unit-test',AMAMI_EAS_PROJECT_ID:'00000000-0000-4000-8000-000000000000',AMAMI_RELEASE_VERSION:'1.0.0',EXPO_PUBLIC_API_BASE_URL:'https://api.amami-life.jp',EXPO_PUBLIC_PRIVACY_URL:'https://amami-life.jp/privacy',EXPO_PUBLIC_SUPPORT_URL:'https://amami-life.jp/support'};
  assert.equal(releaseValues(env).AMAMI_RELEASE_VERSION,'1.0.0');
  for(const key of Object.keys(env)) assert.throws(()=>releaseValues({...env,[key]:''}));
  assert.throws(()=>releaseValues({...env,EXPO_PUBLIC_API_BASE_URL:'http://localhost:4837'}));
});

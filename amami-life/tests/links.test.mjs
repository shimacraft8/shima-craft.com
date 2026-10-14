import test from 'node:test';
import assert from 'node:assert/strict';
import { LINKS, officialUrlAllowed } from '../packages/core/src/index.ts';
test('all published official links including tourism can open; lookalike/unsecured/credential URLs cannot',()=>{
  for(const link of LINKS) assert.equal(officialUrlAllowed(link.url),true,link.id);
  assert.equal(officialUrlAllowed('https://www.amami-tourism.org/scenic-spots/'),true);
  for(const value of ['http://www.amami-tourism.org/scenic-spots/','https://www.amami-tourism.org.evil.org/','https://user:pass@www.jma.go.jp/','javascript:alert(1)','https://www.jma.go.jp:8443/']) assert.equal(officialUrlAllowed(value),false);
});

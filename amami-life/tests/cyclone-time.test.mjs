import test from 'node:test';
import assert from 'node:assert/strict';
import {cycloneTime} from '../packages/core/src/usage.ts';
test('current label always carries the official report time rather than the viewing time',()=>{
 const label=cycloneTime('2026-10-21T03:00:00Z',0);assert.equal(label.label,'現在');assert.equal(label.time,'12:00時点');assert.equal(label.asOf,'10/21 12:00時点');
});
test('saved positions cannot be labelled current',()=>assert.equal(cycloneTime('2026-10-21T03:00:00Z',0,true).label,'保存'));
test('forecast labels retain JST day and date across UTC midnight and year boundaries',()=>{
 assert.deepEqual(cycloneTime('2026-12-31T15:00:00Z',12),{label:'1/1',time:'00:00',asOf:'1/1 00:00予報'});
 assert.equal(cycloneTime('2026-10-21T15:00:00Z',12).label,'10/22');
});
test('missing or malformed times and forecast horizons have no fabricated timestamp',()=>{
 for(const [at,hours] of [['invalid',0],['2026-10-21',-1],['2026-10-21',NaN],['2026-10-21',1.2]])assert.equal(cycloneTime(at,hours),null);
});

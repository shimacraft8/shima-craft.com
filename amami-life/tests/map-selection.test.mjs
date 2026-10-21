import test from 'node:test';
import assert from 'node:assert/strict';
import { validSkyPoint, viewportRay, moonForDate } from '../packages/core/src/usage.ts';
import { solarForDate } from '../packages/core/src/index.ts';
test('point picking accepts Amami and surrounding waters but rejects invalid and out-of-scope coordinates',()=>{
 assert.equal(validSkyPoint(28.31667,129.53333),true);assert.equal(validSkyPoint(28.1,129.2),true);
 for(const [lat,lon] of [[NaN,129],[28,Infinity],[0,0],[35,139],[28,128],[91,129]])assert.equal(validSkyPoint(lat,lon),false);
});
test('direction rays end at the current viewport edge, at all zoom-independent sizes and compass quadrants',()=>{
 for(const [w,h] of [[320,340],[480,360],[1100,600]]) for(const angle of [0,90,180,270,45,135,225,315,102,259]) {
  const origin={x:w/2,y:h/2},end=viewportRay(origin,w,h,angle);
  assert.ok(end.x>=11.999 && end.x<=w-11.999);assert.ok(end.y>=11.999 && end.y<=h-11.999);
  assert.ok(Math.min(Math.abs(end.x-12),Math.abs(end.x-(w-12)),Math.abs(end.y-12),Math.abs(end.y-(h-12)))<1e-6);
  const bearing=(Math.atan2(end.x-origin.x,origin.y-end.y)*180/Math.PI+360)%360;assert.ok(Math.abs(bearing-angle)<1e-6);
 }
 assert.equal(viewportRay({x:-1,y:100},400,400,90),null);assert.equal(viewportRay({x:100,y:100},400,400,NaN),null);
});
test('changing the calculation point/date changes the actual local sun and moon results',()=>{
 const a=solarForDate('2026-10-21',28.31667,129.53333),b=solarForDate('2026-10-21',28.8,130.1);assert.notDeepEqual(a,b);
 const c=moonForDate('2026-10-21',28.31667,129.53333),d=moonForDate('2026-10-21',28.8,130.1);assert.notDeepEqual(c,d);
 assert.notDeepEqual(c,moonForDate('2026-10-22',28.31667,129.53333));
});
test('picking or panning to a viewport edge never produces infinite endpoints',()=>{
 for(const origin of [{x:0,y:0},{x:320,y:340},{x:5,y:200},{x:315,y:6},{x:160,y:1}]) for(const angle of [0,45,90,135,180,225,270,315]) {
  const end=viewportRay(origin,320,340,angle);if(!end)continue;
  assert.ok(Number.isFinite(end.x)&&Number.isFinite(end.y));assert.ok(end.x>=-1e-9&&end.x<=320+1e-9);assert.ok(end.y>=-1e-9&&end.y<=340+1e-9);
 }
 assert.equal(viewportRay({x:0,y:200},320,340,270),null);
});

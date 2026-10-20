import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = await readFile(new URL('../web/shimacraft.js', import.meta.url), 'utf8');
function preview(reduced = false, supported = true) {
  const events = new Map(), preferenceEvents = new Map(), animations = [];
  const preference = { matches: reduced, addEventListener: (name, fn) => preferenceEvents.set(name, fn) };
  const content = supported ? { animate(frames, options) {
    const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
    animations.push(animation);
    return animation;
  } } : {};
  const inert = { addEventListener() {}, focus() {}, showModal() {} };
  runInNewContext(script, {
    window: { matchMedia: () => preference },
    document: {
      getElementById: (id) => id === 'content' ? content : inert,
      querySelectorAll: () => [],
      addEventListener: (name, fn) => events.set(name, fn),
    },
  });
  return {
    animations,
    render: (pageChanged) => events.get('amami:view-rendered')({ detail: { pageChanged } }),
    reduce: () => { preference.matches = true; preferenceEvents.get('change')(); },
  };
}
test('weather refreshes and filter changes do not replay page motion', () => {
  const page = preview();
  page.render(false);
  page.render(false);
  assert.equal(page.animations.length, 0);
});
test('deliberate navigation settles briefly without hiding information', () => {
  const page = preview();
  page.render(true);
  assert.equal(page.animations.length, 1);
  assert.ok(page.animations[0].options.duration <= 300);
  assert.ok(page.animations[0].frames.every((frame) => !('opacity' in frame)));
});
test('rapid navigation cancels the previous transition', () => {
  const page = preview();
  page.render(true);
  page.render(true);
  assert.equal(page.animations[0].cancelled, true);
  assert.equal(page.animations[1].cancelled, false);
});
test('reduced motion suppresses navigation motion and cancels one in progress', () => {
  const reduced = preview(true);
  reduced.render(true);
  assert.equal(reduced.animations.length, 0);
  const page = preview();
  page.render(true);
  page.reduce();
  assert.equal(page.animations[0].cancelled, true);
  page.render(true);
  assert.equal(page.animations.length, 1);
});
test('unsupported animation API leaves navigation usable', () => {
  const page = preview(false, false);
  assert.doesNotThrow(() => page.render(true));
  assert.equal(page.animations.length, 0);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createWindowManager } = require("../src/core/window-manager.js");
const { viewport } = require("./helpers/fixtures.js");

const geometry = {
  alpha: { w: 400, h: 300, x: 50, y: 40 },
  beta: { w: 600, h: 500, x: 100, y: 80 }
};

function manager(size) {
  return createWindowManager({ geometry, viewport: viewport(...(size || [])) });
}

test("a fresh desktop has nothing open", () => {
  const wm = manager();
  const s = wm.empty();
  assert.equal(wm.isOpen(s, "alpha"), false);
  assert.equal(wm.anyOpen(s), false);
});

test("opening a window places it at its default position, in front", () => {
  const wm = manager();
  const s = wm.open(wm.empty(), "alpha");
  assert.equal(wm.isOpen(s, "alpha"), true);
  assert.deepEqual(
    { x: wm.get(s, "alpha").x, y: wm.get(s, "alpha").y },
    { x: 50, y: 40 }
  );
  assert.equal(wm.get(s, "alpha").z, s.top);
});

test("re-opening a moved window keeps where the visitor put it", () => {
  const wm = manager();
  let s = wm.open(wm.empty(), "alpha");
  s = wm.dragTo(s, "alpha", 300, 200);
  s = wm.close(s, "alpha");
  s = wm.open(s, "alpha");
  assert.deepEqual({ x: wm.get(s, "alpha").x, y: wm.get(s, "alpha").y }, { x: 300, y: 200 });
});

test("opening raises above whatever was in front", () => {
  const wm = manager();
  let s = wm.open(wm.empty(), "alpha");
  s = wm.open(s, "beta");
  assert.ok(wm.get(s, "beta").z > wm.get(s, "alpha").z);

  s = wm.bringFront(s, "alpha");
  assert.ok(wm.get(s, "alpha").z > wm.get(s, "beta").z);
});

test("bringing the frontmost window forward is a no-op", () => {
  const wm = manager();
  const s = wm.open(wm.empty(), "alpha");
  assert.equal(wm.bringFront(s, "alpha"), null);
});

test("transitions never mutate the state they were given", () => {
  const wm = manager();
  const before = wm.open(wm.empty(), "alpha");
  const snapshot = JSON.stringify(before);
  wm.close(before, "alpha");
  wm.dragTo(before, "alpha", 10, 10);
  wm.closeAll(before);
  wm.tidy(before);
  assert.equal(JSON.stringify(before), snapshot);
});

test("close all closes every window but remembers their positions", () => {
  const wm = manager();
  let s = wm.open(wm.empty(), "alpha");
  s = wm.dragTo(s, "alpha", 222, 111);
  s = wm.open(s, "beta");
  s = wm.closeAll(s);
  assert.equal(wm.anyOpen(s), false);
  assert.equal(wm.get(s, "alpha").x, 222);
});

test("clean up returns windows to their default frames", () => {
  const wm = manager();
  let s = wm.open(wm.empty(), "alpha");
  s = wm.dragTo(s, "alpha", 500, 400);
  s = wm.tidy(s);
  assert.deepEqual({ x: wm.get(s, "alpha").x, y: wm.get(s, "alpha").y }, { x: 50, y: 40 });
});

test("a window is never taller than the stage", () => {
  const wm = manager([1440, 300]); // 300 - 28px menu bar = 272 of stage
  const frame = wm.frame(wm.open(wm.empty(), "beta"), "beta");
  assert.ok(frame.h <= 272 - 24, `expected a clamped height, got ${frame.h}`);
});

test("a window is never wider than the viewport", () => {
  const wm = manager([420, 900]);
  const frame = wm.frame(wm.open(wm.empty(), "beta"), "beta");
  assert.equal(frame.w, 420 - 24);
});

test("shrinking the viewport pulls windows back on screen", () => {
  let width = 1440;
  const wm = createWindowManager({
    geometry,
    viewport: { width: () => width, height: () => 900 }
  });

  let s = wm.dragTo(wm.open(wm.empty(), "alpha"), "alpha", 900, 400);
  width = 600;
  s = wm.reflow(s);
  assert.ok(wm.get(s, "alpha").x <= 600 - 400 - 24, "window should be pulled left");
});

test("dragging cannot push a window fully off screen", () => {
  const wm = manager();
  let s = wm.open(wm.empty(), "alpha");

  s = wm.dragTo(s, "alpha", -9999, -9999);
  assert.equal(wm.get(s, "alpha").x, -400 + 120);
  assert.equal(wm.get(s, "alpha").y, 0);

  s = wm.dragTo(s, "alpha", 99999, 99999);
  assert.equal(wm.get(s, "alpha").x, 1440 - 90);
});

test("an unregistered window id fails loudly", () => {
  const wm = manager();
  assert.throws(() => wm.open(wm.empty(), "nope"), /no geometry registered/);
});

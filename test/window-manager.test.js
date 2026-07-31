"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createWindowManager } = require("../src/core/window-manager.js");
const tokens = require("../src/design/tokens.js");
const { viewport } = require("./helpers/fixtures.js");

const geometry = {
  alpha: { w: 400, h: 300, x: 50, y: 40 },
  beta: { w: 600, h: 500, x: 100, y: 80 }
};

/** The default 1440×900 stage, less the menu bar. */
const STAGE_HEIGHT = 900 - tokens.layout.menuBarHeight;

function manager(size) {
  return createWindowManager({ geometry, viewport: viewport(...(size || [])) });
}

/** A manager over a viewport the test can change under it. */
function growable(size) {
  const at = size;
  return {
    at,
    wm: createWindowManager({
      geometry,
      viewport: { width: () => at.width, height: () => at.height }
    })
  };
}

const size = (frame) => ({ w: frame.w, h: frame.h });
const box = (frame) => ({ x: frame.x, y: frame.y, w: frame.w, h: frame.h });

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
  wm.resizeTo(before, "alpha", 700, 600);
  wm.toggleZoom(before, "alpha");
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

/* -------------------------------------------------------------------- resize */

test("resizing a window changes the size it renders at", () => {
  const wm = manager();
  const s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 700, 620);
  assert.deepEqual(size(wm.frame(s, "alpha")), { w: 700, h: 620 });
});

test("a window cannot be resized down to nothing", () => {
  const wm = manager();
  const s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 10, 10);
  assert.deepEqual(size(wm.frame(s, "alpha")), {
    w: tokens.layout.minWindowWidth,
    h: tokens.layout.minWindowHeight
  });
});

test("resizing stops at the edge of the stage", () => {
  const wm = manager(); // alpha opens at 50,40
  const s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 9999, 9999);
  assert.deepEqual(size(wm.frame(s, "alpha")), { w: 1440 - 50, h: STAGE_HEIGHT - 40 });
});

test("a resized window comes back the size the visitor left it", () => {
  const wm = manager();
  let s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 640, 500);
  s = wm.open(wm.close(s, "alpha"), "alpha");
  assert.deepEqual(size(wm.frame(s, "alpha")), { w: 640, h: 500 });
});

test("the drag limit follows the size the window is now", () => {
  const wm = manager();
  let s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 800, 400);
  s = wm.dragTo(s, "alpha", -9999, -9999);
  assert.equal(wm.get(s, "alpha").x, -800 + 120);
});

test("a window resized past a shrinking viewport is trimmed, then given it back", () => {
  const { at, wm } = growable({ width: 1440, height: 900 });
  let s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 900, 700);

  at.width = 600;
  s = wm.reflow(s);
  assert.equal(wm.frame(s, "alpha").w, 600, "it should not overhang a narrow viewport");

  at.width = 1440;
  assert.equal(wm.frame(s, "alpha").w, 900, "the visitor's size survives the detour");
});

/* ---------------------------------------------------------------------- zoom */

test("zooming fills the stage, and zooming again restores the old frame", () => {
  const wm = manager();
  let s = wm.dragTo(wm.open(wm.empty(), "alpha"), "alpha", 120, 90);

  s = wm.toggleZoom(s, "alpha");
  assert.deepEqual(box(wm.frame(s, "alpha")), { x: 0, y: 0, w: 1440, h: STAGE_HEIGHT });
  assert.equal(wm.frame(s, "alpha").zoomed, true);

  s = wm.toggleZoom(s, "alpha");
  assert.deepEqual(box(wm.frame(s, "alpha")), { x: 120, y: 90, w: 400, h: 300 });
  assert.equal(wm.frame(s, "alpha").zoomed, false);
});

test("unzooming gives back a size the window was resized to, not its default", () => {
  const wm = manager();
  let s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 700, 620);
  s = wm.toggleZoom(s, "alpha");
  s = wm.toggleZoom(s, "alpha");
  assert.deepEqual(size(wm.frame(s, "alpha")), { w: 700, h: 620 });
});

test("a zoomed window has nowhere left to be dragged", () => {
  const wm = manager();
  let s = wm.toggleZoom(wm.open(wm.empty(), "alpha"), "alpha");
  s = wm.dragTo(s, "alpha", 400, 300);
  assert.deepEqual(box(wm.frame(s, "alpha")), { x: 0, y: 0, w: 1440, h: STAGE_HEIGHT });
});

test("resizing a zoomed window takes it out of zoom", () => {
  const wm = manager();
  let s = wm.toggleZoom(wm.open(wm.empty(), "alpha"), "alpha");
  s = wm.resizeTo(s, "alpha", 500, 400);
  const frame = wm.frame(s, "alpha");
  assert.equal(frame.zoomed, false);
  assert.deepEqual(size(frame), { w: 500, h: 400 });
});

test("a zoomed window keeps filling the stage when the viewport changes", () => {
  const { at, wm } = growable({ width: 1440, height: 900 });
  let s = wm.toggleZoom(wm.open(wm.empty(), "beta"), "beta");

  at.width = 1000;
  at.height = 700;
  s = wm.reflow(s);

  assert.deepEqual(box(wm.frame(s, "beta")), {
    x: 0,
    y: 0,
    w: 1000,
    h: 700 - tokens.layout.menuBarHeight
  });
});

test("a zoomed window stays zoomed when it is closed and opened again", () => {
  const wm = manager();
  let s = wm.toggleZoom(wm.open(wm.empty(), "alpha"), "alpha");
  s = wm.open(wm.close(s, "alpha"), "alpha");
  assert.equal(wm.frame(s, "alpha").zoomed, true);
});

test("clean up puts a resized, zoomed window back to its default frame", () => {
  const wm = manager();
  let s = wm.resizeTo(wm.open(wm.empty(), "alpha"), "alpha", 800, 700);
  s = wm.toggleZoom(s, "alpha");
  s = wm.tidy(s);

  const frame = wm.frame(s, "alpha");
  assert.deepEqual(box(frame), { x: 50, y: 40, w: 400, h: 300 });
  assert.equal(frame.zoomed, false);
});

test("resizing or zooming a window that was never opened is a no-op", () => {
  const wm = manager();
  const empty = wm.empty();
  assert.deepEqual(wm.resizeTo(empty, "alpha", 500, 400), empty);
  assert.deepEqual(wm.toggleZoom(empty, "alpha"), empty);
});

test("an unregistered window id fails loudly", () => {
  const wm = manager();
  assert.throws(() => wm.open(wm.empty(), "nope"), /no geometry registered/);
});

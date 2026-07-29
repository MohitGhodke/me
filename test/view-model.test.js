"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { content, buildVals, windowManager } = require("./helpers/fixtures.js");

test("every registered window gets an entry, open or not", () => {
  const vals = buildVals();
  content.windows.forEach((w) => {
    assert.ok(vals.w[w.id], `no view entry for window "${w.id}"`);
    assert.equal(vals.w[w.id].open, false);
    assert.equal(vals.w[w.id].style, "", "a closed window needs no frame style");
  });
});

test("an open window is given a positioned frame", () => {
  const wm = windowManager();
  const vals = buildVals({ wm, state: wm.open(wm.empty(), "resume") });
  assert.equal(vals.w.resume.open, true);
  assert.match(vals.w.resume.style, /position:absolute/);
  assert.match(vals.w.resume.style, /left:\d+px/);
});

test("on mobile a window fills the stage instead of floating", () => {
  const wm = windowManager();
  const vals = buildVals({ wm, state: wm.open(wm.empty(), "resume"), isMobile: true });
  assert.match(vals.w.resume.style, /inset:0/);
  assert.doesNotMatch(vals.w.resume.style, /left:\d+px/);
});

test("only the open menu is marked open", () => {
  const vals = buildVals({ openMenu: "file" });
  const open = vals.menus.filter((m) => m.open).map((m) => m.id);
  assert.deepEqual(open, ["file"]);
});

test("commands that need a window are greyed out until one is open", () => {
  const closeAll = () =>
    buildVals().menus.find((m) => m.id === "file").items.find((i) => i.act === "closeall");
  assert.equal(closeAll().disabled, true);
  assert.match(closeAll().style, /pointer-events:none/);

  const wm = windowManager();
  const withWindow = buildVals({ wm, state: wm.open(wm.empty(), "about") });
  const item = withWindow.menus.find((m) => m.id === "file").items.find((i) => i.act === "closeall");
  assert.equal(item.disabled, false);
  assert.doesNotMatch(item.style, /pointer-events:none/);
});

test("the View menu ticks whichever view is showing", () => {
  const tickFor = (view, act) =>
    buildVals({ view }).menus.find((m) => m.id === "view").items.find((i) => i.act === act).tick;

  assert.equal(tickFor("icons", "view:icons"), "✓");
  assert.equal(tickFor("icons", "view:list"), "");
  assert.equal(tickFor("list", "view:list"), "✓");
});

test("menu items resolve their link and their shortcut", () => {
  const vals = buildVals();
  const github = vals.menus.find((m) => m.id === "special").items.find((i) => i.linkId === undefined || i.act === "link");
  assert.match(github.href, /^https:\/\//);

  const openResume = vals.menus.find((m) => m.id === "file").items.find((i) => i.act === "resume");
  assert.equal(openResume.shortcut, "⌘R");
  assert.equal(openResume.hasShortcut, true);
});

test("separators carry no command", () => {
  const vals = buildVals();
  const separators = vals.menus.flatMap((m) => m.items).filter((i) => i.isSeparator);
  assert.ok(separators.length > 0);
  separators.forEach((sep) => assert.equal(sep.isItem, false));
});

test("desktop icons follow the registry, one kind flag each", () => {
  const vals = buildVals();
  assert.equal(vals.icons.length, content.desktopIcons.length);
  vals.icons.forEach((icon) => {
    const flags = [icon.isFolder, icon.isDoc, icon.isApp].filter(Boolean);
    assert.equal(flags.length, 1, `${icon.id} should have exactly one icon kind`);
  });
});

test("icon and file counts are pluralised from the content", () => {
  const vals = buildVals();
  assert.equal(vals.counts.work, content.projects.length + " items");
  assert.equal(vals.counts.desktop, content.desktopIcons.length + " items");
});

test("the case-study window follows the selected project", () => {
  assert.equal(buildVals({ projectIndex: 2 }).proj.file, content.projects[2].file);
});

test("an out-of-range project index falls back to the first case", () => {
  assert.equal(buildVals({ projectIndex: 99 }).proj.file, content.projects[0].file);
});

test("icons and list view are mutually exclusive, and neither shows on mobile", () => {
  assert.deepEqual(
    [buildVals({ view: "icons" }).viewIcons, buildVals({ view: "icons" }).viewList],
    [true, false]
  );
  const mobile = buildVals({ isMobile: true });
  assert.deepEqual([mobile.viewIcons, mobile.viewList, mobile.isDesktop], [false, false, false]);
});

test("style strings are well-formed CSS declarations", () => {
  const vals = buildVals();
  Object.entries(vals.s).forEach(([name, css]) => {
    assert.equal(typeof css, "string", `${name} should be a string`);
    assert.ok(css.trim().endsWith(";"), `${name} must end with ";" so it can be concatenated`);
    css
      .split(";")
      .filter((d) => d.trim())
      .forEach((decl) => assert.ok(decl.includes(":"), `${name} has a malformed declaration: ${decl}`));
  });
});

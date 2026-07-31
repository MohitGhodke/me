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

test("a zoomed window loses the rounding and the shadow it has nothing to cast on", () => {
  const wm = windowManager();
  const open = wm.open(wm.empty(), "resume");

  const floating = buildVals({ wm, state: open }).w.resume.style;
  assert.match(floating, /box-shadow/);

  const zoomed = buildVals({ wm, state: wm.toggleZoom(open, "resume") }).w.resume.style;
  assert.doesNotMatch(zoomed, /box-shadow/);
  assert.doesNotMatch(zoomed, /border-radius/);
  assert.match(zoomed, /left:0px;top:0px/);
});

test("the zoom box says which way it will go", () => {
  const wm = windowManager();
  const open = wm.open(wm.empty(), "resume");

  assert.equal(buildVals({ wm, state: open }).w.resume.zoomed, false);
  assert.match(buildVals({ wm, state: open }).w.resume.zoomLabel, /^Zoom /);

  const zoomed = buildVals({ wm, state: wm.toggleZoom(open, "resume") }).w.resume;
  assert.equal(zoomed.zoomed, true);
  assert.match(zoomed.zoomLabel, /^Restore /);
});

test("the zoom box and the resize grip collapse on mobile", () => {
  const wm = windowManager();
  const state = wm.open(wm.empty(), "resume");

  const desktop = buildVals({ wm, state }).w.resume;
  assert.match(desktop.gripStyle, /cursor:nwse-resize/);
  assert.match(desktop.zoomStyle, /cursor:pointer/);

  const mobile = buildVals({ wm, state, isMobile: true }).w.resume;
  assert.equal(mobile.gripStyle, "display:none;");
  assert.equal(mobile.zoomStyle, "display:none;");
});

test("the handles a finger drags claim the gesture from the browser", () => {
  const wm = windowManager();
  const state = wm.open(wm.empty(), "resume");
  const vals = buildVals({ wm, state });

  // Without this the browser pans the page and the pointermoves stop coming.
  assert.match(vals.w.resume.chromeStyle, /touch-action:none/);
  assert.match(vals.w.resume.gripStyle, /touch-action:none/);

  // A window fills the stage on mobile, so its bar is not a drag handle — and
  // the same builder draws the mobile list's header, which has to scroll.
  const mobile = buildVals({ wm, state, isMobile: true });
  assert.doesNotMatch(mobile.w.resume.chromeStyle, /touch-action/);
  assert.doesNotMatch(vals.s.chromeBar, /touch-action/);
});

test("an item only offers a source link when it has a repo", () => {
  // Every extension is public, so every one of them links out.
  content.extensions.forEach((_, i) => {
    const shipped = buildVals({ item: { list: "extensions", index: i } }).proj;
    assert.equal(shipped.hasRepo, true, `extensions[${i}] should link to its repo`);
    assert.match(shipped.repo, /^https:\/\//);
  });

  // Anything that does not resolve offers no button rather than a dead one.
  const blank = buildVals({ item: { list: "projects", index: 0 } }).proj;
  assert.equal(blank.hasRepo, false);
  assert.equal(blank.repo, "");
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

test("on a phone the menu bar keeps the name and nothing else", () => {
  const phone = buildVals({ isMobile: true, isPhone: true });
  assert.deepEqual(phone.menus, [], "no room for five titles on a 390px bar");
  assert.equal(phone.showClock, false);
  assert.equal(phone.barName, "Mohit");

  // A tablet is mobile but not a phone: it still gets the whole bar.
  const tablet = buildVals({ isMobile: true });
  assert.equal(tablet.menus.length, content.desktop.menus.length);
  assert.equal(tablet.showClock, true);
  assert.equal(tablet.barName, content.site.name);
});

test("every window a phone loses a menu for is still a row in the list", () => {
  // What the empty menu bar is allowed to cost: chrome, never a destination.
  const opens = new Set(content.desktop.menus.flatMap((m) => m.items).map((i) => i.act));
  const reachable = new Set(content.desktopIcons.map((w) => w.id));
  content.windows
    .filter((w) => opens.has(w.id) && !w.parent)
    .forEach((w) =>
      assert.ok(reachable.has(w.id), `"${w.id}" would be unreachable on a phone`)
    );
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
  const items = (n) => `${n} item${n === 1 ? "" : "s"}`;
  // Work holds its case studies plus the folders nested inside it.
  assert.equal(vals.counts.work, items(vals.workItems.length));
  assert.equal(vals.counts.desktop, items(content.desktopIcons.length));
  assert.equal(vals.counts.extensions, items(content.extensions.length));
});

test("the detail window follows the selected item", () => {
  content.extensions.forEach((x, i) => {
    assert.equal(buildVals({ item: { list: "extensions", index: i } }).proj.file, x.file);
  });
});

test("an item that cannot be resolved renders blank instead of throwing", () => {
  // `proj` is built on every render, open or not, so none of these may throw —
  // including the default state pointing at a collection with nothing in it.
  const cases = [
    { list: "extensions", index: 99 },
    { list: "projects", index: 0 },   // no case studies written yet
    { list: "nope", index: 0 },       // a collection that does not exist
    undefined
  ];

  for (const item of cases) {
    const proj = buildVals({ item }).proj;
    assert.equal(typeof proj.file, "string", `${JSON.stringify(item)} should still build`);
    assert.ok(Array.isArray(proj.outcomes), "outcomes must stay loopable");
    assert.ok(Array.isArray(proj.tags), "tags must stay loopable");
  }

  // An out-of-range index within a populated collection still shows something.
  assert.equal(
    buildVals({ item: { list: "extensions", index: 99 } }).proj.file,
    content.extensions[0].file
  );
});

test("the Work folder lists its nested folders first, then its case studies", () => {
  const vals = buildVals();
  const nested = content.windows.filter((w) => w.parent === "work");
  assert.notEqual(nested.length, 0, "the extensions folder should be nested in Work");

  const folders = vals.workItems.filter((r) => r.isFolder);
  const files = vals.workItems.filter((r) => r.isFile);

  assert.deepEqual(folders.map((r) => r.app), nested.map((w) => w.id));
  assert.deepEqual(folders.map((r) => r.label), nested.map((w) => w.title));
  assert.deepEqual(files.map((r) => r.ref), content.projects.map((_, i) => `projects:${i}`));

  // Folders come before files, and every row is exactly one of the two.
  assert.deepEqual(
    vals.workItems.map((r) => r.isFolder),
    [...folders.map(() => true), ...files.map(() => false)]
  );
  vals.workItems.forEach((r) => assert.notEqual(r.isFolder, r.isFile));

  // The strip counts what the grid shows, nested folder included.
  const shown = nested.length + content.projects.length;
  assert.equal(vals.counts.work, `${shown} item${shown === 1 ? "" : "s"}`);
});

test("the extensions folder holds only files, tagged with their collection", () => {
  const vals = buildVals();

  assert.deepEqual(
    vals.extensionItems.map((r) => r.label),
    content.extensions.map((x) => x.file)
  );
  assert.deepEqual(
    vals.extensionItems.map((r) => r.ref),
    content.extensions.map((_, i) => `extensions:${i}`)
  );
  assert.ok(vals.extensionItems.every((r) => r.isFile), "nothing is nested inside it yet");
  assert.equal(vals.counts.extensions, `${content.extensions.length} items`);
});

test("the iOS Apps folder holds its apps, tagged with their collection", () => {
  const vals = buildVals();

  assert.deepEqual(
    vals.appItems.map((r) => r.label),
    content.apps.map((a) => a.file)
  );
  assert.deepEqual(
    vals.appItems.map((r) => r.ref),
    content.apps.map((_, i) => `apps:${i}`)
  );
  assert.ok(vals.appItems.every((r) => r.isFile), "nothing is nested inside it yet");
});

test("every nested folder is reachable only through Work", () => {
  const onDesktop = buildVals().icons.map((i) => i.id);
  const nested = content.windows.filter((w) => w.parent === "work").map((w) => w.id);

  assert.deepEqual(nested, ["extensions", "apps"], "both folders should be nested in Work");
  nested.forEach((id) =>
    assert.ok(!onDesktop.includes(id), `"${id}" should not have a desktop icon`)
  );
  assert.ok(onDesktop.includes("work"), "Work is what the visitor opens first");
});

test("every role renders its stack as one line, description only when there is one", () => {
  const vals = buildVals();
  assert.equal(vals.resumeRoles.length, content.resume.roles.length);

  vals.resumeRoles.forEach((role, i) => {
    const source = content.resume.roles[i];
    assert.equal(role.stackLine, source.stack.join(" · "), "the stack should read as one line");
    source.stack.forEach((tech) =>
      assert.ok(role.stackLine.includes(tech), `"${tech}" missing from the role line`)
    );
    assert.equal(role.hasDescription, !!source.description);
    if (!source.description) {
      assert.equal(role.description, "", "no description means nothing to render");
    }
  });
});

test("every résumé section opens a real window and carries printable detail", () => {
  const vals = buildVals();
  const windowIds = content.windows.map((w) => w.id);

  assert.notEqual(vals.resumeSections.length, 0, "the résumé should have sections");

  vals.resumeSections.forEach((sec) => {
    assert.ok(windowIds.includes(sec.window), `"${sec.window}" is not a window`);
    assert.ok(sec.label && sec.summary, "a section needs a label and a summary");
    assert.match(sec.openLabel, /^Open .+ →$/);

    // Every detail row is the same shape, which is what lets one loop render it.
    assert.notEqual(sec.detail.length, 0, `"${sec.label}" prints nothing`);
    sec.detail.forEach((row) => {
      assert.equal(typeof row.text, "string");
      assert.ok(row.text.trim(), "a printed row must carry text");
      assert.equal(row.hasHeading, !!row.heading);
    });
  });
});

test("the printed résumé carries what its windows show, not a second copy", () => {
  const vals = buildVals();
  const textOf = (label) =>
    vals.resumeSections.find((s) => s.label === label).detail.map((r) => r.heading + " " + r.text).join("\n");

  // Skills: every group heading and every chip has to survive into the PDF.
  const skills = textOf("Skills");
  content.skills.groups.forEach((g) => {
    assert.ok(skills.includes(g.heading), `"${g.heading}" missing from the printed résumé`);
    g.items.forEach((item) =>
      assert.ok(skills.includes(item), `skill "${item}" missing from the printed résumé`)
    );
    if (g.note) assert.ok(skills.includes(g.note), `the ${g.heading} note is missing`);
  });

  // Work: every extension and app, by title and summary.
  const work = textOf("Selected work");
  content.extensions.concat(content.apps).forEach((p) => {
    assert.ok(work.includes(p.title), `"${p.title}" missing from the printed résumé`);
    assert.ok(work.includes(p.summary), `the summary for "${p.title}" is missing`);
  });
});

test("each collection resolves through the one detail window", () => {
  // The folders differ; the window they open does not.
  for (const [list, items] of [["extensions", content.extensions], ["apps", content.apps]]) {
    items.forEach((item, i) => {
      const proj = buildVals({ item: { list, index: i } }).proj;
      assert.equal(proj.file, item.file, `${list}:${i} should render its own file`);
      assert.equal(proj.title, item.title);
      assert.deepEqual(proj.tags, item.tags);
    });
  }
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

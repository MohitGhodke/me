/**
 * The content files are meant to be edited by hand, so the validator is the
 * safety net: these tests prove it actually catches a malformed edit rather
 * than letting a half-empty window ship.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { content, validate, assemble } = require("../src/content/index.js");

/** A deep copy of the real content, ready to be broken on purpose. */
function mutate(fn) {
  const parts = {
    site: structuredClone(content.site),
    resume: structuredClone(content.resume),
    projects: structuredClone(content.projects),
    about: structuredClone(content.about),
    skills: structuredClone(content.skills),
    playground: structuredClone(content.playground),
    contact: structuredClone(content.contact),
    desktop: structuredClone(content.desktop)
  };
  fn(parts);
  return validate(assemble(parts));
}

test("the shipped content passes validation", () => {
  assert.deepEqual(content.problems, []);
});

test("a missing field is reported with its path", () => {
  const problems = mutate((c) => { delete c.projects[1].summary; });
  assert.ok(problems.some((p) => p.includes("projects[1]") && p.includes("summary")), problems.join("; "));
});

test("an empty string counts as missing", () => {
  const problems = mutate((c) => { c.site.email = "   "; });
  assert.ok(problems.some((p) => p.includes("site") && p.includes("email")));
});

test("outcomes and tags must be lists of strings", () => {
  const problems = mutate((c) => { c.projects[0].tags = "Go, Kafka"; });
  assert.ok(problems.some((p) => p.includes("projects[0].tags")));
});

test("a skill group with an unknown kind is rejected", () => {
  const problems = mutate((c) => { c.skills.groups[0].kind = "table"; });
  assert.ok(problems.some((p) => p.includes("skills.groups[0].kind")));
});

test("two windows may not share an id", () => {
  const problems = mutate((c) => { c.desktop.windows[1].id = c.desktop.windows[0].id; });
  assert.ok(problems.some((p) => p.includes("duplicate id")));
});

test("a window needs a complete default frame", () => {
  const problems = mutate((c) => { delete c.desktop.windows[0].geometry.h; });
  assert.ok(problems.some((p) => p.includes("geometry")));
});

test("a menu item cannot point at a link that does not exist", () => {
  const problems = mutate((c) => {
    c.desktop.menus[4].items[0].linkId = "mastodon";
  });
  assert.ok(problems.some((p) => p.includes("unknown link")), problems.join("; "));
});

test("derived lookups stay in step with the registry", () => {
  assert.deepEqual(Object.keys(content.geometry).sort(), content.windows.map((w) => w.id).sort());
  assert.equal(
    content.desktopIcons.length,
    content.windows.filter((w) => w.icon).length
  );
  content.desktopIcons.forEach((w) => assert.ok(w.meta, `${w.id} needs a meta line for list view`));
});

test("every menu action is one the app can actually run", () => {
  const windowIds = content.windows.map((w) => w.id);
  const builtIn = ["print", "closeall", "cleanup", "copymail", "copylink", "link", "restart", "shutdown"];

  content.desktop.menus.forEach((menu) => {
    menu.items.forEach((item) => {
      if (item.kind === "separator" || item.disabled) return;
      const known =
        windowIds.includes(item.act) ||
        builtIn.includes(item.act) ||
        item.act.startsWith("view:");
      assert.ok(known, `menu "${menu.id}" has an unhandled action: ${item.act}`);
    });
  });
});

test("every shortcut targets a real action", () => {
  const windowIds = content.windows.map((w) => w.id);
  content.desktop.shortcuts.forEach((s) => {
    const known = windowIds.includes(s.action) || ["print", "copymail"].includes(s.action);
    assert.ok(known, `shortcut ${s.key} points at unknown action "${s.action}"`);
  });
});

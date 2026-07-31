/**
 * The content files are meant to be edited by hand, so the validator is the
 * safety net: these tests prove it actually catches a malformed edit rather
 * than letting a half-empty window ship.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { content, validate, assemble } = require("../src/content/index.js");

/** The content files `assemble()` expects — see src/content/index.js. */
const PARTS = [
  "site",
  "resume",
  "projects",
  "extensions",
  "apps",
  "about",
  "skills",
  "playground",
  "assistant",
  "contact",
  "desktop"
];

/** A deep copy of the real content, ready to be broken on purpose. */
function mutate(fn) {
  const parts = {};
  for (const key of PARTS) parts[key] = structuredClone(content[key]);
  fn(parts);
  return validate(assemble(parts));
}

test("the shipped content passes validation", () => {
  assert.deepEqual(content.problems, []);
});

// The canary for every test below: they all mutate a copy built from PARTS, so
// a content file missing from that list makes them fail for the wrong reason.
// This names the real cause instead.
test("the test helper copies every content file the app assembles", () => {
  assert.deepEqual(
    mutate(() => {}),
    [],
    "an untouched copy must validate — add any new content file to PARTS"
  );
});

test("a missing field is reported with its path", () => {
  const problems = mutate((c) => { delete c.extensions[1].summary; });
  assert.ok(problems.some((p) => p.includes("extensions[1]") && p.includes("summary")), problems.join("; "));
});

test("an empty string counts as missing", () => {
  const problems = mutate((c) => { c.site.email = "   "; });
  assert.ok(problems.some((p) => p.includes("site") && p.includes("email")));
});

test("outcomes and tags must be lists of strings", () => {
  const problems = mutate((c) => { c.extensions[0].tags = "TypeScript, MCP"; });
  assert.ok(problems.some((p) => p.includes("extensions[0].tags")));
});

test("having no case studies yet is allowed; an empty extensions folder is not", () => {
  // Work still shows the folders nested inside it, so an empty list is fine.
  assert.deepEqual(mutate((c) => { c.projects.length = 0; }), []);

  // The extensions folder has nothing else in it, so emptying it is a mistake.
  assert.ok(
    mutate((c) => { c.extensions.length = 0; })
      .some((p) => p.includes("extensions must list at least one"))
  );

  // Not a list at all is a mistake either way.
  assert.ok(mutate((c) => { c.projects = null; }).some((p) => p.includes("projects must be a list")));
});

test("a case study added later is held to the same shape", () => {
  const problems = mutate((c) => { c.projects.push({ file: "new.case" }); });
  ["title", "meta", "summary"].forEach((field) =>
    assert.ok(
      problems.some((p) => p.includes("projects[0]") && p.includes(field)),
      `projects[0] should have been flagged for ${field}: ${problems.join("; ")}`
    )
  );
});

test("the ai assistant's consent copy must be a non-empty list", () => {
  assert.ok(
    mutate((c) => { c.assistant.consentLines = []; })
      .some((p) => p.includes("assistant.consentLines"))
  );
  assert.ok(
    mutate((c) => { delete c.assistant.greeting; })
      .some((p) => p.includes("assistant") && p.includes("greeting"))
  );
});

test("a repo link is optional, but must be a real URL when present", () => {
  assert.deepEqual(mutate((c) => { delete c.extensions[0].repo; }), [], "omitting it is fine");

  for (const bad of ["", "  ", "github.com/me/thing", "/repos/thing"]) {
    const problems = mutate((c) => { c.extensions[0].repo = bad; });
    assert.ok(
      problems.some((p) => p.includes("extensions[0].repo")),
      `"${bad}" should have been rejected, got: ${problems.join("; ")}`
    );
  }
});

test("a role needs a stack; its description is optional", () => {
  assert.ok(
    mutate((c) => { delete c.resume.roles[0].stack; })
      .some((p) => p.includes("resume.roles[0].stack")),
    "a role with no technologies should be caught"
  );
  assert.ok(
    mutate((c) => { c.resume.roles[0].stack = "C#, Angular"; })
      .some((p) => p.includes("resume.roles[0].stack")),
    "the stack must be a list, not a string"
  );

  // No role carries a description yet, and that is a valid state.
  assert.deepEqual(mutate(() => {}), []);
  assert.ok(
    mutate((c) => { c.resume.roles[0].description = "  "; })
      .some((p) => p.includes("resume.roles[0].description")),
    "a blank description should be caught rather than rendered empty"
  );
});

test("a résumé section must open a window that exists", () => {
  const problems = mutate((c) => { c.resume.sections[0].window = "writing"; });
  assert.ok(
    problems.some((p) => p.includes("resume.sections[0]") && p.includes("writing")),
    problems.join("; ")
  );

  ["window", "label", "summary"].forEach((field) => {
    assert.ok(
      mutate((c) => { delete c.resume.sections[0][field]; })
        .some((p) => p.includes("resume.sections[0]") && p.includes(field)),
      `a section missing \`${field}\` should be caught`
    );
  });

  // Having none is fine — the résumé just stops offering anywhere to go.
  assert.deepEqual(mutate((c) => { c.resume.sections.length = 0; }), []);
});

test("a skill group with an unknown kind is rejected", () => {
  const problems = mutate((c) => { c.skills.groups[0].kind = "table"; });
  assert.ok(problems.some((p) => p.includes("skills.groups[0].kind")));
});

test("a skill group's note is optional, but not allowed to be blank", () => {
  const noted = content.skills.groups.filter((g) => g.note);
  assert.notEqual(noted.length, 0, "at least one section should explain itself");

  assert.deepEqual(mutate((c) => { delete c.skills.groups[0].note; }), [], "omitting it is fine");

  for (const bad of ["", "   "]) {
    assert.ok(
      mutate((c) => { c.skills.groups[0].note = bad; })
        .some((p) => p.includes("skills.groups[0].note")),
      `"${bad}" should have been rejected`
    );
  }
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
        item.act.startsWith("view:") ||
        item.act.startsWith("theme:");
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

/**
 * The template is the one part of the app the unit tests can't exercise, so it
 * gets a static check instead: every `{{ hole }}` must resolve against either
 * the view model or a member of the component class, and the crawler-visible
 * <head> must agree with content/site.js.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const dc = require("./helpers/dc-template.js");
const { content, buildVals } = require("./helpers/fixtures.js");

const source = dc.readTemplateFile();
const body = dc.templateBody(source);
const script = dc.logicScript(source);

/** Class members (handlers, getters) the template may reference by name. */
function componentMembers(src) {
  const names = new Set();
  const assignment = /^\s{2}(\w+)\s*=/gm;
  const method = /^\s{2}(\w+)\s*\(/gm;
  let m;
  while ((m = assignment.exec(src)) !== null) names.add(m[1]);
  while ((m = method.exec(src)) !== null) names.add(m[1]);
  return names;
}

const members = componentMembers(script);

test("template holes all resolve", () => {
  const vals = buildVals();

  // `sc-for` introduces a local name; resolve each list once and keep a sample
  // item around so `{{ item.field }}` can be checked too.
  const scope = Object.assign(Object.create(null), vals, { $index: 0 });
  for (const loop of dc.loops(body)) {
    const [path] = dc.pathsIn(loop.list);
    const resolved = path ? dc.resolvePath(scope, path) : { ok: false, missingAt: loop.list };
    assert.ok(resolved.ok, `sc-for list="{{ ${loop.list} }}" does not resolve`);
    assert.ok(
      Array.isArray(resolved.value),
      `sc-for list="{{ ${loop.list} }}" is not an array`
    );
    // An empty list (content errors, when there are none) has no sample row to
    // check against, so accept anything the rows reach for.
    scope[loop.as] = resolved.value.length ? resolved.value[0] : anything();
  }

  const failures = [];
  for (const hole of dc.holes(body)) {
    for (const path of dc.pathsIn(hole)) {
      const root = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(path);
      if (root && members.has(root[0]) && !(root[0] in scope)) continue; // handler
      const resolved = dc.resolvePath(scope, path);
      if (!resolved.ok) failures.push(`{{ ${hole} }} — nothing named "${resolved.missingAt}"`);
    }
  }

  assert.deepEqual(failures, [], "unresolved template holes:\n  " + failures.join("\n  "));
});

test("every window in the registry has a template block", () => {
  for (const win of content.windows) {
    assert.match(
      body,
      new RegExp(`\\{\\{\\s*w\\.${win.id}\\.(open|style)\\s*\\}\\}`),
      `window "${win.id}" is registered in content/desktop.js but never rendered`
    );
  }
});

test("static <head> metadata matches content/site.js", () => {
  const head = source.slice(0, source.indexOf("</head>"));
  const meta = content.site.meta;

  assert.match(head, new RegExp("<title>" + escapeRe(meta.title) + "</title>"));
  assert.match(
    head,
    new RegExp('<meta name="description" content="' + escapeRe(meta.description) + '">')
  );
  assert.match(head, new RegExp('content="' + escapeRe(meta.themeColor) + '"'));
  assert.match(source, new RegExp('lang="' + escapeRe(meta.locale) + '"'));
});

test("the noscript fallback still shows a working email address", () => {
  const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(source);
  assert.ok(noscript, "there should be a noscript fallback");
  assert.ok(
    noscript[1].includes(content.site.email),
    "the noscript fallback must carry the address from content/site.js"
  );
});

test("every module the page loads exists on disk", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.join(__dirname, "..");
  const re = /<script src="\.\/([^"]+)"><\/script>/g;
  let m;
  let count = 0;
  while ((m = re.exec(source)) !== null) {
    assert.ok(fs.existsSync(path.join(root, m[1])), `missing script: ${m[1]}`);
    count++;
  }
  assert.ok(count > 5, "expected the page to load the src/ modules");
});

/** A stand-in that claims to have every property, at every depth. */
function anything() {
  const proxy = new Proxy(
    {},
    {
      has: () => true,
      get: () => proxy
    }
  );
  return proxy;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

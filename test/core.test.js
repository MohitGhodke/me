"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createMenuController } = require("../src/core/menu-controller.js");
const shortcuts = require("../src/core/shortcuts.js");
const { copyText } = require("../src/core/clipboard.js");
const system = require("../src/core/system.js");
const { buildContext, matchQuip, asksAboutChirp, framePrompt } = require("../src/core/assistant.js");
const { content } = require("../src/content/index.js");

/* ------------------------------------------------------------------- menus */

const menus = () => createMenuController(["apple", "file", "edit"]);

test("clicking a title opens it, clicking again closes it", () => {
  const m = menus();
  assert.deepEqual(m.toggle(null, "file"), { menu: "file" });
  assert.deepEqual(m.toggle("file", "file"), { menu: null });
});

test("hovering only walks the bar while a menu is already open", () => {
  const m = menus();
  assert.equal(m.hover(null, "edit"), null, "no menu open — hover does nothing");
  assert.deepEqual(m.hover("file", "edit"), { menu: "edit" });
  assert.equal(m.hover("edit", "edit"), null, "already open — no re-render");
});

test("closing an already-closed bar asks for no re-render", () => {
  const m = menus();
  assert.equal(m.close(null), null);
  assert.deepEqual(m.close("file"), { menu: null });
});

test("an unknown menu id fails loudly", () => {
  assert.throws(() => menus().toggle(null, "nope"), /unknown menu/);
});

/* --------------------------------------------------------------- shortcuts */

const bindings = [
  { key: "r", mod: true, action: "resume" },
  { key: "c", mod: true, action: "copymail", requiresNoSelection: true }
];

test("a shortcut needs its modifier", () => {
  assert.equal(shortcuts.match(bindings, { key: "r", mod: true, shift: false }).action, "resume");
  assert.equal(shortcuts.match(bindings, { key: "r", mod: false, shift: false }), null);
});

test("an unbound key matches nothing", () => {
  assert.equal(shortcuts.match(bindings, { key: "q", mod: true, shift: false }), null);
});

test("cmd-C leaves a real selection alone", () => {
  assert.equal(shortcuts.match(bindings, { key: "c", mod: true, shift: false, hasSelection: true }), null);
  assert.equal(
    shortcuts.match(bindings, { key: "c", mod: true, shift: false, hasSelection: false }).action,
    "copymail"
  );
});

test("events are normalised, selection included", () => {
  const pressed = shortcuts.describe({ key: "R", metaKey: true }, "some text");
  assert.deepEqual(pressed, { key: "r", mod: true, shift: false, hasSelection: true });
});

test("shortcut labels follow the platform", () => {
  assert.equal(shortcuts.label({ key: "r", mod: true }, true), "⌘R");
  assert.equal(shortcuts.label({ key: "r", mod: true }, false), "Ctrl+R");
});

/* --------------------------------------------------------------- clipboard */

function fakeEnv(options) {
  const written = [];
  return {
    written,
    env: {
      isSecureContext: options.secure !== false,
      navigator: options.clipboard
        ? {
            clipboard: {
              writeText: (text) => {
                if (options.rejects) return Promise.reject(new Error("denied"));
                written.push(text);
                return Promise.resolve();
              }
            }
          }
        : {},
      document: options.document || null
    }
  };
}

/** Minimal DOM stub covering only what the execCommand fallback touches. */
function fakeDocument(succeeds) {
  const copied = [];
  const body = { appendChild() {} };
  return {
    copied,
    body,
    createElement: () => ({
      style: {},
      setAttribute() {},
      select() {},
      setSelectionRange() {},
      remove() {}
    }),
    execCommand(command) {
      if (command === "copy" && succeeds) copied.push(true);
      return succeeds;
    }
  };
}

test("the async clipboard is used when it is available", async () => {
  const { env, written } = fakeEnv({ clipboard: true });
  assert.equal(await copyText("hello@example.com", env), true);
  assert.deepEqual(written, ["hello@example.com"]);
});

test("a rejected clipboard write falls back rather than lying", async () => {
  const doc = fakeDocument(true);
  const { env } = fakeEnv({ clipboard: true, rejects: true, document: doc });
  assert.equal(await copyText("x", env), true);
  assert.deepEqual(doc.copied, [true], "the fallback should have run");
});

test("copy reports failure when neither path works", async () => {
  const { env } = fakeEnv({ clipboard: true, rejects: true, document: fakeDocument(false) });
  assert.equal(await copyText("x", env), false);
});

test("an insecure origin skips straight to the fallback", async () => {
  const doc = fakeDocument(true);
  const { env, written } = fakeEnv({ clipboard: true, secure: false, document: doc });
  assert.equal(await copyText("x", env), true);
  assert.deepEqual(written, [], "navigator.clipboard must not be used off a secure origin");
});

/* ------------------------------------------------------------------ system */

test("the clock renders hours and minutes", () => {
  const at941 = new Date(2026, 0, 1, 9, 41);
  assert.match(system.formatTime(at941, "en-US"), /9:41/);
});

test("the mobile breakpoint is where the desktop metaphor stops", () => {
  assert.equal(system.isMobileWidth(779), true);
  assert.equal(system.isMobileWidth(780), false);
});

test("the phone breakpoint is where the menu bar runs out of room", () => {
  assert.equal(system.isPhoneWidth(559), true);
  assert.equal(system.isPhoneWidth(560), false);
  // A phone is always mobile; a tablet is mobile without being a phone.
  assert.equal(system.isMobileWidth(559), true);
  assert.equal(system.isPhoneWidth(768), false);
});

test("storage never throws, whatever the browser does", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("SecurityError"); }
  });
  try {
    assert.equal(system.storage.get("k"), null);
    assert.equal(system.storage.set("k", "v"), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});

/* ---------------------------------------------------------------- assistant */

test("buildContext folds the site's own content into the model's system prompt", () => {
  const ctx = buildContext(content);
  assert.ok(ctx.includes(content.site.name), "should mention the site owner by name");
  assert.ok(ctx.includes(content.resume.roles[0].company), "should mention a real employer");
  assert.ok(ctx.includes(content.playground.entries[0].name), "should mention a playground project");
});

test("buildContext stays well under the 1B model's context window", () => {
  // ~4 chars/token is a safe rule of thumb; the model's window is 4096 tokens
  // and has to fit the conversation and the reply too, not just this context.
  assert.ok(buildContext(content).length <= 6000);
});

/* -------------------------------------------------------------- Chirp quips */

const quips = content.assistant.quips;
const first = () => 0; // deterministic reply pick: always the first one

test("a bird dare is answered by the bird, not the model", () => {
  assert.ok(matchQuip("can you chirp?", quips, first), "chirp");
  assert.ok(matchQuip("sing something for me", quips, first), "sing");
  assert.ok(matchQuip("Hello!", quips, first), "greeting, whatever the casing");
});

test("off-topic tasks are turned down locally", () => {
  const reply = matchQuip("if i give you user story to write.. would u do that?", quips, first);
  assert.ok(reply && /mohit/i.test(reply), "should point back at what Chirp is for");
});

test("real questions are left for the model to answer", () => {
  // These share words with the quips ("write", "hi" inside "his") — patterns
  // match whole words and phrases so a genuine question still reaches the model.
  assert.equal(matchQuip("what does he write code in?", quips, first), null);
  assert.equal(matchQuip("what are his skills?", quips, first), null);
  assert.equal(matchQuip("tell me about his iOS apps", quips, first), null);
  assert.equal(matchQuip("", quips, first), null);
});

/* ------------------------------------------------------- who is "you", then */

test('"you" is the bird — unless the question names the human', () => {
  assert.equal(asksAboutChirp("when is your birthday?"), true);
  assert.equal(asksAboutChirp("what do you like?"), true);
  // Naming Mohit settles it the other way, "you" in the sentence or not.
  assert.equal(asksAboutChirp("do you know what his skills are?"), false);
  assert.equal(asksAboutChirp("when is mohit's birthday?"), false);
  assert.equal(asksAboutChirp("what does he do?"), false);
  assert.equal(asksAboutChirp("tell me about the résumé"), false);
});

test("a question aimed at the bird is sent with a steer, others go as typed", () => {
  const framed = framePrompt("when is your birthday?");
  assert.ok(framed.startsWith("when is your birthday?"), "the visitor's words come first");
  assert.match(framed, /as for mohit/i, "and the model is told to answer for both");
  assert.equal(framePrompt("what are his skills?"), "what are his skills?");
});

test("the prompt spells out both halves of an 'about you' answer", () => {
  const ctx = buildContext(content);
  assert.match(ctx, /"you" and "your" mean YOU, the bird/);
  assert.match(ctx, /never repeat the notes' headings/i, "the '# About' dump has a rule against it");
});

test("every quip's replies are reachable", () => {
  quips.forEach((q) => {
    q.patterns.forEach((p) => {
      assert.ok(matchQuip(p, quips, first), `pattern "${p}" (${q.id}) should match itself`);
    });
    // Both ends of the random pick land inside the list rather than off it.
    const picks = [matchQuip(q.patterns[0], quips, () => 0), matchQuip(q.patterns[0], quips, () => 0.999)];
    picks.forEach((r) => assert.ok(typeof r === "string" && r.length, `${q.id} pick`));
  });
});

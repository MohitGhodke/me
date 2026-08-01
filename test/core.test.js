"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createMenuController } = require("../src/core/menu-controller.js");
const shortcuts = require("../src/core/shortcuts.js");
const { copyText } = require("../src/core/clipboard.js");
const system = require("../src/core/system.js");
const {
  buildContext,
  matchQuip,
  asksAboutChirp,
  framePrompt,
  createReplyFilter,
  createAssistantSession
} = require("../src/core/assistant.js");
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
  assert.ok(ctx.includes(content.skills.groups[0].heading), "should mention what he works with");
});

test("buildContext tells the model the shipped work is public and installable", () => {
  const ctx = buildContext(content);
  // The single most common thing Chirp got wrong: describing four published
  // Marketplace extensions and an App Store app as private side projects.
  assert.match(ctx, /VS Code Marketplace/i);
  assert.match(ctx, /App Store/i);
  content.extensions.concat(content.apps).forEach((item) => {
    assert.ok(
      ctx.includes(item.availability),
      `${item.file} should carry its availability into the model's notes`
    );
  });
});

test("buildContext stays well under the 1B model's context window", () => {
  // ~4 chars/token is a safe rule of thumb; the model's window is 4096 tokens
  // and has to fit the conversation and the reply too, not just this context.
  assert.ok(buildContext(content).length <= 6000);
});

test("the notes are not being silently truncated", () => {
  // `buildContext` cuts the tail at 6000 characters, and the tail is the
  // contact details — so growing the content past the budget doesn't break
  // anything visibly, it just quietly stops Chirp knowing the email address.
  // This is the loud version of that: shorten something when it fails.
  const ctx = buildContext(content);
  assert.ok(ctx.length < 6000, `the notes are at the 6000-char cap (${ctx.length}) and are being cut`);
  assert.ok(ctx.includes("# Contact"), "the last section survived the cut");
  assert.ok(ctx.includes(content.site.email), "the email address survived the cut");
});

/* ------------------------------------------------------ Chirp's reply filter */

// The bug this exists for: asked something the notes don't cover, the 1B model
// grabs the nearest heading and pastes the block under it — and because that
// paste becomes its own previous turn, every answer after it is the same
// block again, whatever was asked.
const NOTES = [
  "You are Chirp. Rules: 1. Only use the facts in the notes below.",
  "",
  "# Mohit Ghodke — Lead Software Engineer (Aarhus)",
  "Thirteen years building C#/.NET services and Angular front ends.",
  "",
  "# Experience",
  "- Lead Software Engineer at EG A/S (Jun 2026 — Now): C#/.NET, Angular, Azure",
  "",
  "# Contact",
  "Email: hello@example.com"
].join("\n");

const clean = createReplyFilter(NOTES);

test("a heading pasted out of the notes is not an answer", () => {
  assert.equal(clean("# Experience"), "");
  assert.equal(
    clean("# Experience\n- Lead Software Engineer at EG A/S (Jun 2026 — Now): C#/.NET, Angular, Azure"),
    "",
    "the heading and the row under it are the whole of the paste in the reported bug"
  );
});

test("a copied line counts even when the model rewords the tail", () => {
  // Straight from the screenshot: the head is verbatim, the tail is the
  // question's own words bolted on, which is what made it look like an answer.
  assert.equal(
    clean("- Lead Software Engineer at EG A/S (Jun 2026 — Now): C# / .NET, Angular, international clients, and teams that build them."),
    ""
  );
});

test("a line still arriving is held back as soon as it looks like a paste", () => {
  // Streaming: the filter runs on every token, so a copy has to be caught
  // before it is drawn rather than shown and then snatched back.
  assert.equal(clean("- Lead Software Eng"), "", "an exact prefix of a note is already a paste");
  assert.equal(clean("- Lead"), "- Lead", "…but two words are not enough to call it");
});

test("an answer in the model's own words is left alone", () => {
  const answer = "yes — he's been at eg a/s since 2026, leading the teams building c#/.net and angular. *chirp*";
  assert.equal(clean(answer), answer);
});

test("the site's own prose is fair game — only the pasted structure is not", () => {
  // The résumé summary is what a good answer to "who is he?" sounds like.
  // Filtering that would trade the repetition bug for a mute bird.
  const prose = "Thirteen years building C#/.NET services and Angular front ends.";
  assert.equal(clean(prose), prose);
});

test("an answer that is part paste keeps the part that is not", () => {
  assert.equal(
    clean("# Experience\nhe leads the teams that build them, and has for four years.\n- Lead Software Engineer at EG A/S (Jun 2026 — Now): C#/.NET, Angular, Azure"),
    "he leads the teams that build them, and has for four years."
  );
});

test("the filter works against the notes the app actually ships", () => {
  const live = createReplyFilter(buildContext(content));
  const role = content.resume.roles[0];
  const pasted = `- ${role.title} at ${role.company} (${role.period}): ${(role.stack || []).join(", ")}`;

  assert.equal(live("# Experience"), "", "a real heading from the shipped notes");
  assert.equal(live(pasted), "", "a real row from the shipped notes");
  assert.equal(
    live("i don't have that one — my notes are all his work. *chirp*"),
    "i don't have that one — my notes are all his work. *chirp*"
  );
});

/**
 * A stand-in for the model: replies in order, streamed a line at a time, and
 * keeps the messages it was sent so the next turn's transcript can be read.
 */
function fakeEngine(replies) {
  const sent = [];
  return {
    sent,
    chat: {
      completions: {
        create: async ({ messages }) => {
          sent.push(messages);
          const text = replies.shift() || "";
          return {
            async *[Symbol.asyncIterator]() {
              for (const part of text.split(/(?<=\n)/)) {
                yield { choices: [{ delta: { content: part } }] };
              }
            }
          };
        }
      }
    }
  };
}

const PASTE = "# Experience\n- Lead Software Engineer at EG A/S (Jun 2026 — Now): C#/.NET, Angular, Azure";

test("a pasted answer never reaches the visitor", async () => {
  const engine = fakeEngine([PASTE]);
  const session = createAssistantSession({ createEngine: async () => engine });
  await session.load();

  const shown = [];
  const reply = await session.ask("does he know kubernetes?", NOTES, (text) => shown.push(text));

  assert.equal(reply, "", "there was no answer under the paste");
  assert.deepEqual(shown, [], "and nothing was drawn on the way, not even briefly");
});

// The heart of the reported bug: the model reads its own last turn back as the
// house style, so one paste turned every following answer into the same block.
test("a pasted answer is kept out of the transcript the model re-reads", async () => {
  const engine = fakeEngine([PASTE, "he hasn't listed kubernetes. *chirp*"]);
  const session = createAssistantSession({ createEngine: async () => engine });
  await session.load();

  await session.ask("does he know kubernetes?", NOTES, () => {});
  await session.ask("what about terraform?", NOTES, () => {});

  const secondTurn = engine.sent[1];
  const carried = secondTurn.filter((m) => m.role === "assistant").map((m) => m.content);
  assert.equal(carried.length, 1);
  assert.ok(!carried[0].includes("Lead Software Engineer"), `the paste came back: ${carried[0]}`);
  assert.match(carried[0], /don't know/i, "what it re-reads is a refusal, not a paste");
});

test("an answer the visitor saw is the one carried into the next turn", async () => {
  const engine = fakeEngine(["he's been at eg a/s since 2026. *chirp*", "sure."]);
  const session = createAssistantSession({ createEngine: async () => engine });
  await session.load();

  const shown = [];
  const reply = await session.ask("where does he work?", NOTES, (text) => shown.push(text));

  assert.equal(reply, "he's been at eg a/s since 2026. *chirp*");
  assert.equal(shown[shown.length - 1], reply, "the last thing drawn is the whole answer");

  await session.ask("and before that?", NOTES, () => {});
  assert.ok(
    engine.sent[1].some((m) => m.role === "assistant" && m.content === reply),
    "the answer the visitor read is what the model reads back"
  );
});

test("the transcript is capped, so the notes never get crowded out of the window", async () => {
  const engine = fakeEngine(Array.from({ length: 8 }, (_, i) => `answer ${i}. *chirp*`));
  const session = createAssistantSession({ createEngine: async () => engine });
  await session.load();

  for (let i = 0; i < 8; i++) await session.ask(`question ${i}`, NOTES, () => {});

  const last = engine.sent[engine.sent.length - 1];
  assert.equal(last[0].role, "system", "the notes lead every turn");
  assert.ok(last.length <= 10, `the model was sent ${last.length} messages`);
  assert.ok(
    !last.some((m) => m.content === "question 0"),
    "the oldest exchange should have fallen off the end"
  );
});

test("there is something to say when the whole reply was a paste", () => {
  // `clean` returning "" is what makes the terminal print one of these, so an
  // empty list would leave the question hanging with no reply at all.
  assert.ok(content.assistant.unknownLines.length);
  content.assistant.unknownLines.forEach((line) => assert.ok(line.trim().length));
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

test("'can I actually get this?' is answered from the copy, not improvised", () => {
  ["where can i download these?", "can i install the extensions?", "is it free?", "are they on the marketplace?"]
    .forEach((question) => {
      const reply = matchQuip(question, quips, first);
      assert.ok(reply, `"${question}" should be answered locally`);
      assert.match(reply, /marketplace/i, `"${question}" should name where to get them`);
    });
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
  assert.match(ctx, /never repeat a heading, never copy a line out of the notes/i,
    "the '# About' dump has a rule against it");
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

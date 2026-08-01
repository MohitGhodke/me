/**
 * Chirp reading a line as an instruction to the desktop.
 *
 * Two things are being proved here. That the matcher itself behaves — verbs,
 * pronouns, precedence — and that the *shipped* vocabulary behaves, since the
 * keywords live in the content files where they are meant to be edited by
 * hand. A keyword that opens the wrong window is worse than one that opens
 * nothing, so the phrasings people actually type are pinned down below.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { matchIntent, isAccepted, line } = require("../src/core/intents.js");
const { content } = require("../src/content/index.js");

/** The real vocabulary, assembled the way the app assembles it. */
const vocab = Object.assign({ windows: content.windows }, content.assistant.intents);

const intentOf = (question) => matchIntent(question, vocab);

/* ------------------------------------------------------------ instructions */

test("a verb next to a window name is an instruction", () => {
  assert.deepEqual(intentOf("can you show resume of mohit"), {
    kind: "open",
    target: "resume",
    keyword: "resume"
  });
  assert.equal(intentOf("open his cv").target, "resume");
  assert.equal(intentOf("pull up his skills").target, "skills");
  assert.equal(intentOf("i want to see his vs code extensions").target, "extensions");
  assert.equal(intentOf("take me to the contact form").target, "contact");
});

test("a window named without a verb is a question, not an instruction", () => {
  const asked = intentOf("what is in his resume?");
  assert.equal(asked.kind, "offer", "the model should answer, and Chirp offer the window");
  assert.equal(asked.target, "resume");
  assert.equal(intentOf("tell me about his skills").kind, "offer");
});

test("a line that names no window at all is left alone", () => {
  assert.equal(intentOf("what does he do?"), null);
  assert.equal(intentOf("how are you"), null);
  assert.equal(intentOf("who did he work for in 2019"), null, "'work for' must not open the folder");
  assert.equal(intentOf(""), null);
  assert.equal(matchIntent("open the resume", null), null, "no vocabulary, no intent");
});

test("the more specific window name wins", () => {
  // Both vocabularies contain "work"; only the résumé's contains "work history".
  assert.equal(intentOf("show me his work history").target, "resume");
  assert.equal(intentOf("show me his work").target, "work");
  assert.equal(intentOf("show me the work folder").target, "work");
  assert.equal(intentOf("open his ios apps").target, "apps");
});

/* ------------------------------------------------------------------ closing */

test("closing takes a name, or the pronoun for whatever was opened last", () => {
  assert.deepEqual(intentOf("close the resume"), { kind: "close", target: "resume", keyword: "resume" });
  assert.equal(intentOf("hide the contact form").target, "contact");

  const it = intentOf("close it");
  assert.equal(it.kind, "close");
  assert.equal(it.target, null, "the caller resolves which window 'it' was");
});

test("a sweep is read before any single window", () => {
  assert.deepEqual(intentOf("close everything"), {
    kind: "closeall",
    target: null,
    keyword: "close everything"
  });
  assert.equal(intentOf("close all windows").kind, "closeall");
  // Names a window, but the sweep phrase is what the visitor meant.
  assert.equal(intentOf("close all windows including the resume").kind, "closeall");
});

test("a close verb with nothing to close on is not an instruction", () => {
  assert.equal(intentOf("close"), null);
  assert.equal(intentOf("did he shut down any projects"), null);
});

/* ------------------------------------------------- whole words, not fragments */

test("keywords match whole words, never fragments of longer ones", () => {
  // "cv" inside "cvs", "see" inside "seed" — a substring match would fire on both.
  assert.equal(intentOf("show me cvs"), null);
  assert.equal(intentOf("seeds"), null);
});

test("punctuation and casing don't change the reading", () => {
  assert.equal(intentOf("SHOW ME HIS RESUME!!").kind, "open");
  assert.equal(intentOf("open... his c.v.?"), null, "letters split by dots are different words");
  assert.equal(intentOf("Open his CV, please").target, "resume");
});

/* -------------------------------------------------------- offers and phrasing */

test("an offer is taken up by the words people actually use", () => {
  const { acceptWords } = content.assistant.intents;
  ["y", "yes", "sure", "ok", "go on", "open it"].forEach((word) =>
    assert.ok(isAccepted(word, acceptWords), `"${word}" should count as yes`)
  );
  assert.equal(isAccepted("no thanks", acceptWords), false);
  assert.equal(isAccepted("", acceptWords), false);
});

test("a spoken line is filled in from the window it is about", () => {
  const first = () => 0;
  assert.equal(line(["*opens {title}*"], { title: "Resume.doc" }, first), "*opens Resume.doc*");
  assert.equal(line(["nothing to fill"], {}, first), "nothing to fill");
  assert.equal(line(["{unknown} stays put"], {}, first), "{unknown} stays put");
  assert.equal(line([], {}, first), "", "no lines is not a crash");
  // Both ends of the random pick land inside the list.
  assert.equal(line(["a", "b"], {}, () => 0), "a");
  assert.equal(line(["a", "b"], {}, () => 0.999), "b");
});

/* --------------------------------------------- the shipped vocabulary itself */

test("every window Chirp can name is reachable by each of its keywords", () => {
  content.windows
    .filter((w) => w.keywords)
    .forEach((w) => {
      w.keywords.forEach((keyword) => {
        const intent = intentOf("show me " + keyword);
        assert.ok(intent, `"${keyword}" should name a window`);
        assert.equal(intent.target, w.id, `"${keyword}" should open ${w.id}`);
        assert.equal(intent.kind, "open");
      });
    });
});

test("Chirp never offers to open the window it is speaking from", () => {
  // The AI window is by definition open during a conversation, so its keywords
  // exist only to be closed — an offer to open it would be nonsense.
  const ai = content.windowById.ai;
  ai.keywords.forEach((keyword) => {
    assert.equal(intentOf("close " + keyword).target, "ai");
  });
});

test("the detail window stays out of reach", () => {
  // "project" is opened by clicking a file, never by name: it has no content
  // of its own until something is selected.
  assert.equal(content.windowById.project.keywords, undefined);
});

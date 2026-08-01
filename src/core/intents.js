/**
 * Reading a visitor's line as an instruction to the desktop.
 *
 * The site already has an action vocabulary — every menu row and key binding
 * is a string id dispatched through one handler — so Chirp needs no new
 * powers, only a way to name an action that already exists. This module is
 * that translation and nothing else: sentence in, intent out. Whether the
 * intent is *carried out* is the component's business.
 *
 * It matches rather than asks the model on purpose. The vocabulary is closed
 * (nine windows, a handful of verbs), which is exactly where matching beats a
 * 1B model: it answers in microseconds instead of seconds, it is testable in
 * Node, and it cannot invent a window that doesn't exist.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;

  /** Lowercase, punctuation-free, single-spaced — the form patterns match against. */
  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** True when `phrase` appears in `text` as whole words, not inside a longer one. */
  function hasPhrase(text, phrase) {
    return !!phrase && new RegExp("(^| )" + phrase + "( |$)").test(text);
  }

  /**
   * The longest of `phrases` present in `text`, or "".
   *
   * Longest wins so that specific beats general wherever two vocabularies
   * overlap: "work history" is the résumé, while a bare "work" is the folder.
   */
  function longestPhrase(text, phrases) {
    var best = "";
    (phrases || []).forEach(function (phrase) {
      var candidate = normalize(phrase);
      if (candidate.length > best.length && hasPhrase(text, candidate)) best = candidate;
    });
    return best;
  }

  /** The window whose keywords match `text` most specifically, or null. */
  function namedWindow(text, windows) {
    var best = null;
    (windows || []).forEach(function (spec) {
      var hit = longestPhrase(text, spec.keywords);
      if (hit && (!best || hit.length > best.keyword.length)) {
        best = { target: spec.id, keyword: hit };
      }
    });
    return best;
  }

  /**
   * @typedef {object} Intent
   * @property {"open"|"offer"|"close"|"closeall"} kind
   * @property {?string} target  window id, or null for "close it" / "close everything"
   * @property {string}  keyword what in the sentence triggered it — for tests and debugging
   */

  /**
   * @param {string} question  what the visitor typed
   * @param {object} vocab     { windows, openVerbs, closeVerbs, closeAllPhrases, itWords }
   * @returns {?Intent} null when the line is a question rather than an instruction
   */
  function matchIntent(question, vocab) {
    var text = normalize(question);
    if (!text || !vocab) return null;

    // "close everything" names no window, so it has to be read before the
    // per-window pass — otherwise "close all windows" looks like a bare verb.
    var sweep = longestPhrase(text, vocab.closeAllPhrases);
    if (sweep) return { kind: "closeall", target: null, keyword: sweep };

    var named = namedWindow(text, vocab.windows);
    var closeVerb = longestPhrase(text, vocab.closeVerbs);

    if (closeVerb) {
      if (named) return { kind: "close", target: named.target, keyword: named.keyword };
      var pronoun = longestPhrase(text, vocab.itWords);
      // "close it" — the caller knows which window that was.
      if (pronoun) return { kind: "close", target: null, keyword: pronoun };
      return null;
    }

    if (!named) return null;

    // A verb makes it an instruction ("open his cv"); a window name on its own
    // is a question about that topic ("what's in his cv?"), which the model
    // answers — Chirp only offers to open it afterwards.
    var openVerb = longestPhrase(text, vocab.openVerbs);
    return {
      kind: openVerb ? "open" : "offer",
      target: named.target,
      keyword: named.keyword
    };
  }

  /** True when `answer` takes Chirp up on an offer it just made. */
  function isAccepted(answer, acceptWords) {
    var text = normalize(answer);
    return !!text && !!longestPhrase(text, acceptWords);
  }

  /**
   * One of `lines`, with `{placeholders}` filled from `values`.
   *
   * @param {string[]} lines
   * @param {object=} values   e.g. { title: "Resume.doc" }
   * @param {() => number=} random  injectable for tests; defaults to Math.random
   */
  function line(lines, values, random) {
    if (!lines || !lines.length) return "";
    var pick = random || Math.random;
    var chosen = lines[Math.min(lines.length - 1, Math.floor(pick() * lines.length))];
    return String(chosen).replace(/\{(\w+)\}/g, function (whole, key) {
      return values && values[key] != null ? values[key] : whole;
    });
  }

  var api = {
    matchIntent: matchIntent,
    isAccepted: isAccepted,
    line: line
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.intents = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

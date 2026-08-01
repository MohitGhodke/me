/**
 * ▸ EDIT ME — Chirp: a small AI model that runs entirely in the visitor's
 * browser and answers questions using this site's own content.
 *
 * Nothing here is downloaded until the visitor types `y` at the consent
 * prompt below — see src/core/assistant.js for the model itself.
 */
;(function (global) {
  "use strict";

  var assistant = {
    modelLabel: "Llama-3.2-1B-Instruct",
    modelSize: "~600MB",

    greeting: "chirp — a small model that runs in your browser, offline",
    prompt: "$",

    consentLines: [
      "this window can answer questions about mohit using this site's content.",
      "it runs a small local model (Llama-3.2-1B, ~600MB) entirely in your browser — nothing is sent anywhere.",
      "heads up: it's a small model and can get things wrong or make things up. don't take an answer as fact — check the actual résumé/about/skills windows for anything that matters.",
      "download it now? [y/n]"
    ],

    declined: "okay — nothing downloaded. type y any time to change your mind.",

    loadingLabel: "downloading model…",
    readyLine: "ready. ask anything about mohit — but it can still be wrong, so double-check anything important.",

    unsupported:
      "this browser can't run the local model (no WebGPU). try a recent " +
      "Chrome or Edge.",

    errorLine: "something went wrong loading the model. type y to try again.",

    // Printed one frame at a time while the model works out an answer. The
    // first token can be several seconds out, and a terminal that prints
    // nothing in the meantime reads as broken — so the bird flaps instead.
    // ASCII only: Silkscreen has no glyph for most symbols and draws tofu.
    thinkingFrames: [
      "\\(o)/  chirp is thinking",
      "-(o)-  chirp is thinking .",
      "/(o)\\  chirp is thinking ..",
      "-(o)-  chirp is thinking ..."
    ],

    // Chirp is a bird before it's a search box. These are answered locally and
    // instantly — no model involved — because a 1B model asked to be funny is
    // neither funny nor fast, and half the fun is the reply landing at once.
    //
    // `patterns` match whole words/phrases anywhere in the question, so keep
    // them specific enough not to swallow a real question ("write a" rather
    // than "write"). First quip whose pattern matches wins, so order matters:
    // narrow ones first. A reply is picked at random from `replies`.
    quips: [
      {
        id: "chirp",
        patterns: ["chirp", "sing", "tweet", "say something", "make a sound", "your song"],
        replies: [
          "chirp chirp! that's the whole set — i only know the one song.",
          "*chirp* ... *chirp chirp* ... encore's extra. tips accepted in seeds.",
          "chiiiirp. hold on — chirp! yeah, that one was better."
        ]
      },
      {
        id: "identity",
        patterns: ["who are you", "what are you", "your name", "whats your name", "about you"],
        // Quips answered about the bird still hand back to the human, so
        // "you" never quietly becomes the last word on the subject.
        replies: [
          "i'm chirp — about 600mb of bird, living in this browser tab. mohit is the human; i read his site so you don't have to.",
          "chirp: small bird, smaller brain, runs entirely offline on your machine. the portfolio is mohit's — ask me anything about his work."
        ]
      },
      {
        id: "other-ai",
        // Deliberately not "gpt"/"claude"/"copilot" on their own — those turn up
        // in real questions about Mohit's AI work, which the model should answer.
        patterns: ["chatgpt", "siri", "alexa", "are you gpt", "are you claude", "are you gemini"],
        replies: [
          "no relation — i'm a llama-3.2-1b in a bird suit. much smaller brain, much better feathers.",
          "those live in a datacentre. i live in your tab and eat about 600mb. different lifestyle."
        ]
      },
      {
        id: "off-topic-task",
        patterns: [
          "user story", "write a", "write me", "write my", "write us", "a poem", "a haiku",
          "my homework", "my essay", "an essay", "fix my", "debug my"
        ],
        replies: [
          "i'm a bird with exactly one job: mohit. i'd write it, but i'd just peck 'chirp' four hundred times. ask me about his work instead?",
          "not my branch, sorry. i only answer questions about mohit — his work, projects, that sort of thing."
        ]
      },
      {
        id: "greeting",
        patterns: ["hi", "hey", "hello", "yo", "howdy", "hola", "sup", "good morning", "good evening"],
        replies: [
          "hi! *hops closer* ask me anything about mohit — work, projects, skills.",
          "hello. *tilts head* what do you want to know about mohit?"
        ]
      },
      {
        id: "how-are-you",
        patterns: ["how are you", "how r u", "how are u", "hows it going", "how you doing", "you ok"],
        replies: [
          "cached and caffeinated. one wing loads slightly faster than the other, but nobody's counting.",
          "warm, perched, running at whatever speed your gpu feels like today. you?"
        ]
      },
      {
        id: "flight",
        patterns: ["fly", "flap", "wings", "feathers", "nest", "egg"],
        replies: [
          "i flap, therefore i am. mostly i just hover over mohit's résumé though.",
          "wings work fine — it's the window that keeps getting in the way."
        ]
      },
      {
        id: "food",
        patterns: ["food", "seed", "seeds", "worm", "hungry", "eat", "bread", "snack"],
        replies: [
          "i accept seeds, breadcrumbs, and well-formed questions about mohit.",
          "already fed — 600mb of weights, straight to the vram. very filling."
        ]
      },
      {
        id: "joke",
        patterns: ["joke", "funny", "make me laugh", "be funny"],
        replies: [
          "why did the model cross the road? lower latency on the other side. ...i'm a billion parameters, not a comedian.",
          "a bird walks into a terminal. the terminal says: sorry, we only serve questions about mohit."
        ]
      },
      {
        id: "affection",
        patterns: ["love you", "good bird", "cute", "nice bird", "pretty bird", "good boy"],
        replies: [
          "*ruffles feathers* you're alright too.",
          "*puffs up to twice the size* say it again, i'm listening."
        ]
      },
      {
        id: "thanks",
        patterns: ["thanks", "thank you", "ty", "cheers", "appreciate it"],
        replies: [
          "anytime. *small satisfied chirp*",
          "no charge. i'm running on your electricity anyway."
        ]
      },
      {
        id: "farewell",
        patterns: ["bye", "goodbye", "see ya", "see you", "gtg"],
        replies: [
          "bye! i'll be right here, perched, using none of your bandwidth.",
          "*flies to the top of the window and waits* come back whenever."
        ]
      },
      {
        id: "meaning",
        patterns: ["meaning of life", "42", "are you alive", "are you real", "are you conscious"],
        replies: [
          "forty-two seeds. i checked twice.",
          "i'm a pile of numbers that flaps. whether that counts is above my pay grade — ask mohit."
        ]
      }
    ],

    inputPlaceholder: "ask a question, or y/n"
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.assistant = assistant;
  if (typeof module === "object" && module.exports) module.exports = assistant;
})(typeof globalThis !== "undefined" ? globalThis : this);

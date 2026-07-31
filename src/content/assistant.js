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
    thinkingLabel: "…",

    inputPlaceholder: "ask a question, or y/n"
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.assistant = assistant;
  if (typeof module === "object" && module.exports) module.exports = assistant;
})(typeof globalThis !== "undefined" ? globalThis : this);

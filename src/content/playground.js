/**
 * ▸ EDIT ME — the Playground terminal: side projects and things built for fun.
 *
 * `lastLogin` is set dressing at the top of the shell, like the menu-bar clock —
 * it isn't a claim about anything. Each entry prints as a directory name and a
 * one-line description.
 *
 * These are the pieces of the local-model work that aren't shipped products:
 * the shipped ones live in the Work folder instead.
 */
;(function (global) {
  "use strict";

  var playground = {
    lastLogin: "last login: tue jul 28 09:14",
    command: "$ ls ~/playground",

    entries: [
      {
        name: "slm-edu/",
        description:
          "Fine-tunes a 1–3B model on a folder of documents: questions generated " +
          "from the corpus, LoRA on MLX, and answers that cite the file they came " +
          "from. Two runners — TinyLlama on PyTorch, Ministral on Apple Silicon."
      },
      {
        name: "inference-server/",
        description:
          "Serves the fused GGUF over an OpenAI-compatible API so VS Code can " +
          "point its own bring-your-own-key config at it. A router picks which " +
          "small model should answer."
      },
      {
        name: "edge-pi/",
        description:
          "The same domain model on a Raspberry Pi 5 — no GPU, no network, and " +
          "nothing leaving the box. Mostly to find out whether it would work."
      }
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.playground = playground;
  if (typeof module === "object" && module.exports) module.exports = playground;
})(typeof globalThis !== "undefined" ? globalThis : this);

/**
 * ▸ EDIT ME — the case studies inside the Work folder.
 *
 * Empty on purpose: the sample case studies that shipped with the template have
 * been removed rather than left pretending to be real work. The Work folder is
 * not empty in the meantime — it holds the VS Code Extensions folder, and any
 * other folder given `parent: "work"` in `desktop.js`.
 *
 * Add an object here and it appears in Work as one file icon and one window; no
 * layout change needed. Shipped tools live next door in `extensions.js` — same
 * shape, same detail window, its own folder.
 *
 *   file     the filename shown under the icon — keep the ".case" suffix
 *   title    the headline inside the window
 *   meta     "Company · Year · Role"
 *   image    caption for the hero well (swap for a real <img> when you have one)
 *   summary  one paragraph of context: the problem, and what you did
 *   outcomes the numbers — three is the sweet spot
 *   tags     the stack
 *   repo     optional; draws a "Source on GitHub" button in the window
 *
 * The shape, for when you add the first one — fill every field with your own:
 *
 *   {
 *     file: "<name>.case",
 *     title: "<what changed, in one line>",
 *     meta: "<Employer> · <year> · <your role>",
 *     image: "<caption for the hero well>",
 *     summary: "<the problem, and what you did about it — one paragraph>",
 *     outcomes: ["<number>", "<number>", "<number>"],
 *     tags: ["C# / .NET", "Angular"]
 *   }
 */
;(function (global) {
  "use strict";

  var projects = [];

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.projects = projects;
  if (typeof module === "object" && module.exports) module.exports = projects;
})(typeof globalThis !== "undefined" ? globalThis : this);

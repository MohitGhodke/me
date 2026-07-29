/**
 * ▸ EDIT ME — the Playground terminal: side projects and things built for fun.
 *
 * `lastLogin` is decoration at the top of the shell. Each entry prints as a
 * directory name and a one-line description.
 */
;(function (global) {
  "use strict";

  var playground = {
    lastLogin: "last login: tue jul 28 09:14",
    command: "$ ls ~/playground",

    entries: [
      {
        name: "tinykv/",
        description:
          "A 900-line key-value store with a write-ahead log. Built it to finally " +
          "understand crash recovery."
      },
      {
        name: "slowdns/",
        description:
          "DNS resolver that logs every hop. Turned into a debugging tool the " +
          "whole team uses."
      },
      {
        name: "rasterbox/",
        description:
          "1-bit image ditherer. It's also what made the wallpaper you're looking at."
      }
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.playground = playground;
  if (typeof module === "object" && module.exports) module.exports = playground;
})(typeof globalThis !== "undefined" ? globalThis : this);

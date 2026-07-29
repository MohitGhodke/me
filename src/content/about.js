/**
 * ▸ EDIT ME — About Me.txt.
 *
 * `paragraphs` renders in order; add as many as you like. `callout` is the
 * boxed "Currently" note at the bottom — set it to `null` to hide the box.
 */
;(function (global) {
  "use strict";

  var about = {
    greeting: "Hello — I'm Mohit.",

    paragraphs: [
      "I'm a lead software engineer. I like the unglamorous parts: the migration " +
        "nobody wants to own, the flaky test that's been muted for a year, the " +
        "on-call runbook that finally makes sense. Good systems are mostly good " +
        "decisions written down.",
      "These days I split my time between platform architecture and growing the " +
        "people around me. I care about handing a team something they can run " +
        "without me."
    ],

    callout: {
      heading: "Currently",
      body:
        "Leading the payments platform at Acme Systems. Open to staff and lead " +   // PLACEHOLDER
        "roles, and to advising early teams on infrastructure."
    }
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.about = about;
  if (typeof module === "object" && module.exports) module.exports = about;
})(typeof globalThis !== "undefined" ? globalThis : this);

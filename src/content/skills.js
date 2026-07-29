/**
 * ▸ EDIT ME — the System Profile window.
 *
 * Each group renders as a heading plus its items. `kind` picks the shape:
 *   "chips"  pressed pixel pills, for technologies
 *   "lines"  plain sentences, for things that don't fit in a pill
 */
;(function (global) {
  "use strict";

  var skills = {
    /** Right-hand side of the info strip under the title bar. */
    subtitle: "9 years in disk",

    groups: [
      {
        heading: "Languages",
        kind: "chips",
        items: ["Go", "TypeScript", "Python", "Rust", "SQL"]
      },
      {
        heading: "Platform",
        kind: "chips",
        items: ["Kubernetes", "Kafka", "Postgres", "Terraform", "AWS", "gRPC"]
      },
      {
        heading: "Leading",
        kind: "lines",
        items: [
          "Team of 4 — hiring, reviews, growth plans",
          "Architecture review and technical strategy",
          "Incident command and on-call culture",
          "Mentoring senior engineers into leads"
        ]
      }
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.skills = skills;
  if (typeof module === "object" && module.exports) module.exports = skills;
})(typeof globalThis !== "undefined" ? globalThis : this);

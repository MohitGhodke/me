/**
 * ▸ EDIT ME — Resume.doc.
 *
 * This is the window that gets printed to PDF, so keep it to the things you'd
 * actually put on one page. Add or remove `roles` freely; the template renders
 * however many you list.
 *
 * ⚠︎ PLACEHOLDER: every employer, date and metric below is sample copy.
 */
;(function (global) {
  "use strict";

  var resume = {
    /** Two or three sentences. What you do, and the proof. */
    summary:
      "Nine years building and leading backend and platform teams. I take systems " +
      "from a prototype that works to a service that stays up — and I bring " +
      "engineers along with me. Most recently led a four-person team through a " +
      "payments re-platform serving 2M daily requests.",

    roles: [
      {
        title: "Lead Software Engineer",                                  // PLACEHOLDER
        company: "Acme Systems",                                          // PLACEHOLDER
        period: "2022 — now",
        description:
          "Own the payments platform. Cut p99 latency 340ms → 90ms, moved 12 " +
          "services onto a shared deploy pipeline, hired and mentored 3 engineers."
      },
      {
        title: "Senior Engineer",                                         // PLACEHOLDER
        company: "Northwind Labs",                                        // PLACEHOLDER
        period: "2019 — 2022",
        description:
          "Built the event ingestion pipeline behind customer analytics. " +
          "40k events/sec sustained, exactly-once semantics."
      },
      {
        title: "Software Engineer",                                       // PLACEHOLDER
        company: "Bluebird",                                              // PLACEHOLDER
        period: "2017 — 2019",
        description:
          "Full-stack product work across web and API. Shipped the first version " +
          "of the merchant dashboard."
      }
    ],

    education: [
      { line: "B.E. Computer Engineering — University Name, 2017" }       // PLACEHOLDER
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.resume = resume;
  if (typeof module === "object" && module.exports) module.exports = resume;
})(typeof globalThis !== "undefined" ? globalThis : this);

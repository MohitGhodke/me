/**
 * ▸ EDIT ME — Resume.doc.
 *
 * This is the window that gets printed to PDF, so keep it to the things you'd
 * actually put on one page. Add or remove `roles` freely; the template renders
 * however many you list.
 *
 * Everything in this file is real.
 *
 * Each role carries the stack it was built on rather than a paragraph. That is
 * the checkable part, and it beats the invented achievements this file shipped
 * with: a plausible-looking fake is worse on a résumé than an obvious gap.
 */
;(function (global) {
  "use strict";

  var resume = {
    /** Two or three sentences. What you do, and the proof. */
    summary:
      "Thirteen years building C#/.NET services and Angular front ends, the last " +
      "four leading the teams that build them. Alongside that I work on the AI " +
      "tooling around delivery — orchestration agents that keep context out of " +
      "the prompt, retrieval-augmented answers, and small language models " +
      "fine-tuned to run offline against a private corpus. Four VS Code " +
      "extensions and an iOS app built on Apple's on-device models are the part " +
      "you can go and look at.",

    /**
     * Newest first. Titles, employers and dates are from LinkedIn.
     *
     *   stack        what you worked with there — the honest, checkable part
     *   description  optional; one line of what you owned or changed. Left off
     *                until there is something true and specific to say, because
     *                an invented achievement is worse than none.
     */
    roles: [
      {
        title: "Lead Software Engineer",
        company: "EG A/S",
        period: "Jun 2026 — now",
        stack: [
          "C# / .NET",
          "Angular",
          "Micro frontends",
          "Agentic coding",
          "Small language models"
        ]
      },
      {
        title: "Lead Software Engineer",
        company: "TietoEVRY",
        period: "Jan 2022 — Jun 2026",
        stack: ["C# / .NET", "Angular"]
      },
      {
        title: "Senior Software Engineer",
        company: "TietoEVRY",
        period: "Apr 2019 — Jan 2022",
        stack: ["C# / .NET", "Angular"]
      },
      {
        title: "Software Engineer",
        company: "Ecotech IT Solutions",
        period: "Nov 2012 — Apr 2019",
        stack: ["C# / .NET", "SQL Server"]
      }
    ],

    education: [
      { line: "Bachelor in Engineering — Pune University" }
    ],

    /**
     * Sections that stay short on screen and open a window for the rest.
     *
     * On the page each is a summary line with an "Open …" affordance; on the
     * printed page the same section expands to the full contents of the window
     * it points at, so the PDF carries everything the site does.
     *
     *   window   the id of the window it opens (see desktop.js)
     *   label    the section heading
     *   summary  the one or two lines that show on screen
     *
     * The printed detail is derived from that window's own content, so it can
     * never drift from what the site shows. To add one — "Playground", say —
     * add a row here and a branch in `detailFor()` in src/app/view-model.js.
     */
    sections: [
      {
        window: "skills",
        label: "Skills",
        summary:
          "Agent engineering and model fine-tuning, on thirteen years of " +
          "C# / .NET and Angular."
      },
      {
        window: "work",
        label: "Selected work",
        summary:
          "Four VS Code extensions and an iOS app — all shipped, all mine."
      }
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.resume = resume;
  if (typeof module === "object" && module.exports) module.exports = resume;
})(typeof globalThis !== "undefined" ? globalThis : this);

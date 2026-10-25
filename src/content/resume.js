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
      "Lead software engineer who builds the agent layer his platform's teams " +
      "ship features with — a documentation agent that makes each microservice " +
      "legible to a model, eight agents that route a task to the one that owns " +
      "it, and a fine-tuned small model for the legacy code too large for any " +
      "prompt. Input tokens down a measured 20%, and engineers across the teams " +
      "taught to write their own agents and skills. It stands on thirteen years " +
      "of C#/.NET and Angular, the last four leading a team. Four " +
      "VS Code extensions and an iOS app — published, free — are the part you " +
      "can go and install.",

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
        description:
          "Designed the eight-agent framework every team on the platform now " +
          "builds features with; cut input tokens 20%; fine-tuned a 3B model " +
          "for legacy code. Also teach engineers to write agents and skills.",
        stack: [
          "Agent skills",
          "Multi-agent frameworks",
          "Context engineering",
          "QLoRA fine-tuning",
          "C# / .NET",
          "Angular"
        ]
      },
      {
        title: "Lead Software Engineer",
        company: "TietoEVRY",
        period: "Jan 2022 — Jun 2026",
        stack: ["C# / .NET", "Angular", "Micro frontends", "Agentic coding"]
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
     * never drift from what the site shows. To add one — "Writing", say — add
     * a row here and a branch in `detailFor()` in src/app/view-model.js.
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
          "Four VS Code extensions on the Marketplace and an iOS app on the " +
          "App Store — shipped, public, free to install."
      }
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.resume = resume;
  if (typeof module === "object" && module.exports) module.exports = resume;
})(typeof globalThis !== "undefined" ? globalThis : this);

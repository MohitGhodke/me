/**
 * ▸ EDIT ME — the System Profile window.
 *
 * Each group renders as a heading, an optional note, and its items. `kind`
 * picks the shape of the items:
 *   "chips"  pressed pixel pills, for technologies
 *   "lines"  plain sentences, for things that don't fit in a pill
 *
 *   heading  the section title
 *   note     optional; a sentence or two under the heading, for a section that
 *            needs framing rather than just a list
 *   kind     "chips" | "lines"
 *   items    the pills, or the sentences
 *
 * This window is the inventory: what you work with, and how you approach it.
 * Results belong in a case study (`projects.js`) or the résumé, where there is
 * room for the numbers behind them.
 */
;(function (global) {
  "use strict";

  var skills = {
    /** Right-hand side of the info strip under the title bar. */
    subtitle: "13 years in disk",

    groups: [
      {
        heading: "Agent Engineering",
        note:
          "Cutting input tokens by keeping context out of the prompt. An " +
          "orchestration agent does nothing but route — it decides what a task " +
          "needs and calls the skill that owns it, so only the markdown that " +
          "matters reaches the model instead of the whole repository.",
        kind: "chips",
        items: [
          "Orchestration agents",
          "Multi-agent frameworks",
          "Agent skills",
          "System instructions",
          "MCP servers",
          "Context engineering",
          "Teaching teams to build with agents"
        ]
      },
      {
        heading: "Model Fine-Tuning",
        note:
          "Fine-tuning 1–3B models on a private document corpus so the answers " +
          "run offline. LoRA adapters trained with MLX on Apple Silicon, " +
          "questions generated from the knowledge base rather than written by " +
          "hand, and citations resolved by retrieval at serve time instead of " +
          "trained into the model — which is what stopped it inventing sources " +
          "as the corpus grew.",
        kind: "chips",
        items: [
          "LoRA fine-tuning",
          "RAG",
          "MLX / Apple Silicon",
          "Synthetic QA datasets",
          "Feedback retraining",
          "GGUF export",
          "Edge inference",
          "Python"
        ]
      },
      {
        heading: "Backend",
        kind: "chips",
        items: ["C#", ".NET", "ASP.NET MVC", "Web API", "Microservices", "SQL Server"]
      },
      {
        heading: "Front end",
        kind: "chips",
        items: ["Angular", "TypeScript", "Micro frontends"]
      }
    ]
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.skills = skills;
  if (typeof module === "object" && module.exports) module.exports = skills;
})(typeof globalThis !== "undefined" ? globalThis : this);

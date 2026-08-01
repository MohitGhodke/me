/**
 * ▸ EDIT ME — the VS Code extensions inside the "VS Code Extensions" folder.
 *
 * Same shape as a case study in `projects.js`, and the same detail window
 * renders both: one folder holds shipped tools, the other holds the work you
 * did somewhere. Add a fifth and it appears in the folder on its own.
 *
 *   file         the filename shown under the icon — keep the ".vsix" suffix
 *   title        the headline inside the window: what it does for you
 *   meta         "Display Name · Year"
 *   image        caption for the hero well (swap for a real screenshot when you have one)
 *   availability where it can be got, in a few words — renders as a badge
 *   summary      one paragraph: the friction first, then how this removes it
 *   outcomes     three bullets — what you get, not how it is built
 *   tags         the stack
 *   install      { label, url } — the button that takes you to the listing
 *   repo         optional; the public repo, for the technical detail
 *
 * These four share one idea: the sidebar tool you already know, plus the same
 * information handed to Copilot as agent tools, so the question can be asked in
 * English instead of clicked for. Keep the write-ups short — the listing is
 * where the detail belongs.
 *
 * All four are published, not prototypes: any developer can install them from
 * the VS Code Marketplace today, for free. That is the single most useful thing
 * a visitor can learn here, so it is said twice over — `availability` renders
 * as a badge above the headline, `install` as the button under it — and Chirp
 * is handed the same fact rather than left to guess.
 *
 * `repo` is deliberately absent from three of them: those repositories are
 * still private while the source is being opened up, and a "Source on GitHub"
 * button that 404s is worse than no button. Add it back per extension as each
 * repo goes public.
 */
;(function (global) {
  "use strict";

  var extensions = [
    {
      file: "csharp-test-explorer.vsix",
      title: "Running the .NET tests you meant, not all of them",
      meta: "C# Test Explorer · Copilot Ready · 2026",
      image: "tests grouped by category",
      availability: "Live on the VS Code Marketplace — free",
      summary:
        "On a large solution dotnet test is all-or-nothing and slow, and its " +
        "output tells you twelve tests failed without mentioning they are all " +
        "the same integration category. This reads the test attributes directly " +
        "— so MSTest, NUnit and xUnit all work from one parser — and groups " +
        "everything by category in its own sidebar view, so you can run the " +
        "slice you care about.",
      outcomes: [
        "MSTest, NUnit and xUnit from one attribute parser",
        "Data-driven rows collapse into one node, worst-case status shown",
        "Run by category, by class, or one test — and ask Copilot in English"
      ],
      tags: ["TypeScript", "C# / .NET", "VS Code API", "Copilot Tools"],
      install: {
        label: "Install from the Marketplace →",
        url: "https://marketplace.visualstudio.com/items?itemName=MohitGhodke.csharp-test-explorer-copilot-ready"
      }
    },
    {
      file: "angular-test-explorer.vsix",
      title: "One test sidebar for both Angular runners",
      meta: "Angular Test Explorer · Copilot Ready · 2026",
      image: "sidebar test tree",
      availability: "Live on the VS Code Marketplace — free",
      summary:
        "Angular's test story is split between Karma and the newer Vitest " +
        "builder, and ng test answers either one with a wall of terminal " +
        "text — with no way to re-run just one spec. This detects the runner " +
        "from angular.json, puts the suite in a tree grouped by file and " +
        "describe block, and runs any scope you click. For suites too large " +
        "to tag by hand, it will group them into feature areas itself.",
      outcomes: [
        "Karma or Vitest, auto-detected — no configuration",
        "Run the whole suite, one file, one describe block, or one test",
        "AI auto-tagging turns hundreds of tests into runnable feature areas"
      ],
      tags: ["TypeScript", "Angular", "Vitest / Karma", "Copilot Tools"],
      install: {
        label: "Install from the Marketplace →",
        url: "https://marketplace.visualstudio.com/items?itemName=MohitGhodke.angular-test-explorer-copilot-ready"
      }
    },
    {
      file: "token-explorer.vsix",
      title: "Knowing what a prompt costs before you send it",
      meta: "Token Explorer · Copilot Ready · 2026",
      image: "token budget dashboard",
      availability: "Live on the VS Code Marketplace — free",
      summary:
        "You hand a file to a model and find out what it cost afterwards; " +
        "context windows overflow quietly, and when an agent loop burns the " +
        "budget there is nothing to show where it went. This tokenizes as you " +
        "type — real tokenizers where they are published, a calibrated BPE " +
        "proxy where they are not — and puts the count, the context-window " +
        "percentage and the estimated cost in front of you first.",
      outcomes: [
        "Live token count, context % and cost, per model, before you send",
        "Multi-file selection adds up to one budget you can check against",
        "Request Lens splits a session into prompt, reply, reasoning and tools"
      ],
      tags: ["TypeScript", "Tokenizers", "LLM Pricing", "VS Code API"],
      install: {
        label: "Install from the Marketplace →",
        url: "https://marketplace.visualstudio.com/items?itemName=MohitGhodke.token-explorer-copilot-ready"
      }
    },
    {
      file: "mcp-server-explorer.vsix",
      title: "Managing MCP servers without editing JSON",
      meta: "MCP Server Explorer · Copilot Ready · 2026",
      image: "MCP server sidebar",
      availability: "Live on the VS Code Marketplace — free",
      summary:
        "MCP server config is hand-edited JSON in two places at once — user " +
        "profile and workspace — so it drifts, duplicates, and resists being " +
        "shared with a teammate. When a server fails to appear you are left " +
        "guessing between the config, the command and the registration. This " +
        "puts both scopes in one live tree, adds servers through a guided " +
        "flow, and will diagnose one end to end when it misbehaves.",
      outcomes: [
        "User and workspace configs in one tree, reloaded as files change",
        "Describe a server in English instead of writing its JSON",
        "Import / export to move a working set between machines or teammates"
      ],
      tags: ["TypeScript", "MCP", "VS Code API", "Copilot Chat"],
      install: {
        label: "Install from the Marketplace →",
        url: "https://marketplace.visualstudio.com/items?itemName=MohitGhodke.mcp-server-explorer-copilot-ready"
      },
      repo: "https://github.com/MohitGhodke/MCPServerExplorer"
    }
  ];

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.extensions = extensions;
  if (typeof module === "object" && module.exports) module.exports = extensions;
})(typeof globalThis !== "undefined" ? globalThis : this);

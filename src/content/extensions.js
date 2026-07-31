/**
 * ▸ EDIT ME — the VS Code extensions inside the "VS Code Extensions" folder.
 *
 * Same shape as a case study in `projects.js`, and the same detail window
 * renders both: one folder holds shipped tools, the other holds the work you
 * did somewhere. Add a fifth and it appears in the folder on its own.
 *
 *   file     the filename shown under the icon — keep the ".vsix" suffix
 *   title    the headline inside the window: what it does for you
 *   meta     "Display Name · Year"
 *   image    caption for the hero well (swap for a real screenshot when you have one)
 *   summary  one paragraph: the friction first, then how this removes it
 *   outcomes three bullets — what you get, not how it is built
 *   tags     the stack
 *   repo     the public repo; the window links out to it for the technical detail
 *
 * These four share one idea: the sidebar tool you already know, plus the same
 * information handed to Copilot as agent tools, so the question can be asked in
 * English instead of clicked for. Keep the write-ups short — the repo is where
 * the detail belongs.
 */
;(function (global) {
  "use strict";

  var extensions = [
    {
      file: "csharp-test-explorer.vsix",
      title: "Running the .NET tests you meant, not all of them",
      meta: "C# Test Explorer · Copilot Ready · 2026",
      image: "tests grouped by category",
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
      repo: "https://github.com/MohitGhodke/DotNetTestExplorer"
    },
    {
      file: "angular-test-explorer.vsix",
      title: "One test sidebar for both Angular runners",
      meta: "Angular Test Explorer · Copilot Ready · 2026",
      image: "sidebar test tree",
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
      repo: "https://github.com/MohitGhodke/AngularTestExplorer"
    },
    {
      file: "token-explorer.vsix",
      title: "Knowing what a prompt costs before you send it",
      meta: "Token Explorer · Copilot Ready · 2026",
      image: "token budget dashboard",
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
      repo: "https://github.com/MohitGhodke/token-explorer"
    },
    {
      file: "mcp-server-explorer.vsix",
      title: "Managing MCP servers without editing JSON",
      meta: "MCP Server Explorer · Copilot Ready · 2026",
      image: "MCP server sidebar",
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
      repo: "https://github.com/MohitGhodke/MCPServerExplorer"
    }
  ];

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.extensions = extensions;
  if (typeof module === "object" && module.exports) module.exports = extensions;
})(typeof globalThis !== "undefined" ? globalThis : this);

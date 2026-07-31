/**
 * ▸ EDIT ME — the iOS apps inside the "iOS Apps" folder.
 *
 * Same shape as a case study in `projects.js` and an extension in
 * `extensions.js`; the same detail window renders all three. The folder sits
 * inside Work, because `desktop.js` gives that window `parent: "work"`.
 *
 *   file     the filename shown under the icon — keep the ".app" suffix
 *   title    the headline inside the window: what it does for you
 *   meta     "App Name · Platform · Year"
 *   image    caption for the hero well (swap for a real screenshot when you have one)
 *   summary  one paragraph: the friction first, then how the app answers it
 *   outcomes three bullets — what you get, not how it is built
 *   tags     the stack
 *   repo     optional; draws a "Source on GitHub" button in the window
 *
 * Add the next app as a second object here and it appears in the folder on its
 * own — no layout change, no template change.
 */
;(function (global) {
  "use strict";

  var apps = [
    {
      file: "dinkrum.app",
      title: "AI task management that stays on your phone",
      meta: "Dinkrum · iOS · 2026",
      image: "timeline and day cards",
      summary:
        "Every task manager that got clever about scheduling did it by putting " +
        "your data on someone's server — an account, a sync engine, an " +
        "analytics SDK. Dinkrum does the clever parts on the phone instead: " +
        "Apple's on-device foundation model picks the day for a task, tags it, " +
        "drafts its subtasks and writes the morning's goals. There is no " +
        "account and nothing is stored in the clear; the only inference that " +
        "can leave the device is a larger model on Apple's Private Cloud " +
        "Compute, which is off until you turn it on.",
      outcomes: [
        "Scheduling, tagging, subtasks and daily goals from the on-device model",
        "AES-256-GCM at rest, keys in the Keychain — no analytics, no third-party SDKs",
        "Siri, Shortcuts, Spotlight and a Live Activity timer; VoiceOver throughout"
      ],
      tags: ["Swift / SwiftUI", "FoundationModels", "App Intents", "CryptoKit"]
    }
  ];

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.apps = apps;
  if (typeof module === "object" && module.exports) module.exports = apps;
})(typeof globalThis !== "undefined" ? globalThis : this);

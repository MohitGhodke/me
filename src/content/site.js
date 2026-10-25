/**
 * ▸ EDIT ME — who you are and where you can be reached.
 *
 * Everything here is plain data. Nothing in this file affects layout; change a
 * value, reload the page, done.
 */
;(function (global) {
  "use strict";

  var site = {
    name: "Mohit Ghodke",
    role: "Lead Software Engineer",
    location: "Pune, IN",
    email: "mohitghodke@gmail.com",
    url: "https://mohitghodke.com",

    /** Shown on the wallpaper under the OS name. */
    tagline: "Lead Software Engineer — agent systems, agent skills and fine-tuned models",

    /** Used for <title>, the meta description and social cards. */
    meta: {
      title: "Mohit Ghodke — Lead Software Engineer",
      description:
        "Mohit Ghodke — lead software engineer. Builds the agent framework his platform's teams ship features with, cuts the tokens it costs, and fine-tunes small language models to run on-premise, on 13 years of C#/.NET. A portfolio built as a small operating system.",
      locale: "en",
      themeColor: "#8a9c93"
    },

    /**
     * Profile links. `id` is referenced by menus and the contact window, so
     * rename with care; `url` and `label` are free.
     *
     * `onResume` puts the link in the résumé header, next to the email — where
     * a reader looks first and where it also has to survive being printed.
     * Leave it off anything you wouldn't want on a PDF.
     */
    links: [
      { id: "github", label: "GitHub", url: "https://github.com/MohitGhodke", onResume: true },
      { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/mohit-ghodke-41754215/", onResume: true }
    ],

    /** Copy shown by the toast after a Copy command. */
    toasts: {
      emailCopied: "Email address copied",
      linkCopied: "Link copied",
      copyFailed: "Couldn't copy — select it instead",
      desktopTidied: "Desktop cleaned up"
    }
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.site = site;
  if (typeof module === "object" && module.exports) module.exports = site;
})(typeof globalThis !== "undefined" ? globalThis : this);

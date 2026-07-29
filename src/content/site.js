/**
 * ▸ EDIT ME — who you are and where you can be reached.
 *
 * Everything here is plain data. Nothing in this file affects layout; change a
 * value, reload the page, done.
 *
 * ⚠︎ PLACEHOLDER: `links` and `location` still hold sample values.
 */
;(function (global) {
  "use strict";

  var site = {
    name: "Mohit Ghodke",
    role: "Lead Software Engineer",
    location: "Pune, IN",                                    // PLACEHOLDER
    email: "hello@mohitghodke.com",
    url: "https://mohitghodke.com",

    /** Shown on the wallpaper under the OS name. */
    tagline: "Lead Software Engineer — systems, platform, scale",

    /** Used for <title>, the meta description and social cards. */
    meta: {
      title: "Mohit Ghodke — Lead Software Engineer",
      description:
        "The portfolio of Mohit Ghodke, a lead software engineer working on " +
        "backend systems, platform and scale — presented as a small operating system.",
      locale: "en",
      themeColor: "#8a9c93"
    },

    /**
     * Profile links. `id` is referenced by menus and the contact window, so
     * rename with care; `url` and `label` are free.
     */
    links: [
      { id: "github", label: "GitHub", url: "https://github.com/MohitGhodke" },       // PLACEHOLDER
      { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/" },        // PLACEHOLDER
      { id: "writing", label: "Writing", url: "https://mohitghodke.com/writing" }     // PLACEHOLDER
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

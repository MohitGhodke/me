/**
 * ▸ EDIT ME — the Contact window.
 *
 * The form has no backend: submitting composes a `mailto:` with whatever was
 * typed, so nothing is silently dropped and there is no server to keep alive.
 * Point `formAction` at a form endpoint (Formspree, Basin, your own handler)
 * if you'd rather collect messages over HTTP.
 */
;(function (global) {
  "use strict";

  var contact = {
    intro:
      "Hiring, advising, or just want to compare notes on distributed systems — " +
      "write to me. I reply within a day or two.",

    fields: {
      name: { label: "Your name", placeholder: "Jane Doe" },
      message: { label: "Message", placeholder: "What's on your mind?" }
    },

    submitLabel: "Send",
    /** null = compose a mailto:. Otherwise an https:// endpoint that accepts POST. */
    formAction: null,

    /** Shown next to the button. */
    fallbackPrefix: "or email"
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.contact = contact;
  if (typeof module === "object" && module.exports) module.exports = contact;
})(typeof globalThis !== "undefined" ? globalThis : this);

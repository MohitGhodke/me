/**
 * Clipboard access that reports honestly.
 *
 * `navigator.clipboard` is unavailable on insecure origins and rejects when the
 * document is not focused, so the UI must not claim success unconditionally.
 * Resolves to `true` only when the text really reached the clipboard.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;

  /** Pre-`navigator.clipboard` fallback: a throwaway textarea plus execCommand. */
  function copyViaSelection(doc, text) {
    var area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
    doc.body.appendChild(area);

    var ok = false;
    try {
      area.select();
      area.setSelectionRange(0, text.length);
      ok = doc.execCommand("copy");
    } catch (err) {
      ok = false;
    } finally {
      area.remove();
    }
    return ok;
  }

  /**
   * @param {string} text
   * @param {object=} env  injectable `{ navigator, document, isSecureContext }`
   * @returns {Promise<boolean>} whether the copy actually happened
   */
  function copyText(text, env) {
    var e = env || global;
    var nav = e.navigator;
    var doc = e.document;

    var async =
      nav && nav.clipboard && e.isSecureContext !== false
        ? Promise.resolve(nav.clipboard.writeText(text)).then(
            function () { return true; },
            function () { return false; }
          )
        : Promise.resolve(false);

    return async.then(function (ok) {
      if (ok || !doc || !doc.body) return ok;
      return copyViaSelection(doc, text);
    });
  }

  var api = { copyText: copyText };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.clipboard = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

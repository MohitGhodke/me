/**
 * Small platform helpers: the menu-bar clock, viewport queries and a
 * localStorage wrapper that never throws (Safari private mode, disabled
 * storage, quota) so a failed read can't take the desktop down with it.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;
  var tokens = isNode ? require("../design/tokens.js") : global.MohitOS.tokens;

  /** Menu-bar clock: "9:41", localised to the visitor. */
  function formatTime(date, locales) {
    return (date || new Date()).toLocaleTimeString(locales || [], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function isMobileWidth(width) {
    return width < tokens.layout.mobileBreakpoint;
  }

  /** Best-effort persistence. Reads return `null` and writes return false on failure. */
  var storage = {
    get: function (key) {
      try {
        return global.localStorage ? global.localStorage.getItem(key) : null;
      } catch (err) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        if (!global.localStorage) return false;
        global.localStorage.setItem(key, value);
        return true;
      } catch (err) {
        return false;
      }
    }
  };

  /** Open an external link without handing the opener over to the target page. */
  function openExternal(url) {
    if (!url) return;
    var win = global.open(url, "_blank", "noopener,noreferrer");
    if (win) win.opener = null;
  }

  var api = {
    formatTime: formatTime,
    isMobileWidth: isMobileWidth,
    storage: storage,
    openExternal: openExternal
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.system = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

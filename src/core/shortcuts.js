/**
 * Keyboard shortcuts.
 *
 * The bindings are data (see `content/desktop.js`), so adding a command means
 * adding a row there — never editing the key handler. `match` is pure and takes
 * a plain descriptor rather than a KeyboardEvent, so it is testable in Node.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;

  /**
   * Normalise a KeyboardEvent into the shape `match` understands.
   * @param {KeyboardEvent} event
   * @param {Selection|null=} selection
   */
  function describe(event, selection) {
    return {
      key: String(event.key || "").toLowerCase(),
      mod: !!(event.metaKey || event.ctrlKey),
      shift: !!event.shiftKey,
      hasSelection: !!(selection && String(selection).length > 0)
    };
  }

  /**
   * @param {Array} bindings  [{ key, mod, shift?, action, requiresNoSelection? }]
   * @param {object} pressed  the descriptor from `describe`
   * @returns {object|null}   the matching binding
   */
  function match(bindings, pressed) {
    for (var i = 0; i < bindings.length; i++) {
      var b = bindings[i];
      if (b.key !== pressed.key) continue;
      if (!!b.mod !== pressed.mod) continue;
      if (!!b.shift !== pressed.shift) continue;
      if (b.requiresNoSelection && pressed.hasSelection) continue;
      return b;
    }
    return null;
  }

  /** "⌘R" / "^R" for display in the menus, matching the host platform. */
  function label(binding, isApple) {
    if (!binding) return "";
    var parts = [];
    if (binding.mod) parts.push(isApple === false ? "Ctrl+" : "⌘");
    if (binding.shift) parts.push(isApple === false ? "Shift+" : "⇧");
    parts.push(binding.key.toUpperCase());
    return parts.join("");
  }

  var api = { describe: describe, match: match, label: label };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.shortcuts = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

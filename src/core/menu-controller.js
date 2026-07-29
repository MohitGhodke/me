/**
 * Menu bar controller.
 *
 * Classic Mac behaviour: clicking a title latches the menu open, and while a
 * menu is latched, hovering a sibling switches to it.
 *
 * Every method returns a state patch (`{ menu }`) or `null` for "nothing
 * changed" — the same contract React's setState updater already accepts, so
 * the component never has to guess whether a re-render is warranted.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;

  /** @param {string[]} ids  menu ids, in bar order */
  function createMenuController(ids) {
    var known = Object.create(null);
    ids.forEach(function (id) { known[id] = true; });

    function assertKnown(id) {
      if (!known[id]) throw new Error('menu-controller: unknown menu "' + id + '"');
    }

    return {
      /** Click a title: latch it open, or close it if it was already open. */
      toggle: function (openId, id) {
        assertKnown(id);
        return { menu: openId === id ? null : id };
      },

      /** Hover a title: only follows the pointer once a menu is latched open. */
      hover: function (openId, id) {
        assertKnown(id);
        if (!openId || openId === id) return null;
        return { menu: id };
      },

      /** Dismiss — a click anywhere on the stage, or picking a command. */
      close: function (openId) {
        return openId == null ? null : { menu: null };
      },

      isOpen: function (openId, id) {
        return openId === id;
      }
    };
  }

  var api = { createMenuController: createMenuController };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.createMenuController = createMenuController;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

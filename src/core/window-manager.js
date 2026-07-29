/**
 * Window manager — the desktop's window state machine.
 *
 * Owns stacking order, placement and the arithmetic that keeps a window inside
 * the stage. Deliberately free of DOM access: the viewport is injected, and
 * every method is a pure `state -> state` transition, so the whole thing is
 * testable in Node.
 *
 *   state = { top: <highest z issued>, win: { [id]: { open, x, y, z } } }
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;
  var tokens = isNode ? require("../design/tokens.js") : global.MohitOS.tokens;

  var EMPTY = { top: 10, win: {} };

  /**
   * @param {object}  options
   * @param {object}  options.geometry  { [id]: { w, h, x, y } } default frames
   * @param {object=} options.viewport  { width(): number, height(): number }
   */
  function createWindowManager(options) {
    var geometry = options.geometry;
    var viewport =
      options.viewport ||
      {
        width: function () { return global.innerWidth; },
        height: function () { return global.innerHeight; }
      };
    var menuBarHeight =
      options.menuBarHeight != null ? options.menuBarHeight : tokens.layout.menuBarHeight;
    var gutter = tokens.layout.stageGutter;

    function frameOf(id) {
      var g = geometry[id];
      if (!g) throw new Error('window-manager: no geometry registered for "' + id + '"');
      return g;
    }

    /** Height of the stage — everything below the menu bar. */
    function stageHeight() {
      return viewport.height() - menuBarHeight;
    }

    function widthOf(id) {
      return Math.min(frameOf(id).w, viewport.width() - gutter);
    }

    function heightOf(id) {
      return Math.min(frameOf(id).h, stageHeight() - gutter);
    }

    /** Pull a position back inside the stage, falling back to the default. */
    function clamp(id, x, y) {
      var g = frameOf(id);
      var maxX = Math.max(8, viewport.width() - g.w - gutter);
      var maxY = Math.max(8, stageHeight() - heightOf(id) - 12);
      return {
        x: Math.min(x == null ? g.x : x, maxX),
        y: Math.min(y == null ? g.y : y, maxY)
      };
    }

    /** Position during a drag: the window may hang off-stage, but not escape. */
    function clampDrag(id, x, y) {
      var g = frameOf(id);
      return {
        x: Math.max(-g.w + 120, Math.min(x, viewport.width() - 90)),
        y: Math.max(0, Math.min(y, stageHeight() - heightOf(id) - 12))
      };
    }

    function get(state, id) {
      return state.win[id];
    }

    function isOpen(state, id) {
      var w = state.win[id];
      return !!(w && w.open);
    }

    function anyOpen(state) {
      return Object.keys(state.win).some(function (id) {
        return state.win[id].open;
      });
    }

    function patch(state, id, next) {
      var win = Object.assign({}, state.win);
      win[id] = Object.assign({}, state.win[id], next);
      return { top: state.top, win: win };
    }

    /** Open (or re-focus) a window, raising it to the front. */
    function open(state, id) {
      var current = state.win[id];
      var pos = current ? clamp(id, current.x, current.y) : clamp(id);
      var z = state.top + 1;
      var win = Object.assign({}, state.win);
      win[id] = { open: true, x: pos.x, y: pos.y, z: z };
      return { top: z, win: win };
    }

    function close(state, id) {
      return patch(state, id, { open: false });
    }

    function closeAll(state) {
      var win = {};
      Object.keys(state.win).forEach(function (id) {
        win[id] = Object.assign({}, state.win[id], { open: false });
      });
      return { top: state.top, win: win };
    }

    /** Raise a window. Returns `null` when it is already frontmost. */
    function bringFront(state, id) {
      var current = state.win[id];
      if (!current || current.z === state.top) return null;
      var z = state.top + 1;
      var win = Object.assign({}, state.win);
      win[id] = Object.assign({}, current, { z: z });
      return { top: z, win: win };
    }

    function dragTo(state, id, x, y) {
      return patch(state, id, clampDrag(id, x, y));
    }

    /** Re-clamp every window — used on resize. */
    function reflow(state) {
      var win = {};
      Object.keys(state.win).forEach(function (id) {
        var w = state.win[id];
        win[id] = Object.assign({}, w, clamp(id, w.x, w.y));
      });
      return { top: state.top, win: win };
    }

    /** Send every window back to its default position ("Clean Up Desktop"). */
    function tidy(state) {
      var win = {};
      Object.keys(state.win).forEach(function (id) {
        win[id] = Object.assign({}, state.win[id], clamp(id));
      });
      return { top: state.top, win: win };
    }

    /** Resolved geometry for rendering: position, size and stacking order. */
    function frame(state, id) {
      var w = state.win[id] || { x: 40, y: 40, z: 1 };
      return { x: w.x, y: w.y, z: w.z, w: widthOf(id), h: heightOf(id) };
    }

    return {
      empty: function () { return { top: EMPTY.top, win: {} }; },
      ids: function () { return Object.keys(geometry); },
      get: get,
      isOpen: isOpen,
      anyOpen: anyOpen,
      open: open,
      close: close,
      closeAll: closeAll,
      bringFront: bringFront,
      dragTo: dragTo,
      reflow: reflow,
      tidy: tidy,
      frame: frame,
      clamp: clamp
    };
  }

  var api = { createWindowManager: createWindowManager };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.createWindowManager = createWindowManager;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

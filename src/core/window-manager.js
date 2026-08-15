/**
 * Window manager — the desktop's window state machine.
 *
 * Owns stacking order, placement, size and the arithmetic that keeps a window
 * inside the stage. Deliberately free of DOM access: the viewport is injected,
 * and every method is a pure `state -> state` transition, so the whole thing is
 * testable in Node.
 *
 *   state = { top: <highest z issued>, win: { [id]: WindowState } }
 *
 * A window carries only what the visitor has changed. `w`/`h` are absent until
 * it is resized, so it keeps following its registered default frame — and
 * `restore` is the frame to come back to when a zoomed window is unzoomed.
 *
 *   WindowState = { open, x, y, z, w?, h?, zoomed?, restore? }
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
    var minWidth = tokens.layout.minWindowWidth;
    var minHeight = tokens.layout.minWindowHeight;

    function frameOf(id) {
      var g = geometry[id];
      if (!g) throw new Error('window-manager: no geometry registered for "' + id + '"');
      return g;
    }

    /** Height of the stage — everything below the menu bar. */
    function stageHeight() {
      return viewport.height() - menuBarHeight;
    }

    /** The frame a zoomed window takes: the whole stage, edge to edge. */
    function zoomSize() {
      return { w: viewport.width(), h: stageHeight() };
    }

    /** A resized window still has to fit the stage, and stay grabbable. */
    function boundSize(w, h) {
      return {
        w: Math.max(minWidth, Math.min(w, viewport.width())),
        h: Math.max(minHeight, Math.min(h, stageHeight()))
      };
    }

    /**
     * The size a window renders at. Zoom wins, then whatever the visitor
     * dragged it to, and otherwise the registered default frame — trimmed to
     * leave a gutter, so a fresh window never touches the edges.
     *
     * @param {object=} win  the window's state, or nothing for its default
     */
    function sizeOf(win, id) {
      if (win && win.zoomed) return zoomSize();
      if (win && win.w != null && win.h != null) return boundSize(win.w, win.h);
      var g = frameOf(id);
      return {
        w: Math.min(g.w, viewport.width() - gutter),
        h: Math.min(g.h, stageHeight() - gutter)
      };
    }

    /**
     * Pull a position back inside the stage, falling back to the default.
     * @param {object=} win  sized against this window's state, if it has one
     */
    function clamp(id, x, y, win) {
      var g = frameOf(id);
      var size = sizeOf(win, id);
      var maxX = Math.max(8, viewport.width() - size.w - gutter);
      var maxY = Math.max(8, stageHeight() - size.h - 12);
      return {
        x: Math.min(x == null ? g.x : x, maxX),
        y: Math.min(y == null ? g.y : y, maxY)
      };
    }

    /** Position during a drag: the window may hang off-stage, but not escape. */
    function clampDrag(id, x, y, win) {
      var size = sizeOf(win, id);
      return {
        x: Math.max(-size.w + 120, Math.min(x, viewport.width() - 90)),
        y: Math.max(0, Math.min(y, stageHeight() - size.h - 12))
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

    /** Every open window, back to front. */
    function openIds(state) {
      return Object.keys(state.win)
        .filter(function (id) { return state.win[id].open; })
        .sort(function (a, b) { return state.win[a].z - state.win[b].z; });
    }

    function openCount(state) {
      return openIds(state).length;
    }

    /**
     * Close windows from the front until at most `depth` are left open.
     *
     * On mobile every window fills the stage, so the open windows are not a
     * scattered desktop but a stack — only the frontmost is visible, and
     * closing it reveals the one underneath. That is a back stack, and this is
     * what unwinds it: `index.html` keeps one browser history entry per open
     * window, so the phone's back gesture lands here.
     */
    function closeToDepth(state, depth) {
      var open = openIds(state);
      if (open.length <= depth) return state;
      var win = Object.assign({}, state.win);
      open.slice(depth).forEach(function (id) {
        win[id] = Object.assign({}, win[id], { open: false });
      });
      return { top: state.top, win: win };
    }

    function patch(state, id, next) {
      var win = Object.assign({}, state.win);
      win[id] = Object.assign({}, state.win[id], next);
      return { top: state.top, win: win };
    }

    /**
     * Open (or re-focus) a window, raising it to the front. A window that was
     * moved, resized or zoomed comes back the way the visitor left it.
     */
    function open(state, id) {
      var current = state.win[id];
      var pos = current
        ? current.zoomed
          ? { x: 0, y: 0 }
          : clamp(id, current.x, current.y, current)
        : clamp(id);
      var z = state.top + 1;
      var win = Object.assign({}, state.win);
      win[id] = Object.assign({}, current, { open: true, x: pos.x, y: pos.y, z: z });
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

    /** A zoomed window fills the stage, so there is nowhere left to drag it. */
    function dragTo(state, id, x, y) {
      var current = state.win[id];
      if (current && current.zoomed) return state;
      return patch(state, id, clampDrag(id, x, y, current));
    }

    /**
     * Resize from the grow handle: the bottom-right corner follows the pointer,
     * down to a usable minimum and no further than the edge of the stage.
     */
    function resizeTo(state, id, w, h) {
      var current = state.win[id];
      if (!current) return state;
      var size = boundSize(
        Math.min(w, viewport.width() - Math.max(0, current.x)),
        Math.min(h, stageHeight() - Math.max(0, current.y))
      );
      return patch(state, id, { w: size.w, h: size.h, zoomed: false, restore: null });
    }

    /**
     * The zoom box: fill the stage, or go back to the frame the window had
     * before it was zoomed.
     */
    function toggleZoom(state, id) {
      var current = state.win[id];
      if (!current) return state;

      if (!current.zoomed) {
        return patch(state, id, {
          zoomed: true,
          restore: { x: current.x, y: current.y, w: current.w, h: current.h },
          x: 0,
          y: 0
        });
      }

      // `restore.w`/`.h` are undefined for a window that was never resized,
      // which is exactly the "follow the default frame" state to return to.
      var restore = current.restore || clamp(id);
      var pos = clamp(id, restore.x, restore.y, restore);
      return patch(state, id, {
        zoomed: false,
        restore: null,
        w: restore.w,
        h: restore.h,
        x: pos.x,
        y: pos.y
      });
    }

    /** Re-clamp every window — used when the viewport changes. */
    function reflow(state) {
      var win = {};
      Object.keys(state.win).forEach(function (id) {
        var w = state.win[id];
        win[id] = w.zoomed
          ? Object.assign({}, w, { x: 0, y: 0 })
          : Object.assign({}, w, clamp(id, w.x, w.y, w));
      });
      return { top: state.top, win: win };
    }

    /** Send every window back to its default frame ("Clean Up Desktop"). */
    function tidy(state) {
      var win = {};
      Object.keys(state.win).forEach(function (id) {
        win[id] = Object.assign({}, state.win[id], clamp(id), {
          w: null,
          h: null,
          zoomed: false,
          restore: null
        });
      });
      return { top: state.top, win: win };
    }

    /** Resolved geometry for rendering: position, size and stacking order. */
    function frame(state, id) {
      var w = state.win[id] || { x: 40, y: 40, z: 1 };
      var size = sizeOf(state.win[id], id);
      return { x: w.x, y: w.y, z: w.z, w: size.w, h: size.h, zoomed: !!w.zoomed };
    }

    return {
      empty: function () { return { top: EMPTY.top, win: {} }; },
      ids: function () { return Object.keys(geometry); },
      get: get,
      isOpen: isOpen,
      anyOpen: anyOpen,
      openCount: openCount,
      open: open,
      close: close,
      closeAll: closeAll,
      closeToDepth: closeToDepth,
      bringFront: bringFront,
      dragTo: dragTo,
      resizeTo: resizeTo,
      toggleZoom: toggleZoom,
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

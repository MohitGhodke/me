/**
 * Mohit OS 1.0 — style builders.
 *
 * Every repeated or state-dependent style string in the interface is produced
 * here from `tokens`, so the template holds structure and the design system
 * holds appearance. One-off decorative styles stay inline in the template.
 *
 * Each builder returns a CSS declaration string ending in ";" — the DC runtime
 * parses that into a React style object.
 */
;(function (global) {
  "use strict";

  var tokens =
    typeof module === "object" && module.exports
      ? require("./tokens.js")
      : global.MohitOS.tokens;

  // Every builder below reaches for `c.ink`, `c.paper`, etc. — none of them
  // touch `tokens.color` directly, so pointing this at the CSS custom
  // properties instead of a palette object is what makes every one of them
  // theme-aware without a rewrite. See `cssVariables(theme)`, below, for the
  // other half: publishing the right palette onto those properties.
  var c = {
    ink: "var(--mos-ink)",
    paper: "var(--mos-paper)",
    page: "var(--mos-page)",
    desktop: "var(--mos-desktop)",
    accent: "var(--mos-accent)",
    accentText: "var(--mos-accent-text)",
    link: "var(--mos-link)",
    linkHoverBg: "var(--mos-link-hover-bg)",
    rule: "var(--mos-rule)",
    ruleFaint: "var(--mos-rule-faint)",
    wash: "var(--mos-wash)",
    termText: "var(--mos-term-text)",
    termDim: "var(--mos-term-dim)"
  };
  var f = tokens.font;
  var s = tokens.size;
  var b = tokens.border;
  var sh = tokens.shadow;
  var m = tokens.motion;
  var l = tokens.layout;

  function join(parts) {
    return parts.filter(Boolean).join("") ;
  }

  /** Silkscreen text at a given px size. */
  function pixelText(px, extra) {
    return "font-family:" + f.pixel + ";font-size:" + px + "px;" + (extra || "");
  }

  /* ---------------------------------------------------------------- menu bar */

  function menuBar() {
    return join([
      "position:relative;z-index:5000;flex:0 0 auto;display:flex;align-items:stretch;",
      "height:" + l.menuBarHeight + "px;background:" + c.paper + ";",
      "border-bottom:" + b.frame + ";padding:0 8px;",
      pixelText(s.chrome, "letter-spacing:0.02em;")
    ]);
  }

  /**
   * A top-level menu title. `isApple` is the logo slot, which is tighter on the
   * right so the square sits flush with the label that follows it.
   */
  function menuBarItem(active, isApple) {
    return join([
      "position:relative;display:flex;align-items:center;cursor:default;",
      "padding:" + (isApple ? "0 10px 0 4px" : "0 10px") + ";",
      active ? "background:" + c.ink + ";color:" + c.paper + ";" : ""
    ]);
  }

  function menuPanel(minWidth) {
    return join([
      "position:absolute;top:100%;left:0;min-width:" + minWidth + "px;",
      "background:" + c.paper + ";color:" + c.ink + ";border:" + b.frame + ";",
      "box-shadow:" + sh.panel + ";padding:3px 0;cursor:default;",
      "animation:" + m.dropIn + ";"
    ]);
  }

  /**
   * A row inside an open menu. `layout` is "plain", "split" (label pushed away
   * from a keyboard shortcut) or "tick" (checkmark gutter).
   */
  function menuItem(options) {
    var o = options || {};
    var base = "padding:7px 14px;white-space:nowrap;";
    if (o.layout === "split") {
      base = "display:flex;justify-content:space-between;gap:20px;" + base;
    } else if (o.layout === "tick") {
      base = "display:flex;gap:8px;padding:7px 14px 7px 10px;white-space:nowrap;";
    }
    return base + (o.disabled ? "opacity:0.32;pointer-events:none;" : "");
  }

  function menuSeparator() {
    return "height:1px;background:" + c.rule + ";margin:4px 8px;";
  }

  /* ------------------------------------------------------------------ window */

  /**
   * The outer window frame. On mobile a window fills the stage instead of
   * floating, so position and chrome collapse. A zoomed window fills the stage
   * too, so it drops the rounding and the drop shadow it has nothing to cast
   * onto.
   *
   * @param {number=} keyboardInset  pixels of screen the on-screen keyboard is
   *   covering. A full-screen window is sized to the layout viewport, which
   *   the keyboard doesn't change — so without this the input a phone just
   *   opened the keyboard for is sitting underneath it. Lifting the whole
   *   window instead of scrolling within it is what makes Chirp behave like a
   *   chat app: transcript above, prompt on top of the keyboard.
   */
  function windowFrame(frame, isMobile, keyboardInset) {
    var base =
      "display:flex;flex-direction:column;border:" + b.frame + ";" +
      "background:" + c.paper + ";overflow:hidden;animation:" + m.popIn + ";";

    if (isMobile) {
      var bottom = keyboardInset > 0 ? keyboardInset : 0;
      return join([
        base,
        "position:absolute;left:0;right:0;top:0;bottom:" + bottom + "px;",
        "border-width:0;z-index:" + (900 + frame.z) + ";"
      ]);
    }
    return join([
      base,
      "position:absolute;left:" + frame.x + "px;top:" + frame.y + "px;",
      "width:" + frame.w + "px;height:" + frame.h + "px;",
      frame.zoomed ? "" : "border-radius:" + b.radius + ";box-shadow:" + sh.window + ";",
      "z-index:" + (100 + frame.z) + ";"
    ]);
  }

  /**
   * The strip at the top of a window — and, undraggable, the header of the
   * mobile list.
   *
   * `touch-action:none` is what lets a finger drag the window rather than pan
   * the page: without it the browser claims the gesture and the pointermove
   * stream stops after a few pixels. Only the draggable variant takes it, so a
   * strip that is pure decoration never blocks a scroll that starts on it.
   *
   * @param {boolean} draggable
   */
  function titleBar(draggable) {
    return join([
      "display:flex;align-items:center;gap:8px;padding:5px 8px;",
      "border-bottom:" + b.frame + ";",
      "background:repeating-linear-gradient(" + c.ink + " 0 1px," + c.paper + " 1px 3px);",
      "cursor:default;flex:0 0 auto;",
      draggable ? "touch-action:none;" : ""
    ]);
  }

  /** The close box and the (decorative) grow box share one square. */
  function titleBarButton(interactive) {
    return join([
      "width:14px;height:14px;border:" + b.frame + ";background:" + c.paper + ";",
      "flex:0 0 auto;",
      interactive ? "cursor:pointer;" : ""
    ]);
  }

  /**
   * The close box — and, on mobile, the way back out of a window.
   *
   * On the desktop it is the Mac idiom: a small square in the corner, which
   * works because the window is one of several floating over a desktop you can
   * still see, so "close" is obviously what it does. On a phone the window
   * fills the screen, nothing is left behind it to close *back to*, and the
   * same square reads as decoration — visitors reach for the back gesture
   * instead and find nothing. So here it becomes a labelled button at the full
   * touch target. The gesture itself is the other half of the fix, and lives
   * in `index.html`: one history entry per open window.
   */
  function titleBarClose(isMobile) {
    if (!isMobile) return titleBarButton(true);
    return join([
      "display:flex;align-items:center;justify-content:center;flex:0 0 auto;",
      "min-height:" + l.minTouchTarget + "px;padding:0 14px;",
      "border:" + b.frame + ";border-radius:" + b.radiusSm + ";",
      "background:" + c.paper + ";color:" + c.ink + ";",
      "cursor:pointer;user-select:none;-webkit-user-select:none;",
      // The bar itself doesn't claim touches (it isn't draggable on mobile),
      // so the button only has to opt out of the double-tap zoom delay.
      "touch-action:manipulation;white-space:nowrap;",
      pixelText(s.chromeSmall, "letter-spacing:0.04em;")
    ]);
  }

  /**
   * The zoom box: the close box's square with the smaller one nested in its
   * corner. Hidden on mobile, where a window already fills the stage.
   */
  function titleBarZoom(isMobile) {
    if (isMobile) return "display:none;";
    return join([
      titleBarButton(true),
      // Painted rather than nested, so the box stays a single element and the
      // hover rule can invert it in one declaration. Held off the frame on
      // every side: 6px of ink in a 10px interior reads as a filled box.
      "background-image:linear-gradient(" + c.ink + "," + c.ink + ");",
      "background-size:5px 5px;background-position:2px 2px;background-repeat:no-repeat;"
    ]);
  }

  /**
   * The grow handle in a window's bottom-right corner. Sits over the content
   * rather than in the layout, the way the corner of a scrollbar used to.
   */
  function resizeGrip(isMobile) {
    if (isMobile) return "display:none;";
    return join([
      "position:absolute;right:0;bottom:0;",
      "width:" + l.resizeGripSize + "px;height:" + l.resizeGripSize + "px;",
      "border-top:" + b.frame + ";border-left:" + b.frame + ";",
      "border-radius:" + b.radiusSm + " 0 0 0;",
      "background-color:" + c.paper + ";",
      "background-image:repeating-linear-gradient(-45deg," + c.ink + " 0 1px,transparent 1px 3px);",
      // As on the title bar: the gesture has to be ours, not the browser's.
      "cursor:nwse-resize;touch-action:none;z-index:2;"
    ]);
  }

  /**
   * A centred title is a desktop luxury: it needs matching furniture either
   * side, and on mobile the right-hand zoom box is gone while the left-hand
   * close box has grown into a Back button. So the title sits beside that
   * button instead, and truncates rather than pushing it off the bar.
   */
  function titleBarTitle(isMobile) {
    return join([
      "flex:1 1 auto;background:" + c.paper + ";padding:2px 10px;",
      isMobile ? "text-align:left;text-overflow:ellipsis;" : "text-align:center;",
      "white-space:nowrap;overflow:hidden;",
      pixelText(s.chrome)
    ]);
  }

  /** The "4 items" strip under a title bar. */
  function infoStrip() {
    return join([
      "display:flex;justify-content:space-between;padding:4px 10px;",
      "border-bottom:" + b.frame + ";flex:0 0 auto;opacity:0.75;",
      pixelText(s.chromeSmall)
    ]);
  }

  /** Scrolling area of a window. `surface` is "page" (documents) or "paper". */
  function windowBody(surface, padding) {
    return join([
      "flex:1 1 auto;overflow:auto;",
      "background:" + (surface === "paper" ? c.paper : c.page) + ";",
      padding ? "padding:" + padding + ";" : ""
    ]);
  }

  /* ----------------------------------------------------------------- content */

  /**
   * Small uppercase Silkscreen heading used above every content block.
   * @param {object=} options  { rule: draw a hairline under it, size: px }
   */
  function sectionLabel(options) {
    var o = options || {};
    return join([
      pixelText(o.size || s.label, "text-transform:uppercase;"),
      o.rule ? "border-bottom:" + b.rule + ";padding-bottom:6px;" : ""
    ]);
  }

  /**
   * "Live on the VS Code Marketplace" above an item's headline.
   *
   * Filled with the accent rather than outlined like a tag: it is a fact about
   * the thing being available, not another piece of its stack, and it has to
   * win the glance against four tag chips further down the window.
   */
  function statusBadge() {
    return join([
      pixelText(s.chromeSmall, "letter-spacing:0.02em;line-height:1.5;"),
      "align-self:flex-start;border:" + b.frame + ";border-radius:" + b.radiusSm + ";",
      "padding:4px 8px;background:" + c.accent + ";color:" + c.accentText + ";"
    ]);
  }

  /**
   * The framing sentence under a section heading. Set a measure so it stays
   * readable when the window is zoomed to full screen.
   */
  function sectionNote() {
    return join([
      prose(s.proseDense),
      "opacity:0.8;max-width:56ch;"
    ]);
  }

  /**
   * A résumé section that opens a window. Reads as an ordinary section on the
   * page and on paper; the hover state is what says it can be clicked.
   */
  function resumeSection() {
    return join([
      "display:flex;flex-direction:column;gap:8px;cursor:pointer;",
      "margin:0 -10px;padding:8px 10px;border-radius:" + b.radiusSm + ";",
      "border:1px solid transparent;"
    ]);
  }

  /** The "Open Skills →" affordance under a résumé section summary. */
  function resumeSectionOpen() {
    return join([
      pixelText(s.chromeSmall),
      "align-self:flex-start;border:1px solid " + c.ink + ";",
      "border-radius:" + b.radiusSm + ";padding:4px 8px;background:" + c.paper + ";"
    ]);
  }

  /** The technology line under a résumé role. */
  function resumeStack() {
    return join([prose(s.proseDense), "opacity:0.7;"]);
  }

  /** A profile link in the résumé header: GitHub, LinkedIn. */
  function resumeLink() {
    return join([
      pixelText(s.chromeSmall),
      "text-decoration:none;color:" + c.ink + ";",
      "border:1px solid " + c.ink + ";border-radius:" + b.radiusSm + ";",
      "padding:4px 8px;background:" + c.paper + ";white-space:nowrap;"
    ]);
  }

  /** Skill pills ("solid") and project tags ("outline"). */
  function chip(variant) {
    if (variant === "outline") {
      return join([
        pixelText(s.chromeSmall),
        "border:1px solid " + c.ink + ";padding:4px 7px;background:" + c.paper + ";"
      ]);
    }
    return join([
      pixelText(s.icon),
      "border:" + b.frame + ";padding:5px 8px;background:" + c.paper + ";",
      "box-shadow:" + sh.chip + ";"
    ]);
  }

  /** Buttons meet the 44px touch target on every platform. */
  function button(variant) {
    var primary = variant === "primary";
    return join([
      pixelText(s.label),
      "text-decoration:none;border:" + b.frame + ";border-radius:" + b.radiusMd + ";",
      "padding:11px 18px;box-shadow:" + sh.button + ";cursor:pointer;",
      "min-height:" + l.minTouchTarget + "px;display:flex;align-items:center;",
      primary
        ? "background:" + c.accent + ";color:" + c.accentText + ";"
        : "background:" + c.paper + ";color:" + c.ink + ";"
    ]);
  }

  function prose(px) {
    return "font-size:" + (px || s.prose) + "px;line-height:1.65;text-wrap:pretty;";
  }

  /**
   * @param {{noZoom?: boolean}=} options  `noZoom` holds the text at 16px so
   *   iOS doesn't zoom the page in when it takes focus. Phones only — see
   *   `tokens.size.noZoom`.
   */
  function field(options) {
    var px = options && options.noZoom ? Math.max(s.prose, s.noZoom) : s.prose;
    return join([
      "font-family:" + f.body + ";font-size:" + px + "px;padding:9px 10px;",
      "border:" + b.frame + ";border-radius:" + b.radiusSm + ";",
      "background:" + c.page + ";color:" + c.ink + ";outline:none;"
    ]);
  }

  /**
   * Chirp's prompt line. The transcript above it is the terminal's own 11px,
   * but the one element a phone puts a keyboard under has to be 16px or the
   * page zooms — so on a phone it is the input, and only the input, that
   * grows. It also stops sharing the row's baseline with the `$`, which is
   * what keeps the bigger text from looking like a mistake.
   *
   * @param {boolean} isPhone
   */
  /**
   * The row Chirp's prompt sits on. On a phone it is the bottom edge of the
   * screen, so it keeps clear of the home indicator — and gains the height a
   * thumb expects of the one thing on screen it is meant to tap.
   *
   * @param {boolean} isPhone
   */
  function aiPromptRow(isPhone) {
    return join([
      "flex:0 0 auto;display:flex;align-items:center;gap:6px;",
      "border-top:1px solid " + c.termDim + ";padding-top:10px;",
      // The `$` sits in this row and inherits from it, so it grows with the
      // input rather than being left behind at the terminal's own size.
      isPhone ? "font-size:" + s.noZoom + "px;" : "",
      isPhone ? "padding-bottom:env(safe-area-inset-bottom,0px);" : ""
    ]);
  }

  /**
   * The block that blinks where the caret would be, if the terminal hadn't
   * hidden the real one. Sized to the text it stands in for.
   *
   * @param {boolean} isPhone
   */
  function aiCursor(isPhone) {
    return join([
      "display:inline-block;flex:0 0 auto;",
      isPhone ? "width:9px;height:18px;" : "width:8px;height:13px;",
      "background:" + c.termText + ";animation:" + m.blink + ";"
    ]);
  }

  function aiInput(isPhone) {
    return join([
      "flex:1 1 auto;min-width:0;background:transparent;border:none;outline:none;",
      // The block cursor next to the prompt stands in for the real caret.
      "caret-color:transparent;color:" + c.termText + ";",
      "font-family:" + f.pixel + ";",
      "font-size:" + (isPhone ? s.noZoom : s.chrome) + "px;",
      isPhone ? "padding:10px 0;min-height:" + l.minTouchTarget + "px;" : "padding:6px 0;min-height:28px;"
    ]);
  }

  /* ----------------------------------------------------------------- desktop */

  function desktopIcon() {
    return join([
      "direction:ltr;display:flex;flex-direction:column;align-items:center;gap:5px;",
      "padding:7px 4px 5px;cursor:default;border:1px dotted transparent;"
    ]);
  }

  /**
   * The boxed caption under a desktop icon. Wraps rather than overflowing:
   * short names still sit on one line, and a name like "VS Code Extensions"
   * stacks instead of spilling past the box.
   */
  function desktopIconLabel() {
    return join([
      pixelText(s.icon, "line-height:1.35;"),
      "text-align:center;color:" + c.ink + ";background:" + c.paper + ";",
      "border:1px solid " + c.ink + ";padding:2px 5px;max-width:100px;"
    ]);
  }

  /**
   * The chosen palette, published as CSS custom properties — this is the one
   * function that reads `tokens.color` directly. Every builder above reaches
   * for `c.ink` etc. (an alias for the property, not the value), so calling
   * this again with the other theme is the entire repaint.
   *
   * @param {"light"|"dark"} theme
   */
  function cssVariables(theme) {
    var p = tokens.color[theme] || tokens.color.light;
    return {
      "--mos-ink": p.ink,
      "--mos-paper": p.paper,
      "--mos-page": p.page,
      "--mos-desktop": p.desktop,
      "--mos-accent": p.accent,
      "--mos-accent-text": p.accentText,
      "--mos-link": p.link,
      "--mos-link-hover-bg": p.linkHoverBg,
      "--mos-wash": p.wash,
      "--mos-rule": p.rule,
      "--mos-rule-faint": p.ruleFaint,
      "--mos-term-bg": p.termBg,
      "--mos-term-text": p.termText,
      "--mos-term-dim": p.termDim,
      "--mos-font-body": f.body,
      "--mos-font-pixel": f.pixel
    };
  }

  var api = {
    pixelText: pixelText,
    menuBar: menuBar,
    menuBarItem: menuBarItem,
    menuPanel: menuPanel,
    menuItem: menuItem,
    menuSeparator: menuSeparator,
    windowFrame: windowFrame,
    titleBar: titleBar,
    titleBarButton: titleBarButton,
    titleBarClose: titleBarClose,
    titleBarZoom: titleBarZoom,
    titleBarTitle: titleBarTitle,
    resizeGrip: resizeGrip,
    infoStrip: infoStrip,
    windowBody: windowBody,
    sectionLabel: sectionLabel,
    statusBadge: statusBadge,
    sectionNote: sectionNote,
    resumeLink: resumeLink,
    resumeStack: resumeStack,
    resumeSection: resumeSection,
    resumeSectionOpen: resumeSectionOpen,
    chip: chip,
    button: button,
    prose: prose,
    field: field,
    aiInput: aiInput,
    aiPromptRow: aiPromptRow,
    aiCursor: aiCursor,
    desktopIcon: desktopIcon,
    desktopIconLabel: desktopIconLabel,
    cssVariables: cssVariables
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.styles = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

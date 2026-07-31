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

  var c = tokens.color;
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
   */
  function windowFrame(frame, isMobile) {
    var base =
      "display:flex;flex-direction:column;border:" + b.frame + ";" +
      "background:" + c.paper + ";overflow:hidden;animation:" + m.popIn + ";";

    if (isMobile) {
      return base + "position:absolute;inset:0;border-width:0;z-index:" + (900 + frame.z) + ";";
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

  function titleBarTitle() {
    return join([
      "flex:1 1 auto;text-align:center;background:" + c.paper + ";padding:2px 10px;",
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

  function field() {
    return join([
      "font-family:" + f.body + ";font-size:" + s.prose + "px;padding:9px 10px;",
      "border:" + b.frame + ";border-radius:" + b.radiusSm + ";",
      "background:" + c.page + ";color:" + c.ink + ";outline:none;"
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
      "text-align:center;color:#10120f;background:" + c.paper + ";",
      "border:1px solid " + c.ink + ";padding:2px 5px;max-width:100px;"
    ]);
  }

  /**
   * Token values published as CSS custom properties, so the stylesheet in
   * <helmet> can reference the same palette the JS builders use.
   */
  function cssVariables() {
    return {
      "--mos-ink": c.ink,
      "--mos-paper": c.paper,
      "--mos-page": c.page,
      "--mos-desktop": c.desktop,
      "--mos-accent": c.accent,
      "--mos-link": c.link,
      "--mos-link-hover-bg": c.linkHoverBg,
      "--mos-wash": c.wash,
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
    titleBarZoom: titleBarZoom,
    titleBarTitle: titleBarTitle,
    resizeGrip: resizeGrip,
    infoStrip: infoStrip,
    windowBody: windowBody,
    sectionLabel: sectionLabel,
    sectionNote: sectionNote,
    resumeLink: resumeLink,
    resumeStack: resumeStack,
    resumeSection: resumeSection,
    resumeSectionOpen: resumeSectionOpen,
    chip: chip,
    button: button,
    prose: prose,
    field: field,
    desktopIcon: desktopIcon,
    desktopIconLabel: desktopIconLabel,
    cssVariables: cssVariables
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.styles = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/**
 * Mohit OS 1.0 — design tokens.
 *
 * The palette, type scale and timings that `styles.js` composes from. Change a
 * token here and every style builder follows.
 *
 * Only values something actually reads live here: a token nothing consumes is
 * worse than no token, because changing it appears to do nothing. The purely
 * decorative one-offs in the template — the terminal's greens, the shutdown
 * screen, the wallpaper captions — are inline there on purpose, so they are not
 * duplicated as tokens that would never be read.
 */
;(function (global) {
  "use strict";

  var color = {
    /** Foreground / every border and rule. */
    ink: "#1b1a18",
    /** Chrome surfaces: menu bar, window frames, title bars. */
    paper: "#f5f2e8",
    /** Document surfaces: the inside of a window body. */
    page: "#fdfbf4",
    /** The desktop behind the windows. */
    desktop: "#8a9c93",

    accent: "oklch(0.62 0.14 40)",
    accentText: "#fdfbf4",
    link: "oklch(0.55 0.14 40)",
    linkHoverBg: "oklch(0.9 0.06 80)",

    rule: "rgba(27,26,24,0.3)",
    ruleFaint: "rgba(27,26,24,0.2)",
    wash: "rgba(27,26,24,0.05)",
    dropShadow: "rgba(0,0,0,0.35)",
    dropShadowStrong: "rgba(0,0,0,0.4)"
  };

  var font = {
    /** Bitmap face used for all chrome and headings. */
    pixel: "Silkscreen, monospace",
    /** Reading face used for prose. */
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif'
  };

  /** Type scale, in px. Names describe the role, not the size. */
  var size = {
    chrome: 11,
    chromeSmall: 9,
    icon: 9.5,
    label: 10,
    prose: 14,
    proseDense: 12.5,
    heading: 15
  };

  var border = {
    /** Every visible edge in the OS is 2px of ink. */
    frame: "2px solid " + color.ink,
    rule: "1px solid " + color.rule,
    radiusSm: "2px",
    radius: "3px",
    radiusMd: "4px"
  };

  var shadow = {
    window: "4px 4px 0 " + color.dropShadow,
    panel: "3px 3px 0 " + color.dropShadowStrong,
    button: "2px 2px 0 " + color.ink,
    chip: "2px 2px 0 " + color.ruleFaint
  };

  var motion = {
    popIn: "popin .12s ease-out",
    dropIn: "dropin .08s ease-out",
    /** How long the boot splash stays up, ms. */
    bootMs: 2100,
    /** How long a toast stays up, ms. */
    toastMs: 1900,
    /** Delay before the print dialog, so the resume window can paint first. */
    printDelayMs: 420,
    /** Menu-bar clock refresh interval, ms. */
    clockMs: 20000
  };

  var layout = {
    menuBarHeight: 28,
    /** Below this width the desktop metaphor is replaced by a stacked list. */
    mobileBreakpoint: 780,
    /** WCAG 2.5.8 minimum interactive target. */
    minTouchTarget: 44,
    /** Gap kept between a window and the edges of the stage. */
    stageGutter: 24,
    /** A window can be dragged down to this, but no smaller: the chrome and a
     *  line or two of content still have to fit. */
    minWindowWidth: 280,
    minWindowHeight: 160,
    /** The grow handle in a window's bottom-right corner. */
    resizeGripSize: 16
  };

  var api = {
    color: color,
    font: font,
    size: size,
    border: border,
    shadow: shadow,
    motion: motion,
    layout: layout
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.tokens = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

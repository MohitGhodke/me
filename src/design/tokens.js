/**
 * Mohit OS 1.0 — design tokens.
 *
 * The single source of truth for every colour, typeface, size and duration in
 * the interface. Nothing else in the codebase should contain a raw hex value.
 * Change a token here and the whole desktop follows.
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
    /** Flat fill used for empty media wells. */
    shade: "#eae5d6",

    accent: "oklch(0.62 0.14 40)",
    accentText: "#fdfbf4",
    link: "oklch(0.55 0.14 40)",
    linkHoverBg: "oklch(0.9 0.06 80)",

    terminalBg: "#1b1a18",
    terminalText: "#d9f2c4",
    terminalMuted: "#a9c99a",

    shutdownBg: "#1b1a18",
    shutdownText: "#e6e2d6",

    /** Text drawn straight onto the desktop wallpaper. */
    onDesktop: "rgba(255,255,255,0.92)",
    onDesktopMuted: "rgba(255,255,255,0.85)",

    rule: "rgba(27,26,24,0.3)",
    ruleFaint: "rgba(27,26,24,0.2)",
    hairline: "rgba(27,26,24,0.25)",
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
    proseSmall: 13,
    proseDense: 12.5,
    heading: 15,
    headingLarge: 17,
    display: 20
  };

  var space = {
    hair: 2,
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    xxl: 26
  };

  var border = {
    /** Every visible edge in the OS is 2px of ink. */
    frame: "2px solid " + color.ink,
    hair: "1px solid " + color.ruleFaint,
    rule: "1px solid " + color.rule,
    radiusSm: "2px",
    radius: "3px",
    radiusMd: "4px"
  };

  var shadow = {
    window: "4px 4px 0 " + color.dropShadow,
    panel: "3px 3px 0 " + color.dropShadowStrong,
    raised: "3px 3px 0 " + color.dropShadow,
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
    desktopIconWidth: 104
  };

  var api = {
    color: color,
    font: font,
    size: size,
    space: space,
    border: border,
    shadow: shadow,
    motion: motion,
    layout: layout
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.tokens = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

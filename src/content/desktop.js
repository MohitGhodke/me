/**
 * ▸ EDIT ME (structure) — the shape of the desktop itself.
 *
 * One registry describes every window: its icon, its default frame, and whether
 * it sits on the desktop. Adding a window means adding a row here and a block
 * in the template — no changes to the window manager, the menus or the
 * keyboard handler.
 *
 * Menus and shortcuts are data too, so a new command is a new row, never a new
 * branch in an event handler.
 */
;(function (global) {
  "use strict";

  /**
   * @typedef {object} WindowSpec
   * @property {string}  id         also the action id that opens it
   * @property {string}  title      shown in the title bar
   * @property {string=} icon       "doc" | "folder" | "app" — omit to hide from the desktop
   * @property {string=} meta       subtitle in list view and on mobile
   * @property {object}  geometry   default frame { w, h, x, y } in CSS px
   */
  var windows = [
    {
      id: "resume",
      title: "Resume.doc",
      icon: "doc",
      meta: "9 years, one page",
      geometry: { w: 580, h: 540, x: 90, y: 60 }
    },
    {
      id: "work",
      title: "Work",
      icon: "folder",
      meta: "4 case studies",
      geometry: { w: 520, h: 320, x: 150, y: 120 }
    },
    {
      id: "about",
      title: "About Me.txt",
      icon: "doc",
      meta: "Who I am",
      geometry: { w: 460, h: 400, x: 190, y: 150 }
    },
    {
      id: "skills",
      title: "Skills",
      icon: "app",
      meta: "Languages, platform, leading",
      geometry: { w: 430, h: 470, x: 260, y: 90 }
    },
    {
      id: "play",
      title: "Playground",
      icon: "app",
      meta: "Side projects",
      geometry: { w: 500, h: 400, x: 130, y: 190 }
    },
    {
      id: "contact",
      title: "Contact",
      icon: "app",
      meta: "Get in touch",
      geometry: { w: 430, h: 470, x: 300, y: 120 }
    },
    // Opened from inside the Work folder, so it has no desktop icon.
    {
      id: "project",
      title: "Case",
      geometry: { w: 560, h: 500, x: 220, y: 80 }
    }
  ];

  /**
   * Menu bar. `kind: "separator"` draws a rule; everything else is a command.
   *
   *   act        action id — a window id, a built-in verb, or "link"
   *   linkId     for act:"link", which entry of site.links to open
   *   shortcut   action id whose key binding is displayed on the right
   *   tickWhen   "view:icons" — draws a checkmark while that view is active
   *   enabledWhen  "anyWindowOpen" — greys the row out otherwise
   *   disabled   permanently greyed out (present for period flavour)
   */
  var menus = [
    {
      id: "apple",
      label: "",
      isApple: true,
      width: 208,
      items: [
        { label: "About This Portfolio", act: "about" },
        { kind: "separator" },
        { label: "System Profile", act: "skills" },
        { label: "Contact Mohit…", act: "contact" }
      ]
    },
    {
      id: "file",
      label: "File",
      width: 244,
      items: [
        { label: "Open Resume", act: "resume", shortcut: "resume" },
        { label: "Open Work Folder", act: "work", shortcut: "work" },
        { label: "Open Playground", act: "play" },
        { kind: "separator" },
        { label: "Save Resume as PDF…", act: "print", shortcut: "print" },
        { kind: "separator" },
        { label: "Close All Windows", act: "closeall", enabledWhen: "anyWindowOpen" }
      ]
    },
    {
      id: "edit",
      label: "Edit",
      width: 236,
      items: [
        { label: "Copy Email Address", act: "copymail", shortcut: "copymail" },
        { label: "Copy Link to This Site", act: "copylink" },
        { kind: "separator" },
        { label: "Undo", disabled: true },
        { label: "Cut", disabled: true },
        { label: "Paste", disabled: true }
      ]
    },
    {
      id: "view",
      label: "View",
      width: 224,
      items: [
        { label: "as Icons", act: "view:icons", tickWhen: "view:icons" },
        { label: "as List", act: "view:list", tickWhen: "view:list" },
        { kind: "separator" },
        { label: "Clean Up Desktop", act: "cleanup", enabledWhen: "anyWindowOpen" }
      ]
    },
    {
      id: "special",
      label: "Special",
      width: 220,
      items: [
        { label: "Open GitHub", act: "link", linkId: "github" },
        { label: "Open LinkedIn", act: "link", linkId: "linkedin" },
        { kind: "separator" },
        { label: "Restart", act: "restart" },
        { label: "Shut Down", act: "shutdown" }
      ]
    }
  ];

  /** Key bindings. `action` matches an `act` id above. */
  var shortcuts = [
    { key: "r", mod: true, action: "resume" },
    { key: "w", mod: true, action: "work" },
    { key: "p", mod: true, action: "print" },
    // Only when nothing is selected, so ⌘C still copies a selection normally.
    { key: "c", mod: true, action: "copymail", requiresNoSelection: true, passive: true }
  ];

  /** Chrome copy that isn't tied to any one window. */
  var shell = {
    osName: "MOHIT OS 1.0",
    desktopHint: "Double-click an icon to open it.",
    mobileHint: "MOHIT OS 1.0 — tap a row to open it.",
    workHint: "Double-click to open a case",
    listHeader: { name: "Name", kind: "Kind" },
    boot: { title: "Welcome to Mohit OS", status: "Starting up…" },
    shutdown: { message: "It is now safe to close this browser tab.", restart: "Start Up Again" }
  };

  var desktop = {
    windows: windows,
    menus: menus,
    shortcuts: shortcuts,
    shell: shell
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.desktop = desktop;
  if (typeof module === "object" && module.exports) module.exports = desktop;
})(typeof globalThis !== "undefined" ? globalThis : this);

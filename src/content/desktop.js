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
   * @property {string=} parent     id of a folder window this one sits inside
   * @property {object}  geometry   default frame { w, h, x, y } in CSS px
   * @property {string[]=} keywords what a visitor might call this window when
   *           asking Chirp to open it ("pull up his cv"). Matched as whole
   *           words or phrases, and unique across windows — validation rejects
   *           a keyword claimed by two of them, since Chirp could only guess.
   *           Omit to keep a window out of Chirp's reach.
   */
  var windows = [
    {
      id: "resume",
      title: "Resume.doc",
      icon: "doc",
      meta: "13 years, one page",
      keywords: ["resume", "resume doc", "cv", "career", "work history", "employment", "job history"],
      geometry: { w: 580, h: 820, x: 90, y: 30 }
    },
    {
      id: "work",
      title: "Work",
      icon: "folder",
      meta: "Shipped, downloadable work",
      // "his work" and "the work" rather than a bare "work": on its own the
      // word is usually a verb ("who did he work for?"), and a keyword that
      // fires on half the questions asked makes Chirp tiresome.
      keywords: ["work folder", "his work", "the work", "portfolio", "shipped work", "case studies", "case study"],
      geometry: { w: 520, h: 320, x: 150, y: 120 }
    },
    // Lives inside the Work folder rather than on the desktop: `parent` puts a
    // folder icon in that window, and omitting `icon` keeps it off the desktop.
    {
      id: "extensions",
      title: "VS Code Extensions",
      parent: "work",
      keywords: [
        "extensions", "extension", "vs code", "vscode", "vs code extensions", "plugins",
        // The listing is where they live, so "open the marketplace ones" lands
        // on this folder — the mirror of "app store" on iOS Apps below.
        "marketplace", "vs code marketplace"
      ],
      geometry: { w: 540, h: 340, x: 180, y: 160 }
    },
    {
      id: "apps",
      title: "iOS Apps",
      parent: "work",
      keywords: ["ios", "ios apps", "iphone", "iphone apps", "app store", "mobile apps"],
      geometry: { w: 500, h: 320, x: 210, y: 190 }
    },
    {
      id: "about",
      title: "About Me.txt",
      icon: "doc",
      meta: "Who I am",
      keywords: ["about", "about me", "bio", "biography", "background", "who he is", "who is he"],
      geometry: { w: 500, h: 644, x: 200, y: 76 }
    },
    {
      id: "skills",
      title: "Skills",
      icon: "app",
      meta: "AI, backend, front end",
      keywords: ["skills", "skill", "tech stack", "stack", "technologies", "toolkit", "expertise"],
      geometry: { w: 470, h: 716, x: 240, y: 48 }
    },
    {
      id: "play",
      title: "Playground",
      icon: "app",
      meta: "Side projects",
      keywords: ["playground", "side projects", "experiments", "tinkering", "hobby projects"],
      geometry: { w: 500, h: 400, x: 130, y: 190 }
    },
    {
      id: "contact",
      title: "Contact",
      icon: "app",
      meta: "Get in touch",
      keywords: ["contact", "contact form", "get in touch", "reach him", "hire him", "message him"],
      geometry: { w: 430, h: 470, x: 300, y: 120 }
    },
    {
      id: "ai",
      title: "Chirp AI",
      icon: "ai",
      meta: "Local AI, ask anything",
      // Only ever the target of "close chirp": Chirp can't offer to open the
      // window the conversation is already happening in.
      keywords: ["chirp ai", "this window", "yourself"],
      geometry: { w: 520, h: 440, x: 170, y: 90 }
    },
    // The shared detail window. Opened from inside either folder, so it has no
    // desktop icon of its own; its title bar shows whichever file was clicked.
    {
      id: "project",
      title: "Details",
      geometry: { w: 580, h: 690, x: 210, y: 46 }
    }
  ];

  /**
   * Menu bar. `kind: "separator"` draws a rule; everything else is a command.
   *
   *   act        action id — a window id, a built-in verb, or "link"
   *   linkId     for act:"link", which entry of site.links to open
   *   shortcut   action id whose key binding is displayed on the right
   *   tickWhen   "view:icons" or "theme:dark" — draws a checkmark while that
   *              view/theme is active
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
        { label: "Contact Mohit…", act: "contact" },
        { kind: "separator" },
        { label: "Light", act: "theme:light", tickWhen: "theme:light" },
        { label: "Dark", act: "theme:dark", tickWhen: "theme:dark" }
      ]
    },
    {
      id: "file",
      label: "File",
      width: 244,
      items: [
        { label: "Open Resume", act: "resume", shortcut: "resume" },
        { label: "Open Work Folder", act: "work", shortcut: "work" },
        { label: "Open VS Code Extensions", act: "extensions", shortcut: "extensions" },
        { label: "Open iOS Apps", act: "apps" },
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
    { key: "e", mod: true, action: "extensions" },
    { key: "p", mod: true, action: "print" },
    // Only when nothing is selected, so ⌘C still copies a selection normally.
    { key: "c", mod: true, action: "copymail", requiresNoSelection: true, passive: true }
  ];

  /** Chrome copy that isn't tied to any one window. */
  var shell = {
    osName: "MOHIT OS 1.0",
    desktopHint: "Double-click an icon to open it.",
    mobileHint: "MOHIT OS 1.0 — tap a row to open it.",
    workHint: "All shipped and public — double-click to open",
    // The strip is the only copy read before anything is opened, so it says
    // the one thing the icons can't: these are published, installable tools,
    // not screenshots of things that were built once.
    extensionsHint: "All live on the VS Code Marketplace",
    appsHint: "Live on the App Store",
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

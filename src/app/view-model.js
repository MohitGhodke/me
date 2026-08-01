/**
 * View model — the only place that knows how content and state become the flat
 * object the template renders against.
 *
 * Keeping it out of the component means the mapping can be unit-tested in Node
 * without React, a DOM or the DC runtime, and the component is left with the
 * job it should have: state and events.
 *
 * Handlers are merged in by the component; nothing here touches the DOM.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;
  var styles = isNode ? require("../design/styles.js") : global.MohitOS.styles;
  var tokens = isNode ? require("../design/tokens.js") : global.MohitOS.tokens;
  var shortcuts = isNode ? require("../core/shortcuts.js") : global.MohitOS.shortcuts;

  function plural(n, noun) {
    return n + " " + noun + (n === 1 ? "" : "s");
  }

  /** Stand-in for the detail window when its collection holds nothing yet. */
  var EMPTY_ITEM = {
    file: "",
    title: "",
    meta: "",
    image: "",
    summary: "",
    outcomes: [],
    tags: []
  };

  /**
   * @param {object} content  the assembled content object
   */
  function createViewModel(content) {
    // Styles that never change are built once, at construction.
    var s = {
      menuBar: styles.menuBar(),
      // The mobile list's header. A window's own bar is built per-window,
      // because only that one can be dragged.
      chromeBar: styles.titleBar(false),
      chromeClose: styles.titleBarButton(true),
      chromeGrow: styles.titleBarButton(false),
      chromeTitle: styles.titleBarTitle(),
      infoStrip: styles.infoStrip(),
      sectionLabel: styles.sectionLabel(),
      sectionLabelRule: styles.sectionLabel({ rule: true }),
      sectionNote: styles.sectionNote(),
      resumeLink: styles.resumeLink(),
      resumeStack: styles.resumeStack(),
      resumeSection: styles.resumeSection(),
      resumeSectionOpen: styles.resumeSectionOpen(),
      // The résumé is the printed artefact; its headings sit one step larger.
      sectionLabelResume: styles.sectionLabel({ size: tokens.size.chrome }),
      chip: styles.chip("solid"),
      chipOutline: styles.chip("outline"),
      btn: styles.button("default"),
      btnPrimary: styles.button("primary"),
      prose: styles.prose(),
      icon: styles.desktopIcon(),
      iconLabel: styles.desktopIconLabel(),
      menuSeparator: styles.menuSeparator(),
      windowBodyResume: styles.windowBody("page", "28px 30px 36px"),
      fieldInput: styles.field() + "min-height:" + tokens.layout.minTouchTarget + "px;",
      fieldArea: styles.field() + "resize:none;"
    };

    var mailto = "mailto:" + content.site.email;

    /** Menu bar, resolved against the current menu/view/window state. */
    function buildMenus(ctx) {
      // Every toggle a menu item can tick lives here as one "<kind>:<value>"
      // flag, so a new toggle (view, theme, ...) is a row in this list, not a
      // new comparison.
      var activeFlags = ["view:" + ctx.view, "theme:" + ctx.theme];

      return content.desktop.menus.map(function (menu) {
        var open = ctx.openMenu === menu.id;
        return {
          id: menu.id,
          label: menu.label || "",
          hasLabel: !!menu.label,
          isApple: !!menu.isApple,
          open: open,
          style: styles.menuBarItem(open, !!menu.isApple),
          panelStyle: styles.menuPanel(menu.width),
          items: menu.items.map(function (item) {
            if (item.kind === "separator") {
              return { isSeparator: true, isItem: false, style: s.menuSeparator };
            }

            var disabled =
              !!item.disabled ||
              (item.enabledWhen === "anyWindowOpen" && !ctx.anyWindowOpen);

            var binding = item.shortcut ? content.shortcutByAction[item.shortcut] : null;
            var link = item.act === "link" ? content.linkById[item.linkId] : null;
            var tick = item.tickWhen ? (activeFlags.indexOf(item.tickWhen) !== -1 ? "✓" : "") : null;

            return {
              isSeparator: false,
              isItem: true,
              label: item.label,
              act: item.act || "",
              href: link ? link.url : "",
              shortcut: binding ? shortcuts.label(binding, ctx.isApplePlatform) : "",
              hasShortcut: !!binding,
              hasTick: tick != null,
              tick: tick || "",
              disabled: disabled,
              style: styles.menuItem({
                layout: binding ? "split" : tick != null ? "tick" : "plain",
                disabled: disabled
              })
            };
          })
        };
      });
    }

    /** Desktop icons, in registry order. */
    function buildIcons() {
      return content.desktopIcons.map(function (w) {
        return {
          id: w.id,
          label: w.title,
          meta: w.meta || "",
          kind: w.icon,
          isFolder: w.icon === "folder",
          isDoc: w.icon === "doc",
          isApp: w.icon === "app",
          isAi: w.icon === "ai"
        };
      });
    }

    /**
     * Per-window open flag, frame style and chrome, keyed by id — so the
     * template says `{{ w.resume.open }}` and adding a window never touches
     * this function.
     *
     * The title bar, the zoom box and the resize grip live here rather than in
     * `s` because all three change on mobile, which `s` is built too early to
     * know.
     */
    function buildWindows(ctx) {
      var out = {};
      content.windows.forEach(function (win) {
        var open = ctx.wm.isOpen(ctx.state, win.id);
        var frame = open ? ctx.wm.frame(ctx.state, win.id) : null;
        var zoomed = !!(frame && frame.zoomed);
        out[win.id] = {
          open: open,
          title: win.title,
          zoomed: zoomed,
          // The one affordance whose meaning flips with state, so it says which.
          zoomLabel: (zoomed ? "Restore " : "Zoom ") + win.title,
          // A window fills the stage on mobile, so there is nowhere to drag it.
          chromeStyle: styles.titleBar(!ctx.isMobile),
          zoomStyle: styles.titleBarZoom(ctx.isMobile),
          gripStyle: styles.resizeGrip(ctx.isMobile),
          style: open ? styles.windowFrame(frame, ctx.isMobile) : ""
        };
      });
      return out;
    }

    /**
     * The one detail window, resolved against whichever folder was opened.
     * `ref.list` names a content collection — "projects" or "extensions" — so
     * a new folder of the same shape needs no change here.
     *
     * @param {{list: string, index: number}} ref
     */
    function buildItem(ref) {
      var list = content[(ref && ref.list) || "projects"] || content.projects;
      // A collection can legitimately be empty — no case studies written yet —
      // and `proj` is built on every render whether the window is open or not,
      // so resolve to a blank item rather than throwing.
      var p = list[ref && ref.index] || list[0] || EMPTY_ITEM;
      return {
        file: p.file,
        title: p.title,
        meta: p.meta,
        image: p.image || "",
        summary: p.summary,
        outcomes: p.outcomes,
        tags: p.tags,
        // Shipped work links out to its source; a case study usually can't.
        repo: p.repo || "",
        hasRepo: !!p.repo
      };
    }

    /**
     * The full contents of a window, flattened for the printed résumé.
     *
     * Derived from the same content the window itself renders, so the PDF can
     * never fall out of step with the site. Every branch returns the same shape
     * — `{ heading, hasHeading, text }` rows — so the template needs one loop
     * rather than one block per section.
     *
     * @param {string} windowId
     * @returns {{heading: string, hasHeading: boolean, text: string}[]}
     */
    function detailFor(windowId) {
      var rows = [];

      function row(heading, text) {
        if (text) rows.push({ heading: heading || "", hasHeading: !!heading, text: text });
      }

      if (windowId === "skills") {
        content.skills.groups.forEach(function (g) {
          var chips = g.items.join(" · ");
          // A group with a note gets two rows so the prose isn't glued to the
          // list; without one, the heading sits directly on the list.
          if (g.note) {
            row(g.heading, g.note);
            row("", chips);
          } else {
            row(g.heading, chips);
          }
        });
        return rows;
      }

      // "Work" is a folder, so it prints what the folders inside it hold.
      if (windowId === "work") {
        content.extensions
          .concat(content.apps)
          .concat(content.projects)
          .forEach(function (p) {
            row(p.title, p.meta);
            row("", p.summary);
          });
        return rows;
      }

      if (windowId === "about") {
        content.about.paragraphs.forEach(function (para) { row("", para); });
        return rows;
      }

      return rows;
    }

    /**
     * Résumé roles. The stack is joined here rather than looped in the template
     * so it stays one line on the page and one line in the PDF.
     */
    function buildResumeRoles() {
      return content.resume.roles.map(function (r) {
        return {
          title: r.title,
          company: r.company,
          period: r.period,
          stackLine: (r.stack || []).join(" · "),
          description: r.description || "",
          hasDescription: !!r.description
        };
      });
    }

    /** "https://github.com/MohitGhodke" → "github.com/MohitGhodke". */
    function bareUrl(url) {
      return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
    }

    /**
     * Profile links for the résumé header. The label is what a reader clicks;
     * the bare URL is what replaces it on paper, where "GitHub" is useless.
     */
    function buildResumeLinks() {
      return content.site.links
        .filter(function (l) { return l.onResume; })
        .map(function (l) {
          return { label: l.label, url: l.url, bare: bareUrl(l.url) };
        });
    }

    /** Résumé sections: a summary on screen, the whole window on paper. */
    function buildResumeSections() {
      return (content.resume.sections || []).map(function (sec) {
        return {
          window: sec.window,
          label: sec.label,
          summary: sec.summary,
          openLabel: "Open " + sec.label + " →",
          detail: detailFor(sec.window)
        };
      });
    }

    /**
     * A folder's contents: any window registered as a child of it, then its
     * files — folders first, the way a file browser sorts them.
     *
     * One list with an `isFolder` / `isFile` flag per row lets the template
     * loop once, so nesting another folder is a `parent` in desktop.js and
     * nothing here.
     *
     * @param {object[]} list    the items in this folder
     * @param {string}   name    the content collection they came from
     * @param {string}   ownerId the window id whose children belong here
     */
    function buildFolder(list, name, ownerId) {
      var rows = content.windows
        .filter(function (w) { return w.parent === ownerId; })
        .map(function (w) {
          return { isFolder: true, isFile: false, app: w.id, label: w.title, ref: "" };
        });

      list.forEach(function (p, i) {
        rows.push({
          isFolder: false,
          isFile: true,
          app: "",
          label: p.file,
          ref: name + ":" + i
        });
      });

      return rows;
    }

    /**
     * @param {object} ctx
     * @param {object} ctx.state  window-manager state
     * @param {object} ctx.wm     window manager
     * @param {string} ctx.view   "icons" | "list"
     * @param {string|null} ctx.openMenu
     * @param {boolean} ctx.isMobile
     * @param {boolean} ctx.isPhone  narrower still: the menu bar is name only
     * @param {boolean} ctx.isApplePlatform
     * @param {{list: string, index: number}} ctx.item  what the detail window shows
     * @param {string}  ctx.clock
     * @param {string}  ctx.toast
     * @param {boolean} ctx.showBoot
     * @param {boolean} ctx.isOff
     * @param {{status: string, lines: object[], input: string, busy: boolean}} ctx.ai
     * @param {"light"|"dark"} ctx.theme
     */
    function build(ctx) {
      var anyWindowOpen = ctx.wm.anyOpen(ctx.state);
      var workItems = buildFolder(content.projects, "projects", "work");
      var extensionItems = buildFolder(content.extensions, "extensions", "extensions");
      var appItems = buildFolder(content.apps, "apps", "apps");
      var menuCtx = {
        openMenu: ctx.openMenu,
        view: ctx.view,
        theme: ctx.theme,
        anyWindowOpen: anyWindowOpen,
        isApplePlatform: ctx.isApplePlatform
      };

      return {
        // ---- content, passed through for the template to walk
        site: content.site,
        resume: content.resume,
        about: content.about,
        skills: content.skills,
        playground: content.playground,
        contact: content.contact,
        shell: content.desktop.shell,

        // ---- Chirp: ctx.ai is the component's own state, passed
        // through as-is; aiCopy/aiDisabled/aiShowCursor are derived from it.
        ai: ctx.ai,
        aiCopy: content.assistant,
        // Only a reply in flight closes the input. A browser without WebGPU
        // can't run the model, but Chirp can still work the desktop — "open
        // his résumé" needs no model — so the line stays open there too.
        aiDisabled: !!(ctx.ai && ctx.ai.busy),
        // The decorative blinking cursor stands in for the empty input, so it
        // has no reason to show while there's nothing to type into.
        aiShowCursor: !!(ctx.ai && !ctx.ai.input && !ctx.ai.busy),

        // ---- derived view data
        s: s,
        // A phone has no room for five titles, a clock and a name: it keeps the
        // name. Every window the menus open is a row in the list below them,
        // and the résumé's links are in the window itself, so what goes with
        // them is chrome — print, the view toggle, restart.
        menus: ctx.isPhone ? [] : buildMenus(menuCtx),
        icons: buildIcons(),
        resumeLinks: buildResumeLinks(),
        resumeRoles: buildResumeRoles(),
        resumeSections: buildResumeSections(),
        workItems: workItems,
        extensionItems: extensionItems,
        appItems: appItems,
        proj: buildItem(ctx.item),
        w: buildWindows(ctx),
        links: content.site.links,
        mailto: mailto,

        // Counted from what the folder actually shows, so the nested folder is
        // included and the strip can't drift from the grid beside it.
        counts: {
          desktop: plural(content.desktopIcons.length, "item"),
          work: plural(workItems.length, "item"),
          extensions: plural(extensionItems.length, "item"),
          apps: plural(appItems.length, "item")
        },

        // Surfaced in the UI as well as the console: a content mistake should be
        // impossible to miss while editing.
        contentErrors: content.problems || [],
        hasContentErrors: !!(content.problems && content.problems.length),

        // ---- shell state
        clock: ctx.clock,
        // The clock is the first thing to go when the bar runs out of room.
        showClock: !ctx.isPhone,
        // "Mohit Ghodke" in the corner of a 390px bar leaves nothing beside it.
        barName: ctx.isPhone ? content.site.name.split(" ")[0] : content.site.name,
        // A menu bar button, not a menu item, because the Apple menu that
        // already carries the Light/Dark tick items is unreachable on a
        // phone — `menus` comes back empty there (see below). Labelled with
        // the theme it switches *to*, so it reads the same as a menu tick.
        theme: ctx.theme,
        themeToggleLabel: ctx.theme === "dark" ? "Light" : "Dark",
        toast: ctx.toast,
        showBoot: ctx.showBoot,
        isOff: ctx.isOff,
        isMobile: ctx.isMobile,
        isPhone: !!ctx.isPhone,
        isDesktop: !ctx.isMobile,
        viewIcons: !ctx.isMobile && ctx.view === "icons",
        viewList: !ctx.isMobile && ctx.view === "list"
      };
    }

    return { build: build, styles: s };
  }

  var api = { createViewModel: createViewModel };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.createViewModel = createViewModel;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

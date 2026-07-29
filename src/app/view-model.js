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

  /**
   * @param {object} content  the assembled content object
   */
  function createViewModel(content) {
    // Styles that never change are built once, at construction.
    var s = {
      menuBar: styles.menuBar(),
      chromeBar: styles.titleBar(),
      chromeClose: styles.titleBarButton(true),
      chromeGrow: styles.titleBarButton(false),
      chromeTitle: styles.titleBarTitle(),
      infoStrip: styles.infoStrip(),
      sectionLabel: styles.sectionLabel(),
      sectionLabelRule: styles.sectionLabel({ rule: true }),
      // The résumé is the printed artefact; its headings sit one step larger.
      sectionLabelResume: styles.sectionLabel({ size: tokens.size.chrome }),
      chip: styles.chip("solid"),
      chipOutline: styles.chip("outline"),
      btn: styles.button("default"),
      btnPrimary: styles.button("primary"),
      field: styles.field(),
      prose: styles.prose(),
      proseSmall: styles.prose(13),
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
            var tick = item.tickWhen ? (item.tickWhen === "view:" + ctx.view ? "✓" : "") : null;

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
          isApp: w.icon === "app"
        };
      });
    }

    /**
     * Per-window open flag and frame style, keyed by id — so the template says
     * `{{ w.resume.open }}` and adding a window never touches this function.
     */
    function buildWindows(ctx) {
      var out = {};
      content.windows.forEach(function (win) {
        var open = ctx.wm.isOpen(ctx.state, win.id);
        out[win.id] = {
          open: open,
          title: win.title,
          style: open ? styles.windowFrame(ctx.wm.frame(ctx.state, win.id), ctx.isMobile) : ""
        };
      });
      return out;
    }

    function buildProject(index) {
      var p = content.projects[index] || content.projects[0];
      return {
        file: p.file,
        title: p.title,
        meta: p.meta,
        image: p.image || "",
        summary: p.summary,
        outcomes: p.outcomes,
        tags: p.tags
      };
    }

    /**
     * @param {object} ctx
     * @param {object} ctx.state  window-manager state
     * @param {object} ctx.wm     window manager
     * @param {string} ctx.view   "icons" | "list"
     * @param {string|null} ctx.openMenu
     * @param {boolean} ctx.isMobile
     * @param {boolean} ctx.isApplePlatform
     * @param {number}  ctx.projectIndex
     * @param {string}  ctx.clock
     * @param {string}  ctx.toast
     * @param {boolean} ctx.showBoot
     * @param {boolean} ctx.isOff
     */
    function build(ctx) {
      var anyWindowOpen = ctx.wm.anyOpen(ctx.state);
      var menuCtx = {
        openMenu: ctx.openMenu,
        view: ctx.view,
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

        // ---- derived view data
        s: s,
        menus: buildMenus(menuCtx),
        icons: buildIcons(),
        files: content.projects.map(function (p, i) { return { i: i, file: p.file }; }),
        proj: buildProject(ctx.projectIndex),
        w: buildWindows(ctx),
        links: content.site.links,
        mailto: mailto,

        counts: {
          desktop: plural(content.desktopIcons.length, "item"),
          work: plural(content.projects.length, "item")
        },

        // Surfaced in the UI as well as the console: a content mistake should be
        // impossible to miss while editing.
        contentErrors: content.problems || [],
        hasContentErrors: !!(content.problems && content.problems.length),

        // ---- shell state
        clock: ctx.clock,
        toast: ctx.toast,
        showBoot: ctx.showBoot,
        isOff: ctx.isOff,
        isMobile: ctx.isMobile,
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

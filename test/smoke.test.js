/**
 * End-to-end smoke test: boot the real page in jsdom, with the real DC runtime,
 * and drive it the way a visitor would.
 *
 * The unit tests prove the modules behave; this proves they are wired together —
 * the template compiles, every hole is filled, and windows open and close.
 *
 * Needs the dev dependencies (`npm install`); skips cleanly without them.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const dc = require("./helpers/dc-template.js");

const ROOT = path.join(__dirname, "..");

let jsdom = null;
try {
  jsdom = require("jsdom");
} catch (err) {
  test("browser smoke test", { skip: "run `npm install` to enable" }, () => {});
}

if (jsdom) {
  const { JSDOM, ResourceLoader, VirtualConsole } = jsdom;

  /** Load our own files; never reach for the network (fonts, React CDN). */
  class LocalFilesOnly extends ResourceLoader {
    fetch(url, options) {
      if (url.startsWith("file:")) return super.fetch(url, options);
      return null;
    }
  }

  function readUmd(pkg, file) {
    return fs.readFileSync(path.join(ROOT, "node_modules", pkg, "umd", file), "utf8");
  }

  async function bootPage() {
    const problems = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", (...args) => problems.push(args.join(" ")));
    virtualConsole.on("jsdomError", (err) => problems.push(String(err)));

    const dom = await JSDOM.fromFile(dc.TEMPLATE_PATH, {
      url: pathToFileURL(dc.TEMPLATE_PATH).href,
      runScripts: "dangerously",
      resources: new LocalFilesOnly(),
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        // Hand the runtime React up front so it doesn't go to the CDN.
        window.eval(readUmd("react", "react.development.js"));
        window.eval(readUmd("react-dom", "react-dom.development.js"));

        // The runtime re-reads its own source so the template keeps the
        // attribute casing the HTML parser would otherwise flatten. jsdom has
        // no fetch, so serve the file from disk.
        window.fetch = (url) =>
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve(fs.readFileSync(new URL(url), "utf8"))
          });
      }
    });

    await new Promise((resolve) => {
      if (dom.window.document.readyState === "complete") resolve();
      else dom.window.addEventListener("load", resolve);
    });
    await settle(dom);

    // Warnings from the first paint are the runtime's own two-pass compile;
    // what matters is that nothing goes wrong once the page is up.
    problems.length = 0;
    dom.problems = problems;
    return dom;
  }

  /** Let React flush its work and any queued microtasks. */
  function settle(dom) {
    return new Promise((resolve) => dom.window.setTimeout(resolve, 20));
  }

  function fire(dom, element, type, at) {
    element.dispatchEvent(
      new dom.window.MouseEvent(
        type,
        Object.assign({ bubbles: true, cancelable: true, view: dom.window }, at)
      )
    );
    return settle(dom);
  }

  /** The inline frame style of an open window, found via its title bar. */
  const frameStyle = (dom, id) => query(dom, `[data-win="${id}"]`).parentElement.style;

  const text = (dom) => dom.window.document.body.textContent;
  const query = (dom, selector) => dom.window.document.querySelector(selector);

  test("the desktop boots and renders the shell", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    assert.ok(query(dom, "#dc-root"), "the runtime should have mounted");
    const body = text(dom);

    assert.ok(body.includes(content.site.name), "the owner's name belongs in the menu bar");
    assert.ok(body.includes(content.desktop.shell.osName), "the wallpaper caption is missing");
    content.desktop.menus
      .filter((m) => m.label)
      .forEach((m) => assert.ok(body.includes(m.label), `menu "${m.label}" is missing`));
    content.desktopIcons.forEach((icon) =>
      assert.ok(body.includes(icon.title), `icon "${icon.title}" is missing`)
    );

    assert.ok(!body.includes("{{"), "an unrendered template hole leaked into the page");

    // The runtime's second pass keeps the real attribute casing, which is what
    // makes the keyboard affordances land as `tabIndex` rather than a stray
    // lowercase attribute React would reject.
    assert.equal(query(dom, '[data-app="resume"]').getAttribute("tabindex"), "0");

    dom.window.close();
  });

  test("no window is open until one is asked for", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    assert.ok(
      !text(dom).includes(content.resume.summary),
      "the resume should not render before it is opened"
    );
    dom.window.close();
  });

  test("double-clicking an icon opens its window, and the close box shuts it", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    const icon = query(dom, '[data-app="resume"]');
    assert.ok(icon, "the Resume icon should be on the desktop");

    await fire(dom, icon, "dblclick");
    assert.ok(text(dom).includes(content.resume.summary), "the resume window did not open");
    assert.ok(
      text(dom).includes(content.resume.roles[0].company),
      "the resume should render roles from content/resume.js"
    );

    const close = query(dom, '[data-win="resume"][role="button"]');
    assert.ok(close, "the window needs a close box");
    await fire(dom, close, "click");
    assert.ok(!text(dom).includes(content.resume.summary), "the resume window did not close");

    dom.window.close();
  });

  test("the zoom box fills the stage, and puts the window back", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const frame = content.geometry.about;
    await fire(dom, query(dom, '[data-app="about"]'), "dblclick");

    // The close box comes first in the chrome; the zoom box is the far one.
    const zoomBox = () =>
      [...dom.window.document.querySelectorAll('[data-win="about"][role="button"]')].pop();
    assert.match(zoomBox().getAttribute("aria-label"), /^Zoom /);

    assert.equal(
      frameStyle(dom, "about").width,
      frame.w + "px",
      "it opens at its registered size"
    );

    await fire(dom, zoomBox(), "click");
    assert.equal(frameStyle(dom, "about").width, dom.window.innerWidth + "px");
    assert.equal(frameStyle(dom, "about").left, "0px");
    assert.match(zoomBox().getAttribute("aria-label"), /^Restore /);

    await fire(dom, zoomBox(), "click");
    assert.equal(
      frameStyle(dom, "about").width,
      frame.w + "px",
      "zooming again restores the frame"
    );

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("dragging the grow handle resizes the window", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const frame = content.geometry.about;
    await fire(dom, query(dom, '[data-app="about"]'), "dblclick");

    const grip = query(dom, '[data-win="about"][aria-hidden="true"]');
    assert.ok(grip, "a resizable window needs a grow handle");

    await fire(dom, grip, "mousedown", { clientX: 500, clientY: 400 });
    await fire(dom, dom.window, "mousemove", { clientX: 560, clientY: 460 });
    await fire(dom, dom.window, "mouseup", { clientX: 560, clientY: 460 });

    // Width has room to grow, so the corner tracks the pointer exactly.
    assert.equal(
      frameStyle(dom, "about").width,
      frame.w + 60 + "px",
      "the corner should follow the pointer"
    );

    // Height may hit the bottom of the stage first — the exact clamping is
    // window-manager.test.js's job. Here it only has to grow, and stay on stage.
    const grown = parseInt(frameStyle(dom, "about").height, 10);
    const stage = dom.window.innerHeight - 28; // less the menu bar
    assert.ok(grown > frame.h, `height should have grown from ${frame.h}, got ${grown}`);
    assert.ok(grown <= stage, `height ${grown} should stay within the ${stage}px stage`);

    // The pointer has been let go, so further movement must not keep resizing.
    await fire(dom, dom.window, "mousemove", { clientX: 900, clientY: 700 });
    assert.equal(frameStyle(dom, "about").width, frame.w + 60 + "px", "the drag should be over");
    assert.equal(parseInt(frameStyle(dom, "about").height, 10), grown, "height too");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("a résumé section opens its window, and prints what that window holds", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const doc = () => query(dom, '[data-print="doc"]');

    await fire(dom, query(dom, '[data-app="resume"]'), "dblclick");
    assert.ok(doc(), "the résumé is the printable document");

    // The detail is in the DOM but hidden until the page is printed, so the
    // on-screen résumé stays short while the PDF stays complete.
    const stacks = [...doc().querySelectorAll('[data-print="only"].mos-print-stack')];
    assert.equal(stacks.length, content.resume.sections.length, "one printed block per section");

    [...doc().querySelectorAll('[data-print="only"]')].forEach((el) =>
      assert.equal(
        dom.window.getComputedStyle(el).display,
        "none",
        "printed-only content must not show on screen"
      )
    );

    // The header links show a label on screen and their URL on paper.
    const onResume = content.site.links.filter((l) => l.onResume);
    assert.notEqual(onResume.length, 0, "the résumé should offer somewhere to go");
    onResume.forEach((l) => {
      const anchor = doc().querySelector(`a[href="${l.url}"]`);
      assert.ok(anchor, `the résumé should link to ${l.label}`);
      assert.ok(anchor.textContent.includes(l.label), `${l.label} needs its on-screen label`);
      const bare = l.url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
      assert.ok(anchor.textContent.includes(bare), `${l.label} needs its URL for print`);
    });

    // Nothing on the résumé may still point at the old address.
    assert.ok(!doc().innerHTML.includes("hello@mohitghodke"), "stale email on the résumé");
    assert.ok(
      doc().querySelector(`a[href="mailto:${content.site.email}"]`),
      "the résumé should mail to the address in site.js"
    );

    // …and it really is the window's own content, not a second copy of it.
    const printed = doc().textContent;
    content.skills.groups.forEach((g) =>
      assert.ok(printed.includes(g.heading), `"${g.heading}" should be in the printed résumé`)
    );
    content.extensions.forEach((x) =>
      assert.ok(printed.includes(x.title), `"${x.title}" should be in the printed résumé`)
    );

    // The screen affordance is the opposite: visible here, dropped in print.
    const openChip = doc().querySelector('[data-print="hide"]');
    assert.ok(openChip, "the résumé needs a visible way in");

    // Clicking a section opens the window it names.
    const section = query(dom, '[data-app="skills"][role="button"]');
    assert.ok(section, "the Skills section should be clickable");
    await fire(dom, section, "click");
    assert.ok(query(dom, '[data-win="skills"]'), "clicking the section did not open Skills");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("a menu opens on click and its commands run", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    const fileMenu = query(dom, '[data-menu="file"]');
    await fire(dom, fileMenu, "click");
    assert.ok(text(dom).includes("Open Work Folder"), "the File menu did not open");

    const openWork = [...dom.window.document.querySelectorAll('[data-act="work"]')].pop();
    await fire(dom, openWork, "click");

    assert.ok(
      text(dom).includes(content.windowById.extensions.title),
      "the Work folder did not open"
    );
    assert.ok(!text(dom).includes("Open Work Folder"), "the menu should close after a command");

    dom.window.close();
  });

  test("the Work folder reads correctly with no case studies written yet", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    assert.equal(content.projects.length, 0, "this test covers the empty state");

    await fire(dom, query(dom, '[data-app="work"]'), "dblclick");

    // Only the nested folders, counted honestly, and no stray case file icons.
    assert.equal(
      dom.window.document.querySelectorAll('[data-item^="projects:"]').length,
      0,
      "there should be no case study icons"
    );

    const nested = content.windows.filter((w) => w.parent === "work");
    nested.forEach((w) =>
      assert.ok(query(dom, `[data-app="${w.id}"]`), `the ${w.id} folder should be in Work`)
    );
    assert.ok(
      text(dom).includes(`${nested.length} item${nested.length === 1 ? "" : "s"}`),
      "the strip should count exactly what it shows"
    );

    assert.deepEqual(dom.problems, [], "an empty collection must not upset the render");
    dom.window.close();
  });

  test("the extensions folder opens from inside Work, with its own items", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const extension = content.extensions[2];

    // It is nested, so it must not be reachable until Work is open.
    assert.ok(
      !query(dom, '[data-app="extensions"]'),
      "the extensions folder should not be on the desktop"
    );

    await fire(dom, query(dom, '[data-app="work"]'), "dblclick");
    const folder = query(dom, '[data-app="extensions"]');
    assert.ok(folder, "the Work folder should contain the VS Code Extensions folder");
    assert.ok(
      text(dom).includes(content.windowById.extensions.title),
      "the nested folder should be labelled"
    );

    await fire(dom, folder, "dblclick");
    content.extensions.forEach((x) =>
      assert.ok(text(dom).includes(x.file), `"${x.file}" is missing from the folder`)
    );

    await fire(dom, query(dom, '[data-item="extensions:2"]'), "dblclick");
    let body = text(dom);
    assert.ok(body.includes(extension.title), "the extension's headline is missing");
    assert.ok(body.includes(extension.outcomes[0]), "the outcomes are missing");
    assert.ok(
      query(dom, `a[href="${extension.repo}"]`),
      "a published extension should link to its repo"
    );

    // The one detail window has to re-route when a different item is opened.
    await fire(dom, query(dom, '[data-item="extensions:0"]'), "dblclick");
    body = text(dom);
    assert.ok(body.includes(content.extensions[0].title), "the other extension did not take over");
    assert.ok(!body.includes(extension.title), "the previous one should no longer be showing");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("the iOS Apps folder opens from Work and renders its app", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const app = content.apps[0];

    assert.ok(!query(dom, '[data-app="apps"]'), "it should not be on the desktop");

    await fire(dom, query(dom, '[data-app="work"]'), "dblclick");
    const folder = query(dom, '[data-app="apps"]');
    assert.ok(folder, "Work should contain the iOS Apps folder");
    assert.ok(text(dom).includes(content.windowById.apps.title), "the folder needs its label");

    await fire(dom, folder, "dblclick");
    content.apps.forEach((a) =>
      assert.ok(text(dom).includes(a.file), `"${a.file}" is missing from the folder`)
    );

    await fire(dom, query(dom, '[data-item="apps:0"]'), "dblclick");
    const body = text(dom);
    assert.ok(body.includes(app.title), "the app's headline is missing");
    assert.ok(body.includes(app.outcomes[0]), "the outcomes are missing");
    assert.ok(body.includes(app.tags[0]), "the tags are missing");

    // Nothing to link to yet, so no button should be rendered at all.
    assert.equal(
      dom.window.document.querySelectorAll('a[href*="github.com"]').length,
      0,
      "an app with no repo must not render a source button"
    );

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("keyboard users can open an icon without a mouse", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    const icon = query(dom, '[data-app="about"]');
    assert.equal(icon.getAttribute("tabindex"), "0", "icons must be reachable by Tab");

    icon.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await settle(dom);

    assert.ok(text(dom).includes(content.about.greeting), "Enter did not open the window");
    dom.window.close();
  });

  test("the switch to list view is driven by the View menu", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-menu="view"]'), "click");
    const asList = [...dom.window.document.querySelectorAll('[data-act="view:list"]')].pop();
    await fire(dom, asList, "click");

    assert.ok(text(dom).includes("Kind"), "the list view header should be showing");
    dom.window.close();
  });

  test("the contact form is a real form with named fields", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-app="contact"]'), "dblclick");
    const form = query(dom, "form");
    assert.ok(form, "contact should submit through a form, not a bare link");
    assert.ok(form.elements.name, "the name field needs a name attribute");
    assert.ok(form.elements.message, "the message field needs a name attribute");

    dom.window.close();
  });

  test("driving the interface logs nothing to the console", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-app="skills"]'), "dblclick");
    await fire(dom, query(dom, '[data-app="play"]'), "dblclick");
    await fire(dom, query(dom, '[data-menu="edit"]'), "click");
    await fire(dom, query(dom, '[data-menu="special"]'), "click");
    await fire(dom, query(dom, '[data-win="skills"][role="button"]'), "click");

    assert.deepEqual(dom.problems, [], "the console should stay clean while the app is used");
    dom.window.close();
  });
}

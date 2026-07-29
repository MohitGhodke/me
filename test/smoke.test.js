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

    const dom = await JSDOM.fromFile(path.join(ROOT, "MohitOS.dc.html"), {
      url: pathToFileURL(path.join(ROOT, "MohitOS.dc.html")).href,
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

  function fire(dom, element, type) {
    element.dispatchEvent(
      new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, view: dom.window })
    );
    return settle(dom);
  }

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

  test("a menu opens on click and its commands run", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    const fileMenu = query(dom, '[data-menu="file"]');
    await fire(dom, fileMenu, "click");
    assert.ok(text(dom).includes("Open Work Folder"), "the File menu did not open");

    const openWork = [...dom.window.document.querySelectorAll('[data-act="work"]')].pop();
    await fire(dom, openWork, "click");

    assert.ok(text(dom).includes(content.projects[0].file), "the Work folder did not open");
    assert.ok(!text(dom).includes("Open Work Folder"), "the menu should close after a command");

    dom.window.close();
  });

  test("opening a case study renders the content behind it", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    await fire(dom, query(dom, '[data-app="work"]'), "dblclick");
    await fire(dom, query(dom, '[data-proj="1"]'), "dblclick");

    const body = text(dom);
    const project = content.projects[1];
    assert.ok(body.includes(project.title), "the case study title is missing");
    assert.ok(body.includes(project.outcomes[0]), "the outcomes are missing");
    assert.ok(body.includes(project.tags[0]), "the tags are missing");

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

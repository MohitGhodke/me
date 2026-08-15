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

  /**
   * jsdom has no PointerEvent, so a pointer gesture is a MouseEvent of the same
   * name with the one extra field the handlers read bolted on. React listens by
   * event name, so this reaches the same code the browser would.
   */
  function fire(dom, element, type, at) {
    const init = Object.assign({ bubbles: true, cancelable: true, view: dom.window }, at);
    const event = new dom.window.MouseEvent(type, init);
    if (type.startsWith("pointer")) {
      Object.defineProperty(event, "pointerId", { value: init.pointerId ?? 1 });
    }
    element.dispatchEvent(event);
    return settle(dom);
  }

  /** The inline frame style of an open window, found via its title bar. */
  const frameStyle = (dom, id) => query(dom, `[data-win="${id}"]`).parentElement.style;

  function chirpInput(dom) {
    const { content } = require("../src/content/index.js");
    const input = query(dom, `input[aria-label="${content.assistant.inputPlaceholder}"]`);
    assert.ok(input, "Chirp needs an input to type into");
    assert.ok(!input.disabled, "the input should be usable — Chirp works without the model too");
    return input;
  }

  /**
   * Put a line in the input the way a visitor's keyboard would.
   *
   * The input is React-controlled, so its value has to be set through the
   * prototype's own setter — assigning `.value` directly is invisible to React
   * and a following keypress would submit an empty line.
   */
  function typeInto(dom, input, value) {
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
    setValue.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    return settle(dom);
  }

  function press(dom, input, key) {
    input.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
    );
    return settle(dom);
  }

  /** Type a line into Chirp and press Enter, the way a visitor does. */
  async function askChirp(dom, question) {
    const input = chirpInput(dom);
    await typeInto(dom, input, question);
    return press(dom, input, "Enter");
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

  // The Work folder is small enough to have room to move on every side of the
  // stage, so the assertions are about the drag and not about the clamping.
  test("a finger on the title bar moves the window", async () => {
    const dom = await bootPage();
    await fire(dom, query(dom, '[data-app="work"]'), "dblclick");

    const bar = query(dom, '[data-win="work"][style*="repeating-linear-gradient"]');
    assert.ok(bar, "a window needs a title bar to drag by");

    const left = parseInt(frameStyle(dom, "work").left, 10);
    const top = parseInt(frameStyle(dom, "work").top, 10);

    // One touch produces pointer events and a single synthetic click — never
    // the mousemove stream a drag used to need.
    await fire(dom, bar, "pointerdown", { clientX: left + 40, clientY: top + 8, pointerId: 3 });
    await fire(dom, dom.window, "pointermove", { clientX: left + 90, clientY: top + 38, pointerId: 3 });
    await fire(dom, dom.window, "pointerup", { clientX: left + 90, clientY: top + 38, pointerId: 3 });

    assert.equal(frameStyle(dom, "work").left, left + 50 + "px", "it should follow the finger");
    assert.equal(frameStyle(dom, "work").top, top + 30 + "px");

    // A second finger landing elsewhere must not pick the window back up.
    await fire(dom, dom.window, "pointermove", { clientX: 900, clientY: 700, pointerId: 4 });
    assert.equal(frameStyle(dom, "work").left, left + 50 + "px", "the drag should be over");

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

    // Pointer events, not mouse events: a finger produces these and no
    // mousemove stream, which is what makes the handle work on a tablet.
    await fire(dom, grip, "pointerdown", { clientX: 500, clientY: 400, pointerId: 1 });
    await fire(dom, dom.window, "pointermove", { clientX: 560, clientY: 460, pointerId: 1 });
    await fire(dom, dom.window, "pointerup", { clientX: 560, clientY: 460, pointerId: 1 });

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
    await fire(dom, dom.window, "pointermove", { clientX: 900, clientY: 700, pointerId: 1 });
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
    // The point of the window: it is a published extension, and this is the
    // button that takes you to the listing.
    assert.ok(body.includes(extension.availability), "the availability badge is missing");
    assert.ok(
      query(dom, `a[href="${extension.install.url}"]`),
      "a published extension should link to its Marketplace listing"
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
    assert.ok(body.includes(app.availability), "the availability badge is missing");
    assert.ok(
      query(dom, `a[href="${app.install.url}"]`),
      "a shipped app should link to its App Store listing"
    );

    // The source isn't public, so no button should be rendered at all.
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

  // jsdom has no WebGPU, so the model never loads here — which is exactly the
  // point: opening a window is Chirp's own doing, not the model's, and it has
  // to work on a browser that can't run one.
  test("asking Chirp to open a window opens it, and to close it closes it", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    await fire(dom, query(dom, '[data-app="ai"]'), "dblclick");
    assert.ok(query(dom, '[data-win="ai"]'), "the Chirp window should be open");
    assert.ok(!query(dom, '[data-win="resume"]'), "the résumé should not be open yet");

    await askChirp(dom, "can you show me his resume?");
    assert.ok(query(dom, '[data-win="resume"]'), "Chirp did not open the résumé");
    assert.ok(text(dom).includes(content.resume.summary), "…and it should be the real window");

    // "close it" points at whatever Chirp opened last.
    await askChirp(dom, "close it");
    assert.ok(!query(dom, '[data-win="resume"]'), "Chirp did not close the résumé");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("Chirp leaves a question alone, and clears up after itself", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-app="ai"]'), "dblclick");

    // A window named without a verb is a question — no window may fly open.
    await askChirp(dom, "what is in his resume?");
    assert.ok(!query(dom, '[data-win="resume"]'), "a passing mention must not open a window");

    await askChirp(dom, "open the contact form");
    await askChirp(dom, "show me his skills");
    assert.ok(query(dom, '[data-win="contact"]') && query(dom, '[data-win="skills"]'));

    await askChirp(dom, "close everything");
    assert.ok(!query(dom, '[data-win="contact"]'), "the contact window should be gone");
    assert.ok(!query(dom, '[data-win="skills"]'), "skills too");
    assert.ok(query(dom, '[data-win="ai"]'), "…including Chirp's own window, which it lives in");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("the arrow keys walk back through what was typed, and back down to the live line", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-app="ai"]'), "dblclick");
    await askChirp(dom, "open the contact form");
    await askChirp(dom, "close it");

    const input = chirpInput(dom);
    await press(dom, input, "ArrowUp");
    assert.equal(input.value, "close it", "ArrowUp should recall the newest line first");

    await press(dom, input, "ArrowUp");
    assert.equal(input.value, "open the contact form", "…then the one before it");

    await press(dom, input, "ArrowUp");
    assert.equal(input.value, "open the contact form", "the oldest line is as far back as it goes");

    await press(dom, input, "ArrowDown");
    assert.equal(input.value, "close it");

    await press(dom, input, "ArrowDown");
    assert.equal(input.value, "", "one step past the newest is the line being typed");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("a half-typed line survives a walk through the history", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-app="ai"]'), "dblclick");
    await askChirp(dom, "open the contact form");

    const input = chirpInput(dom);
    await typeInto(dom, input, "half a que");
    await press(dom, input, "ArrowUp");
    assert.equal(input.value, "open the contact form");

    await press(dom, input, "ArrowDown");
    assert.equal(input.value, "half a que", "the draft should come back untouched");

    dom.window.close();
  });

  // The input's own caret is hidden to keep the terminal looking like one, so
  // the blinking block is all a visitor has to go on: blinking at an unfocused
  // line invites typing that lands nowhere.
  test("the blinking cursor follows the input's focus", async () => {
    const dom = await bootPage();
    const cursor = () => query(dom, '[data-win="ai"]')
      .parentElement.querySelector('span[aria-hidden="true"][style*="animation: blink"]');

    await fire(dom, query(dom, '[data-app="ai"]'), "dblclick");
    const input = chirpInput(dom);
    input.focus();
    await settle(dom);
    assert.ok(cursor(), "a focused, empty input should blink");

    input.blur();
    await settle(dom);
    assert.ok(!cursor(), "an unfocused input must not");

    input.focus();
    await typeInto(dom, input, "typing");
    assert.ok(!cursor(), "…and neither should a line with something in it");

    dom.window.close();
  });

  /**
   * Narrow the page to a phone and let the resize handler catch up. jsdom
   * reports a fixed 1024 and has no way to set it, so the getter is replaced —
   * which is all `system.isMobileWidth` reads.
   */
  async function shrinkToPhone(dom, width) {
    Object.defineProperty(dom.window, "innerWidth", { value: width || 390, configurable: true });
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    await settle(dom);
  }

  test("a phone gets a Back button where the desktop gets a close box", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    const closeBox = () => query(dom, '[data-win="about"][role="button"]');

    await fire(dom, query(dom, '[data-app="about"]'), "dblclick");
    assert.equal(closeBox().textContent, "", "the desktop square says nothing");
    assert.match(closeBox().getAttribute("aria-label"), /^Close /);

    await shrinkToPhone(dom);
    assert.equal(closeBox().textContent, content.desktop.shell.backLabel);
    assert.equal(closeBox().getAttribute("aria-label"), "Back");

    dom.window.close();
  });

  /**
   * The reason the whole thing exists: on a phone the window is the screen,
   * and the way out of a screen is the back gesture. Every open window owns a
   * history entry, so the edge swipe on iOS and the button on Android land in
   * `onPopState` instead of leaving the site.
   */
  test("on a phone the back gesture closes the window on top", async () => {
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const { history } = dom.window;
    const depth = () => (history.state && history.state.mosDepth) || 0;

    await shrinkToPhone(dom);
    assert.equal(depth(), 0, "the bare desktop owns no history entries");

    // A row in the mobile list is one tap, not a double-click.
    await fire(dom, query(dom, '[data-app="work"]'), "click");
    assert.ok(text(dom).includes(content.desktop.shell.workHint), "the Work folder did not open");
    assert.equal(depth(), 1, "the open window should have pushed an entry");

    // Into the nested folder: a second full-screen window over the first.
    await fire(dom, query(dom, '[data-app="extensions"]'), "click");
    assert.ok(
      text(dom).includes(content.desktop.shell.extensionsHint),
      "the nested folder did not open"
    );
    assert.equal(depth(), 2);

    history.back();
    await settle(dom);
    assert.equal(depth(), 1, "back should unwind one window, not the whole stack");
    assert.ok(
      !text(dom).includes(content.desktop.shell.extensionsHint),
      "the window on top should have gone"
    );
    assert.ok(
      text(dom).includes(content.desktop.shell.workHint),
      "…and the folder underneath should still be there"
    );

    history.back();
    await settle(dom);
    assert.equal(depth(), 0);
    assert.ok(!text(dom).includes(content.desktop.shell.workHint), "back to the list");

    assert.deepEqual(dom.problems, [], "the console should stay clean");
    dom.window.close();
  });

  test("the Back button and the back gesture stay in step", async () => {
    // Tapping Back closes the window directly; the entry it pushed has to go
    // with it, or the next gesture would spend a step doing nothing visible.
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");
    const { history } = dom.window;

    await shrinkToPhone(dom);
    await fire(dom, query(dom, '[data-app="skills"]'), "click");
    assert.equal(history.state.mosDepth, 1);

    await fire(dom, query(dom, '[data-win="skills"][role="button"]'), "click");
    await settle(dom);
    assert.ok(!text(dom).includes(content.skills.groups[0].items[0]), "the window did not close");
    assert.equal((history.state && history.state.mosDepth) || 0, 0, "and gave its entry back");

    dom.window.close();
  });

  test("back on the desktop is still the browser's, not the window manager's", async () => {
    // A floating window sits over a desktop you can see, its close box is
    // unmistakable, and hijacking Back there would trap visitors on the page.
    const dom = await bootPage();
    const { content } = require("../src/content/index.js");

    await fire(dom, query(dom, '[data-app="skills"]'), "dblclick");
    assert.equal(
      (dom.window.history.state && dom.window.history.state.mosDepth) || 0,
      0,
      "no history entry should have been pushed"
    );
    assert.ok(text(dom).includes(content.skills.groups[0].items[0]));

    dom.window.close();
  });

  test("driving the interface logs nothing to the console", async () => {
    const dom = await bootPage();

    await fire(dom, query(dom, '[data-app="skills"]'), "dblclick");
    await fire(dom, query(dom, '[data-app="contact"]'), "dblclick");
    await fire(dom, query(dom, '[data-menu="edit"]'), "click");
    await fire(dom, query(dom, '[data-menu="special"]'), "click");
    await fire(dom, query(dom, '[data-win="skills"][role="button"]'), "click");

    assert.deepEqual(dom.problems, [], "the console should stay clean while the app is used");
    dom.window.close();
  });
}

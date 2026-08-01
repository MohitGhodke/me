# Mohit OS 1.0

A portfolio site built as a small operating system: a menu bar, windows you can
drag, resize and zoom to full screen, a desktop of icons, and a boot sequence. Static files, no build step,
no framework to install.

```
npm install     # only needed for the tests
npm run dev     # http://localhost:4173
npm test        # 106 tests, ~2s
```

---

## Where things live

The rule is one job per file, and content is never mixed with markup.

```
index.html          the template, and a thin component that owns state + events
support.js               the Design Component runtime (generated — do not edit)

src/content/             ▸ THE COPY. Edit these; nothing else.
  site.js                  name, role, email, links, page metadata
  resume.js                summary, roles, education
  projects.js              case studies in the Work folder (empty — yours to fill)
  extensions.js            the VS Code extensions, in a folder inside Work
  apps.js                  the iOS apps, in a folder inside Work
  about.js                 About Me.txt
  skills.js                the System Profile window
  contact.js               contact copy and form behaviour
  assistant.js             Chirp's copy: consent, quips, and the desktop verbs it obeys
  desktop.js               which windows exist, the menu bar, keyboard shortcuts
  index.js                 assembles the above and validates it at boot

src/design/              the design system
  tokens.js                every colour, typeface, size, duration — the only hex in the repo
  styles.js                style builders composed from tokens

src/core/                browser-agnostic logic, unit-tested in Node
  window-manager.js        open/close/stack/drag/resize/zoom/clamp, as pure state transitions
  menu-controller.js       menu bar latch-and-track behaviour
  clipboard.js             copy that reports honest success or failure
  shortcuts.js             key bindings, matched against data
  assistant.js             the in-browser model: system prompt, session, local quips
  intents.js               a visitor's line → an action the desktop already has
  system.js                clock, viewport, safe localStorage, external links

src/app/
  view-model.js            content + state → the flat object the template renders

test/                    node:test, no runner to configure
scripts/dev-server.mjs   zero-dependency static server
```

### Why it's split this way

- **Content is data.** Adding a case study means adding an object to
  `projects.js`. The template already loops.
- **The design system is one file.** `tokens.js` holds the palette; `styles.js`
  turns tokens into the repeated style strings. Change the accent colour once.
- **Logic doesn't need a browser.** The window manager takes an injected
  viewport and returns new state, so its edge cases (a window taller than the
  screen, a viewport that shrinks under an open window) are covered by fast
  tests instead of manual clicking.
- **The component is a composition root.** It owns React state and DOM events
  and delegates everything else.

---

## Adding your real content

Start with `CONTENT.md` — it's a checklist of every placeholder still in the
repo. Every content file is commented, and the fields are plain strings and
arrays.

If you get a field wrong, you'll know immediately: the content is validated at
boot, the problems are printed to the console **and** shown in a panel on the
desktop, with the exact path (`projects[2] is missing \`summary\``).

Adding a whole new window takes two steps:

1. a row in `desktop.js` — `{ id, title, icon, meta, geometry }`, or
   `parent: "work"` instead of `icon` to nest it inside another folder
2. a `<sc-if value="{{ w.yourId.open }}">` block in `index.html`

The window manager, the desktop icon, the list view, the mobile list and the
menu wiring all follow from the registry. `npm test` fails if you do step 1 and
forget step 2.

---

## Deploying

Everything is static and the entry point is `index.html`, so every host serves
it at `/` with no rewrite and no build step. Upload the repo minus
`node_modules/`, `test/` and `scripts/`; `support.js` and all of `src/` must
ship.

Live on GitHub Pages at **mohitghodke.com**: Settings → Pages → deploy from
`main` / root, then set the custom domain, which writes the `CNAME` file. The
apex needs four `A` records at the DNS provider — GitHub lists the current
addresses on that same settings page.

One constraint worth knowing: the DC runtime re-fetches the page's own source
(`fetch(location.href)`), so the site has to be served over HTTP. Opening
`index.html` from disk will not work — use `npm run dev`.

React is loaded from unpkg with subresource integrity; the Silkscreen webfont
comes from Google Fonts. Both are the only external requests the page makes.

---

## Tests

```
npm test              # everything
npm run test:watch    # re-runs on save
```

| File | What it protects |
| --- | --- |
| `window-manager.test.js` | stacking, clamping, drag limits, resize, zoom, immutability |
| `core.test.js` | menus, shortcuts, clipboard fallbacks, storage failures |
| `content.test.js` | the validator actually catches broken content |
| `view-model.test.js` | state → render values |
| `template.test.js` | every `{{ hole }}` in the template still resolves |
| `smoke.test.js` | boots the real page in jsdom and clicks through it, including the résumé's screen-vs-print split |

`template.test.js` is the one that matters when refactoring: a hole that no
longer resolves is a silently blank window in the browser, and it turns that
into a failing test naming the exact expression.

`smoke.test.js` needs `npm install`; it skips cleanly without the dev
dependencies so CI without them still runs the rest.

---

## Notes on the runtime

`support.js` is a generated build of the Design Component runtime — regenerate
it upstream rather than editing it. Two behaviours are worth knowing:

- The template language is small on purpose: `{{ path }}`, `<sc-if value>`,
  `<sc-for list as>`, equality and `!`. Anything more complicated belongs in
  `view-model.js`.
- The runtime compiles the page twice: once from the parsed DOM, then again
  from the raw source it re-fetches, which is what preserves camelCase
  attributes like `tabIndex`. That second pass needs the page served over HTTP,
  so use `npm run dev` rather than opening the file directly.

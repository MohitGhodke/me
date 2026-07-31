# Filling in the real content

Everything a visitor reads lives in `src/content/`. These are plain JavaScript
objects — strings, arrays, and nothing else. You never need to touch the HTML.

Run `npm run dev`, open http://localhost:4173, edit a file, reload. If a field is
malformed the desktop tells you exactly which one, so you can work quickly and
find out immediately when something is wrong.

Every line still carrying sample copy is marked `PLACEHOLDER` in the source, so
`grep -rn PLACEHOLDER src/content/` is your remaining to-do list at any point.

---

## The checklist

### 1. `site.js` — who you are

| Field | Status | Notes |
| --- | --- | --- |
| `name`, `role`, `email`, `url` | ✅ real | |
| `location` | ✅ real | Pune, IN — confirmed |
| `tagline` | ✅ real | one line, shows on the wallpaper |
| `meta.title` / `meta.description` | ✅ real | also update the same two values in the `<head>` of `index.html` — `npm test` fails if they drift apart |
| `email` | ✅ real | mohitghodke@gmail.com — also duplicated in the `<noscript>` fallback, which `npm test` keeps in step |
| `links[]` | ⚠️ partly real | GitHub and LinkedIn confirmed and marked `onResume: true`; the Writing URL is still a guess — point it somewhere real or delete the entry |

`onResume: true` puts a link in the résumé header. It shows its label on screen
and its bare URL when printed, so leave the flag off anything you would not want
on a PDF.

### 2. `resume.js` — the printable page

- `summary` — ✅ **real**, written from the work in `skills.js`, `extensions.js`
  and `apps.js`. Two or three sentences.
- `roles[]` — ✅ **real.** `{ title, company, period, stack[], description? }`,
  newest first. `stack` is what you worked with there — checkable, and enough on
  its own. `description` is optional and currently unused: add one line per role
  when there is something true and specific to say about what you owned or
  changed. Leaving it off beats inventing an achievement.
- `education[]` — ⚠️ **blank template.** `{ line }` — the one thing LinkedIn
  didn't show.
- `sections[]` — ✅ **real.** `{ window, label, summary }`. Each renders as a
  short section that opens a window when clicked, and expands to that window's
  full contents when the page is printed.

**The résumé is short on screen and complete on paper.** A section shows its
`summary` and an "Open …" chip; the detail sits in the same markup under
`data-print="only"`, hidden by CSS until `⌘P`. That detail is *derived* from the
window's own content in `detailFor()` (src/app/view-model.js), never copied — so
editing `skills.js` updates the PDF automatically and the two can't drift.

Adding a section: a row here, plus a branch in `detailFor()` returning
`{ heading, hasHeading, text }` rows. Pointing one at a window that doesn't
exist fails validation.

⚠︎ Never put an inline `display` on a `data-print="only"` element — an inline
style outranks the stylesheet rule that hides it, and the detail leaks onto the
screen.

The invented employers and metrics that shipped with the template (Acme Systems,
"340ms → 90ms", "40k events/sec") have been removed rather than left in place: a
plausible-looking fake is worse on a résumé than an obvious gap, and this is the
one window that gets printed and sent to people.

This is the window that `⌘P` prints to PDF, so keep it to one page's worth.

### 3. `projects.js` — the case studies in the Work folder

**Empty.** The sample case studies the template shipped with have been deleted
rather than left pretending to be real work, so there is no placeholder copy to
replace here — just real work to add when you want to.

The Work folder is not empty in the meantime: it holds the VS Code Extensions
and iOS Apps folders. Add an entry here and it appears alongside them. Each
entry is:

```js
{
  file: "payments.case",              // the filename under the icon
  title: "…",                          // the headline
  meta: "Company · Year · Role",
  image: "architecture diagram",       // caption for the hero well
  summary: "…",                        // one paragraph: the problem, and how it was solved
  outcomes: ["…", "…", "…"],           // the numbers — three reads best
  tags: ["Go", "Kafka"],               // the stack
  repo: "https://github.com/…"         // optional — draws a "Source on GitHub" button
}
```

Add a second and it appears in the folder on its own — no layout change.

`repo` is the only optional field. Omit it and no button renders, which is
usually right for employed work you can't link to; give it an absolute
`http(s)` URL and the window links out. Anything else fails validation, so a
typo can't ship as a dead button.

### 3b. `extensions.js` — the VS Code Extensions folder

**Real content, not placeholder.** Same fields as a case study above, and the
same detail window renders both — the two just live in different folders. The
`VS Code Extensions` folder sits *inside* Work rather than on the desktop,
because `desktop.js` gives that window `parent: "work"`.

Each entry is one shipped extension. Keep the write-ups short: state the
friction first, then how the extension removes it, and let `repo` carry the
technical detail. Three `outcomes` bullets is the sweet spot — what you get,
not how it's built.

To nest another folder in Work the same way, give its window `parent: "work"`
in `desktop.js` and leave `icon` off. The folder icon, the item count and the
double-click all follow; only the window's own template block is new.

### 3c. `apps.js` — the iOS Apps folder

**Real content, not placeholder.** Same fields again, same detail window, also
nested inside Work via `parent: "work"`.

Holds `dinkrum.app` today. The second app goes in as a second object in this
array — nothing else to touch. It has no `repo` line: the source isn't public,
so no button renders rather than a dead one. Add `repo` (or swap in an App Store
URL once it's live) and the button appears.

Two things to keep honest in this write-up if the app changes:

- The AI runs **on-device by default**. Private Cloud Compute is opt-in and off
  until the user turns it on, which is why the summary says "the only inference
  that can leave the device" rather than claiming nothing ever does.
- "No analytics, no third-party SDKs" is a claim about the shipped app. If that
  stops being true, this copy has to change with it.

### 4. `about.js` — About Me.txt

**Real content.** Three paragraphs — the work, what draws you to it, and what
you do away from a keyboard — plus a `Currently` callout. Set `callout` to
`null` to drop the boxed note.

The `Currently` box goes stale faster than anything else on the site; it names
what you're building right now, so revisit it when that changes.

### 5. `skills.js` — System Profile

**Real content**, apart from `subtitle`. `groups[]`, each
`{ heading, note?, kind, items }`:

- `kind` is `"chips"` for technologies or `"lines"` for sentences.
- `note` is optional — a sentence or two under the heading, for a section that
  needs framing rather than just a list. The two AI sections use it (`AI Tooling`
  for the orchestration-and-skills approach, `SLM Training` for the fine-tuning
  work); the stack sections are lists and don't need one.

The AI work is split in two on purpose: routing/context engineering and model
training are different disciplines, and one `note` per group only stretches so
far. Add a third AI section the same way if the work splits again.

Keep this window an inventory: what you work with, and how you approach it.
A result with a number behind it reads better as a case study in
`projects.js`, or as a bullet in the résumé.

`subtitle` ("9 years in disk") is still template copy — check the number.

### 6. `playground.js` — the terminal

**Real content.** `entries[]`, each `{ name, description }` — the local-model
side projects that aren't shipped products (the shipped ones are in the Work
folder). The three invented projects this shipped with — `tinykv`, `slowdns`,
`rasterbox`, one of which claimed to have made the wallpaper — have been removed.

`lastLogin` is set dressing, like the menu-bar clock. It isn't a claim.

### 7. `contact.js` — the Contact window

The form has no backend: submitting opens the visitor's mail client with the
fields already filled in, so nothing is silently dropped. To collect messages
over HTTP instead, set `formAction` to a form endpoint.

### 8. `desktop.js` — structure, not copy

Only touch this to change *which* windows exist, what the menu bar says, or
which keys do what. Window titles and desktop labels live here too.

---

## Adding a window

1. Add a row to `windows` in `desktop.js`:

   ```js
   { id: "writing", title: "Writing", icon: "doc", meta: "Essays",
     geometry: { w: 480, h: 420, x: 200, y: 100 } }
   ```

2. Add a block to `index.html`, copying an existing one:

   ```html
   <sc-if value="{{ w.writing.open }}">
     <div style="{{ w.writing.style }}"> … </div>
   </sc-if>
   ```

The icon, the list view, the mobile list, `Close All Windows` and the window
manager pick it up from step 1. `npm test` fails if you do step 1 and forget
step 2.

## Adding a menu command

Add an item to the right menu in `desktop.js`. Actions are either a window id, a
built-in (`print`, `copymail`, `copylink`, `closeall`, `cleanup`, `restart`,
`shutdown`, `link`), or `view:icons` / `view:list`. `content.test.js` rejects
any action the app can't actually run.

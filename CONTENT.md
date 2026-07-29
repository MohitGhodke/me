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
| `location` | ⚠️ placeholder | |
| `tagline` | ✅ real | one line, shows on the wallpaper |
| `meta.title` / `meta.description` | ✅ real | also update the same two values in the `<head>` of `MohitOS.dc.html` — `npm test` fails if they drift apart |
| `links[]` | ⚠️ placeholder | GitHub, LinkedIn and Writing URLs are guesses |

### 2. `resume.js` — the printable page

Everything here is sample copy: **every employer, title, date and metric.**

- `summary` — two or three sentences
- `roles[]` — `{ title, company, period, description }`, newest first. Add or
  remove entries freely.
- `education[]` — `{ line }`

This is the window that `⌘P` prints to PDF, so keep it to one page's worth.

### 3. `projects.js` — the Work folder

All four case studies are sample copy. Each one is:

```js
{
  file: "payments.case",              // the filename under the icon
  title: "…",                          // the headline
  meta: "Company · Year · Role",
  image: "architecture diagram",       // caption for the hero well
  summary: "…",                        // one paragraph: the problem, and what you did
  outcomes: ["…", "…", "…"],           // the numbers — three reads best
  tags: ["Go", "Kafka"]                // the stack
}
```

Add a fifth and it appears in the folder on its own — no layout change.

### 4. `about.js` — About Me.txt

The two paragraphs are yours already; the `callout.body` still names a
placeholder employer. Set `callout` to `null` to drop the boxed note.

### 5. `skills.js` — System Profile

`groups[]`, each `{ heading, kind, items }`. `kind` is `"chips"` for
technologies or `"lines"` for sentences.

### 6. `playground.js` — the terminal

`entries[]`, each `{ name, description }`. Also `lastLogin`, which is decoration.

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

2. Add a block to `MohitOS.dc.html`, copying an existing one:

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

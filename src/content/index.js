/**
 * Content assembly and validation.
 *
 * Pulls the individual content files into one frozen object and checks the
 * shape of it up front. Getting a loud, specific error at boot ("projects[2] is
 * missing `summary`") beats a window that renders half-empty in production, and
 * it makes the content files safe for someone to edit without reading the app.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;

  function req(browserKey, nodePath) {
    if (isNode) return require(nodePath);
    return global.MohitOS.content[browserKey];
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  function isStringArray(v) {
    return Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString);
  }

  /**
   * @returns {string[]} human-readable problems; empty means the content is sound
   */
  function validate(c) {
    var problems = [];

    function requireFields(obj, fields, where) {
      fields.forEach(function (field) {
        if (!obj || !isNonEmptyString(obj[field])) {
          problems.push(where + " is missing `" + field + "`");
        }
      });
    }

    requireFields(c.site, ["name", "role", "email", "url", "tagline"], "site");
    requireFields(c.site && c.site.meta, ["title", "description", "locale"], "site.meta");

    if (!Array.isArray(c.site.links) || !c.site.links.length) {
      problems.push("site.links must list at least one profile link");
    } else {
      c.site.links.forEach(function (link, i) {
        requireFields(link, ["id", "label", "url"], "site.links[" + i + "]");
      });
    }

    requireFields(c.resume, ["summary"], "resume");
    if (!Array.isArray(c.resume.roles) || !c.resume.roles.length) {
      problems.push("resume.roles must list at least one role");
    } else {
      c.resume.roles.forEach(function (role, i) {
        var at = "resume.roles[" + i + "]";
        requireFields(role, ["title", "company", "period"], at);
        if (!isStringArray(role.stack)) {
          problems.push(at + ".stack must be a non-empty list of technologies");
        }
        // Optional: a role only carries a line when there is something real to
        // say. Present-and-blank would render an empty paragraph.
        if (role.description != null && !isNonEmptyString(role.description)) {
          problems.push(at + ".description must be a non-empty string when present");
        }
      });
    }

    // Each résumé section opens a window and prints that window's contents, so
    // a section pointing at nothing would be a dead row and a gap in the PDF.
    if (!Array.isArray(c.resume.sections)) {
      problems.push("resume.sections must be a list");
    } else {
      var resumeWindowIds = c.desktop.windows.map(function (w) { return w.id; });
      c.resume.sections.forEach(function (sec, i) {
        var at = "resume.sections[" + i + "]";
        requireFields(sec, ["window", "label", "summary"], at);
        if (sec.window && resumeWindowIds.indexOf(sec.window) === -1) {
          problems.push(at + ' opens unknown window "' + sec.window + '"');
        }
      });
    }

    /**
     * Case studies, extensions and apps are the same shape and share one detail
     * window, so they share one check — a new folder of them costs a line.
     *
     * `noun` non-null means the collection is the only thing in its folder, so
     * an empty one would render an empty window and is a mistake. `projects`
     * passes null: the Work folder still has the folders nested inside it, so
     * having no case studies yet is a legitimate state, not a broken one.
     */
    function validateItems(list, where, noun) {
      if (!Array.isArray(list)) {
        problems.push(where + " must be a list");
        return;
      }
      if (noun && !list.length) {
        problems.push(where + " must list at least one " + noun);
        return;
      }
      list.forEach(function (p, i) {
        var at = where + "[" + i + "]";
        requireFields(p, ["file", "title", "meta", "summary"], at);
        if (!isStringArray(p.outcomes)) problems.push(at + ".outcomes must be a non-empty list of strings");
        if (!isStringArray(p.tags)) problems.push(at + ".tags must be a non-empty list of strings");
        // Optional, but a blank or relative `repo` would render a dead button.
        if (p.repo != null && !/^https?:\/\/\S+$/.test(p.repo)) {
          problems.push(at + ".repo must be an absolute http(s) URL");
        }
        // Optional — employed work usually isn't downloadable. When it is,
        // both halves have to be there: a badge saying it's live with no way
        // to get it, or a button with no words on it, is worse than silence.
        if (p.availability != null && !isNonEmptyString(p.availability)) {
          problems.push(at + ".availability must be a non-empty string when present");
        }
        if (p.install != null) {
          if (!isNonEmptyString(p.install.label)) {
            problems.push(at + ".install is missing `label`");
          }
          if (!/^https?:\/\/\S+$/.test(p.install.url || "")) {
            problems.push(at + ".install.url must be an absolute http(s) URL");
          }
        }
      });
    }

    validateItems(c.projects, "projects", null);
    validateItems(c.extensions, "extensions", "extension");
    validateItems(c.apps, "apps", "app");

    requireFields(c.about, ["greeting"], "about");
    if (!isStringArray(c.about.paragraphs)) problems.push("about.paragraphs must be a non-empty list of strings");

    if (!Array.isArray(c.skills.groups) || !c.skills.groups.length) {
      problems.push("skills.groups must list at least one group");
    } else {
      c.skills.groups.forEach(function (g, i) {
        requireFields(g, ["heading", "kind"], "skills.groups[" + i + "]");
        if (g.kind !== "chips" && g.kind !== "lines") {
          problems.push('skills.groups[' + i + '].kind must be "chips" or "lines"');
        }
        // Optional, but present-and-blank would render an empty paragraph.
        if (g.note != null && !isNonEmptyString(g.note)) {
          problems.push("skills.groups[" + i + "].note must be a non-empty string when present");
        }
        if (!isStringArray(g.items)) problems.push("skills.groups[" + i + "].items must be a non-empty list of strings");
      });
    }

    if (!Array.isArray(c.playground.entries)) {
      problems.push("playground.entries must be a list");
    } else {
      c.playground.entries.forEach(function (e, i) {
        requireFields(e, ["name", "description"], "playground.entries[" + i + "]");
      });
    }

    requireFields(c.assistant, ["modelLabel", "modelSize", "greeting", "prompt"], "assistant");
    if (!isStringArray(c.assistant.consentLines)) {
      problems.push("assistant.consentLines must be a non-empty list of strings");
    }
    // The thinking line is animated by cycling these, so an empty list would
    // leave the terminal silent for the several seconds a reply takes.
    if (!isStringArray(c.assistant.thinkingFrames)) {
      problems.push("assistant.thinkingFrames must be a non-empty list of strings");
    }
    if (!Array.isArray(c.assistant.quips)) {
      problems.push("assistant.quips must be a list");
    } else {
      c.assistant.quips.forEach(function (q, i) {
        var at = "assistant.quips[" + i + "]";
        requireFields(q, ["id"], at);
        if (!isStringArray(q.patterns)) problems.push(at + ".patterns must be a non-empty list of strings");
        if (!isStringArray(q.replies)) problems.push(at + ".replies must be a non-empty list of strings");
      });
    }

    // Chirp's instruction vocabulary: verbs and spoken lines here, window
    // names on the window rows. Missing verbs would silently downgrade every
    // "open the résumé" into an offer, which is a hard bug to spot by eye.
    if (!c.assistant.intents) {
      problems.push("assistant.intents is missing");
    } else {
      [
        "openVerbs", "closeVerbs", "closeAllPhrases", "itWords", "acceptWords",
        "openedLines", "alreadyOpenLines", "closedLines", "notOpenLines",
        "closedAllLines", "nothingOpenLines", "offerLines"
      ].forEach(function (field) {
        if (!isStringArray(c.assistant.intents[field])) {
          problems.push("assistant.intents." + field + " must be a non-empty list of strings");
        }
      });
      requireFields(c.assistant.intents, ["shortcutHint"], "assistant.intents");
    }

    var seen = Object.create(null);
    var keywordOwner = Object.create(null);
    c.desktop.windows.forEach(function (w, i) {
      requireFields(w, ["id", "title"], "desktop.windows[" + i + "]");
      if (seen[w.id]) problems.push('desktop.windows: duplicate id "' + w.id + '"');
      seen[w.id] = true;

      // Optional — a window without keywords simply can't be asked for by name.
      // What isn't optional is that a keyword mean one window: Chirp resolves
      // ambiguity by guessing, and a guess that opens the wrong window over
      // what someone was reading is worse than not understanding at all.
      if (w.keywords != null) {
        if (!isStringArray(w.keywords)) {
          problems.push("desktop.windows[" + i + "].keywords must be a non-empty list of strings");
        } else {
          w.keywords.forEach(function (keyword) {
            var key = String(keyword).toLowerCase().trim();
            if (keywordOwner[key]) {
              problems.push(
                'desktop.windows: keyword "' + key + '" is claimed by both "' +
                  keywordOwner[key] + '" and "' + w.id + '"'
              );
            }
            keywordOwner[key] = w.id;
          });
        }
      }
      var g = w.geometry;
      if (!g || ["w", "h", "x", "y"].some(function (k) { return typeof g[k] !== "number"; })) {
        problems.push("desktop.windows[" + i + "].geometry needs numeric w, h, x and y");
      }
      if (w.icon && ["doc", "folder", "app", "ai"].indexOf(w.icon) === -1) {
        problems.push('desktop.windows[' + i + '].icon must be "doc", "folder" or "app"');
      }
    });

    // Checked after the loop, so a `parent` may name a window declared later.
    var windowIds = c.desktop.windows.map(function (w) { return w.id; });
    c.desktop.windows.forEach(function (w, i) {
      if (w.parent == null) return;
      if (windowIds.indexOf(w.parent) === -1) {
        problems.push('desktop.windows[' + i + '].parent points at unknown window "' + w.parent + '"');
      } else if (w.parent === w.id) {
        problems.push("desktop.windows[" + i + "] cannot be its own parent");
      }
    });

    var linkIds = (c.site.links || []).map(function (l) { return l.id; });
    c.desktop.menus.forEach(function (menu, mi) {
      (menu.items || []).forEach(function (item, ii) {
        var where = "desktop.menus[" + mi + "].items[" + ii + "]";
        if (item.kind === "separator") return;
        if (!isNonEmptyString(item.label)) problems.push(where + " is missing `label`");
        if (item.act === "link" && linkIds.indexOf(item.linkId) === -1) {
          problems.push(where + ' points at unknown link "' + item.linkId + '"');
        }
      });
    });

    return problems;
  }

  /** Build the runtime content object, including the bits derived from it. */
  function assemble(parts) {
    var windows = parts.desktop.windows;

    var geometry = {};
    windows.forEach(function (w) { geometry[w.id] = w.geometry; });

    var byId = {};
    windows.forEach(function (w) { byId[w.id] = w; });

    var linkById = {};
    (parts.site.links || []).forEach(function (l) { linkById[l.id] = l; });

    var shortcutByAction = {};
    parts.desktop.shortcuts.forEach(function (s) { shortcutByAction[s.action] = s; });

    return {
      site: parts.site,
      resume: parts.resume,
      projects: parts.projects,
      extensions: parts.extensions,
      apps: parts.apps,
      about: parts.about,
      skills: parts.skills,
      playground: parts.playground,
      assistant: parts.assistant,
      contact: parts.contact,
      desktop: parts.desktop,

      // Derived — one source of truth, several shapes.
      windows: windows,
      windowById: byId,
      geometry: geometry,
      desktopIcons: windows.filter(function (w) { return !!w.icon; }),
      linkById: linkById,
      shortcutByAction: shortcutByAction
    };
  }

  var content = assemble({
    site: req("site", "./site.js"),
    resume: req("resume", "./resume.js"),
    projects: req("projects", "./projects.js"),
    extensions: req("extensions", "./extensions.js"),
    apps: req("apps", "./apps.js"),
    about: req("about", "./about.js"),
    skills: req("skills", "./skills.js"),
    playground: req("playground", "./playground.js"),
    assistant: req("assistant", "./assistant.js"),
    contact: req("contact", "./contact.js"),
    desktop: req("desktop", "./desktop.js")
  });

  content.problems = validate(content);

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = content;
  ns.validateContent = validate;
  if (isNode) module.exports = { content: content, validate: validate, assemble: assemble };
})(typeof globalThis !== "undefined" ? globalThis : this);

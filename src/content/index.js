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
        requireFields(role, ["title", "company", "period", "description"], "resume.roles[" + i + "]");
      });
    }

    if (!Array.isArray(c.projects) || !c.projects.length) {
      problems.push("projects must list at least one case study");
    } else {
      c.projects.forEach(function (p, i) {
        requireFields(p, ["file", "title", "meta", "summary"], "projects[" + i + "]");
        if (!isStringArray(p.outcomes)) problems.push("projects[" + i + "].outcomes must be a non-empty list of strings");
        if (!isStringArray(p.tags)) problems.push("projects[" + i + "].tags must be a non-empty list of strings");
      });
    }

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

    var seen = Object.create(null);
    c.desktop.windows.forEach(function (w, i) {
      requireFields(w, ["id", "title"], "desktop.windows[" + i + "]");
      if (seen[w.id]) problems.push('desktop.windows: duplicate id "' + w.id + '"');
      seen[w.id] = true;
      var g = w.geometry;
      if (!g || ["w", "h", "x", "y"].some(function (k) { return typeof g[k] !== "number"; })) {
        problems.push("desktop.windows[" + i + "].geometry needs numeric w, h, x and y");
      }
      if (w.icon && ["doc", "folder", "app"].indexOf(w.icon) === -1) {
        problems.push('desktop.windows[' + i + '].icon must be "doc", "folder" or "app"');
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
      about: parts.about,
      skills: parts.skills,
      playground: parts.playground,
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
    about: req("about", "./about.js"),
    skills: req("skills", "./skills.js"),
    playground: req("playground", "./playground.js"),
    contact: req("contact", "./contact.js"),
    desktop: req("desktop", "./desktop.js")
  });

  content.problems = validate(content);

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = content;
  ns.validateContent = validate;
  if (isNode) module.exports = { content: content, validate: validate, assemble: assemble };
})(typeof globalThis !== "undefined" ? globalThis : this);

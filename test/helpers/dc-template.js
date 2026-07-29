/**
 * A small, faithful re-implementation of the parts of the DC template language
 * that the template checker needs: locating `{{ … }}` holes, and resolving an
 * expression the way `support.js` does.
 *
 * This is test infrastructure, not app code — its only job is to let CI catch a
 * hole that no longer resolves, which is the failure mode a template refactor
 * produces and which no unit test of the modules would notice.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const TEMPLATE_PATH = path.join(ROOT, "MohitOS.dc.html");

function readTemplateFile() {
  return fs.readFileSync(TEMPLATE_PATH, "utf8");
}

/** The `<x-dc>` body with the `<helmet>` block (plain CSS, no holes) removed. */
function templateBody(src) {
  const open = src.indexOf("<x-dc>");
  const close = src.lastIndexOf("</x-dc>");
  if (open === -1 || close === -1) throw new Error("MohitOS.dc.html has no <x-dc> block");
  const body = src.slice(open + "<x-dc>".length, close);
  return body.replace(/<helmet>[\s\S]*?<\/helmet>/, "");
}

/** The contents of `<script data-dc-script>`. */
function logicScript(src) {
  const match = /<script[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(src);
  if (!match) throw new Error("MohitOS.dc.html has no <script data-dc-script> block");
  return match[1];
}

/** Every `{{ expression }}` in source order. */
function holes(body) {
  const found = [];
  const re = /\{\{([\s\S]+?)\}\}/g;
  let m;
  while ((m = re.exec(body)) !== null) found.push(m[1].trim());
  return found;
}

/** Every `<sc-for list="{{ … }}" as="…">` in source order. */
function loops(body) {
  const found = [];
  const re = /<sc-for\b[^>]*>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const tag = m[0];
    const list = /list="\{\{([\s\S]+?)\}\}"/.exec(tag);
    const as = /\bas="([^"]+)"/.exec(tag);
    if (list && as) found.push({ list: list[1].trim(), as: as[1] });
  }
  return found;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const NUMBER = /^-?\d+(\.\d+)?$/;

function isLiteral(expr) {
  if (expr === "true" || expr === "false" || expr === "null" || expr === "undefined") return true;
  if (NUMBER.test(expr)) return true;
  return (
    expr.length >= 2 &&
    (expr[0] === '"' || expr[0] === "'") &&
    expr[expr.length - 1] === expr[0]
  );
}

/**
 * Split an expression into the paths it actually reads — equality operands and
 * negations peeled away, literals dropped.
 */
function pathsIn(expr) {
  let e = expr.trim();
  if (e.startsWith("(") && e.endsWith(")")) e = e.slice(1, -1).trim();

  const eq = /(===|!==|==|!=)/.exec(e);
  if (eq) {
    return [...pathsIn(e.slice(0, eq.index)), ...pathsIn(e.slice(eq.index + eq[1].length))];
  }
  while (e.startsWith("!")) e = e.slice(1).trim();
  if (!e || isLiteral(e)) return [];
  return [e];
}

/**
 * Walk a dotted path, reporting the first missing step.
 * @returns {{ok: true, value: *} | {ok: false, missingAt: string}}
 */
function resolvePath(scope, expr) {
  const head = IDENT.exec(expr);
  if (!head) return { ok: false, missingAt: expr };

  let key = head[0];
  if (!(key in scope)) return { ok: false, missingAt: key };

  let current = scope[key];
  let seen = key;
  let rest = expr.slice(key.length);

  while (rest.length) {
    if (rest[0] !== ".") return { ok: true, value: current }; // [..] indexing — not checked
    const next = IDENT.exec(rest.slice(1)) || /^\d+/.exec(rest.slice(1));
    if (!next) return { ok: false, missingAt: seen + rest };
    const step = next[0];
    seen += "." + step;
    if (current == null || !(step in Object(current))) return { ok: false, missingAt: seen };
    current = current[step];
    rest = rest.slice(1 + step.length);
  }
  return { ok: true, value: current };
}

module.exports = {
  TEMPLATE_PATH,
  readTemplateFile,
  templateBody,
  logicScript,
  holes,
  loops,
  pathsIn,
  resolvePath
};

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PREFIX = "tc_";
const dir = join(import.meta.dirname, "..", ".next");

const files = (root, ext) =>
  readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => join(e.parentPath, e.name));

const html = readFileSync(join(dir, "server/app/index.html"), "utf8");
const css = files(join(dir, "static"), ".css")
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const classes = new Set(
  [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)),
);
const plain = [...classes].filter((c) => !c.startsWith(PREFIX));
const missing = [...classes].filter((c) => c.startsWith(PREFIX) && !css.includes(`.${c}`));
const leaked = ["flex", "p-8", "text-4xl", "bg-indigo-600"].filter((c) =>
  new RegExp(`\\.${c.replace(/[-]/g, "\\-")}[\\s{:,]`).test(css),
);

const manifest = JSON.parse(readFileSync(join(dir, "tailcloak-manifest.json"), "utf8"));
const unmapped = [...classes].filter((c) => c.startsWith(PREFIX) && !(c in manifest));

const perElement = [...html.matchAll(/<(\w+)[^>]*\sclass="([^"]*)"/g)].map(
  (m) => `${m[1]}:${m[2].split(/\s+/).filter(Boolean).length}`,
);

console.log(`classes per element: ${perElement.join(" ")}`);
console.log(`HTML classes: ${classes.size}, unobfuscated: ${JSON.stringify(plain)}`);
console.log(`missing from CSS: ${JSON.stringify(missing)}`);
console.log(`original utilities still in CSS: ${JSON.stringify(leaked)}`);
console.log(`missing from manifest: ${JSON.stringify(unmapped)}`);
const failed = plain.length || missing.length || leaked.length || unmapped.length;
if (failed || classes.size === 0) process.exit(1);
console.log("OK");

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PREFIX = "tc_";
const dir = join(import.meta.dirname, "..", "dist", "assets");
const read = (ext) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

const js = read(".js");
const css = read(".css");
const strings = [...js.matchAll(/className:(["'`])(.*?)\1/g)].map((m) =>
  m[2].replace(/\$\{[^}]*\}/g, " ").trim(),
);
const classes = new Set(strings.flatMap((s) => s.split(/\s+/).filter(Boolean)));
const plain = [...classes].filter((c) => !c.startsWith(PREFIX));
const missing = [...classes].filter((c) => c.startsWith(PREFIX) && !css.includes(`.${c}`));
const leaked = ["flex", "p-8", "text-4xl", "bg-indigo-600"].filter((c) =>
  new RegExp(`\\.${c.replace(/-/g, "\\-")}[\\s{:,]`).test(css),
);
const multi = strings.filter((s) => s.split(/\s+/).length > 1);

console.log(`className strings: ${strings.length}: ${JSON.stringify(strings)}`);
console.log(`with more than one class: ${JSON.stringify(multi)}`);
console.log(`unobfuscated: ${JSON.stringify(plain)}`);
console.log(`missing from CSS: ${JSON.stringify(missing)}`);
console.log(`original utilities still in CSS: ${JSON.stringify(leaked)}`);
if (plain.length || missing.length || leaked.length || multi.length || strings.length === 0) {
  process.exit(1);
}
console.log("OK");

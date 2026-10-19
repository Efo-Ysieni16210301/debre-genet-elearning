import { messages } from "../src/i18n/messages";
import type { Leaf, Tree } from "../src/i18n/translate";

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const leaf = value as Leaf | Tree;

    if (typeof leaf === "string") {
      result.set(path, leaf);
    } else if (
      typeof (leaf as { one?: unknown }).one === "string" &&
      typeof (leaf as { other?: unknown }).other === "string"
    ) {
      const plural = leaf as { one: string; other: string };
      result.set(`${path}#one`, plural.one);
      result.set(`${path}#other`, plural.other);
    } else {
      for (const [childPath, text] of flatten(leaf as Tree, path)) {
        result.set(childPath, text);
      }
    }
  }

  return result;
}

function placeholders(text: string) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const english = flatten(messages.en);
const amharic = flatten(messages.am);

const errors: string[] = [];
const warnings: string[] = [];

for (const key of english.keys()) {
  if (!amharic.has(key)) errors.push(`Missing Amharic text: ${key}`);
}

for (const key of amharic.keys()) {
  if (!english.has(key))
    errors.push(`Amharic text without an English original: ${key}`);
}

for (const [key, en] of english) {
  const am = amharic.get(key);
  if (am === undefined) continue;

  if (am.trim() === "") {
    errors.push(`Empty Amharic text: ${key}`);
    continue;
  }

  if (placeholders(en).join() !== placeholders(am).join()) {
    errors.push(
      `Placeholders differ in ${key}: English has {${placeholders(en).join(", ")}}, Amharic has {${placeholders(am).join(", ")}}`,
    );
  }

  const hasEthiopic = /[\u1200-\u137F]/.test(am);
  const hasLatinWords = /[A-Za-z]{3,}/.test(am.replace(/\{\w+\}/g, ""));

  if (!hasEthiopic)
    warnings.push(`No Ethiopic letters in Amharic text: ${key}`);
  if (hasLatinWords)
    warnings.push(`English words left in Amharic text: ${key}`);
  if (am === en)
    warnings.push(`Amharic text is identical to the English: ${key}`);
}

console.log(`${english.size} texts checked.`);

for (const message of warnings) console.warn(`warning: ${message}`);
for (const message of errors) console.error(`error: ${message}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}

console.log(
  warnings.length === 0
    ? "All good."
    : `Done with ${warnings.length} warning(s).`,
);

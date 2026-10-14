import { readFile, writeFile } from "node:fs/promises";
const tokens = JSON.parse(
  await readFile(
    new URL("../design-system/tokens.json", import.meta.url),
    "utf8",
  ),
);
const names = [
  "paper",
  "ink",
  "muted",
  "hair",
  "accent",
  "art",
  "panel",
  "gold",
];
const css = Object.entries(tokens.themes)
  .map(([theme, values]) => {
    if (
      !["paper", "ink"].includes(theme) ||
      names.some((n) => !/^#[0-9a-f]{6}$/i.test(values[n]))
    )
      throw new Error("invalid-design-token");
    return `${theme === "paper" ? ":root" : 'body[data-theme="ink"]'} {\n${names.map((n) => `  --${n}: ${values[n]};`).join("\n")}\n}`;
  })
  .join("\n\n");
await writeFile(
  new URL("../web/theme-tokens.css", import.meta.url),
  "/* Generated from design-system/tokens.json. */\n" + css + "\n",
);

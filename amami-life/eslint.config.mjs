import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
export default ts.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "web/core.js",
      "design/**",
      "apps/mobile/scripts/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, __DEV__: "readonly" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-irregular-whitespace": [
        "error",
        { skipStrings: true, skipTemplates: true, skipJSXText: true },
      ],
    },
  },
  {
    files: ["apps/mobile/src/**/*.tsx"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);

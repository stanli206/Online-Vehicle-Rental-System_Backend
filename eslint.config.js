import js from "@eslint/js";
import globals from "globals";

export default [
  // Ignore build artifacts and deps
  { ignores: ["node_modules/**", "coverage/**", "dist/**"] },

  // ESLint's recommended baseline
  js.configs.recommended,

  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module", // project uses ES modules ("type": "module")
      globals: {
        ...globals.node, // process, __dirname, console, etc.
      },
    },
    rules: {
      // Warn (not error) on unused vars so CI stays green while you clean up.
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "off", // console.log is fine for a Node server
      "no-undef": "error",
      eqeqeq: ["warn", "smart"],
    },
  },
];

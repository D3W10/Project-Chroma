import js from "@eslint/js";
import json from "@eslint/json";
import css from "@eslint/css";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config([
    js.configs.recommended,
    json.configs.recommended,
    css.configs.recommended,
    tseslint.configs.recommended,
    stylistic.configs.customize({ severity: "warn" }),
    react.configs.flat.recommended,
    react.configs.flat["jsx-runtime"],
    {
        ignores: [
            "**/reportWebVitals.ts",
            "**/routeTree.gen.ts",
            ".tanstack/**/*",
            "dist/**/*",
            "wailsjs/**/*",
        ],
        rules: {
            "@stylistic/indent": ["warn", 4],
            "@stylistic/quotes": ["warn", "double"],
            "@stylistic/semi": ["warn", "always"],
            "@stylistic/quote-props": ["warn", "as-needed"],
            "@stylistic/jsx-indent-props": ["warn", 4],
            "@stylistic/eol-last": ["warn", "never"],
            "@stylistic/brace-style": ["warn", "1tbs", { allowSingleLine: true }],
        },
    },
]);
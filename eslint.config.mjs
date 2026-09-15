import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig({
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],

    files: ['**/*.ts'],

    extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        unicorn.configs.recommended,
        eslintConfigPrettier,
    ],

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },
    },

    linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: 'error',
    },

    rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': 'error',

        'unicorn/prevent-abbreviations': 'off',
    },
});

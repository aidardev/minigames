/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('src', import.meta.url)),
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text'],
            include: ['src/**/*.ts'],
            exclude: [
                // These files contain TypeScript types only, with no runtime application logic.
                'src/**/*.types.ts',
                'src/**/*.d.ts',
                // This file only imports global styles and starts the application.
                'src/main.ts',
            ],
        },
    },
});

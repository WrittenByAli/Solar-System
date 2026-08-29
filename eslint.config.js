import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
    { ignores: ['dist/**', 'node_modules/**', 'public/**'] },
    js.configs.recommended,
    {
        files: ['src/**/*.{js,jsx}', 'api/**/*.js', 'e2e/**/*.js', '*.js', '*.mjs'],
        plugins: { react, 'react-hooks': reactHooks },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: { ...globals.browser, ...globals.node },
        },
        settings: { react: { version: 'detect' } },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            // JSX runtime is automatic (Vite) — no React import needed.
            'react/react-in-jsx-scope': 'off',
            // This codebase does not use PropTypes.
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            // React-Compiler-derived diagnostics: this project doesn't run the
            // React Compiler (no babel-plugin-react-compiler in the build), so
            // these are pure noise here — every flagged pattern (setState-in-effect
            // sync, ref snapshots during render) is deliberate and behavior-correct
            // in this codebase. Rules-of-hooks + exhaustive-deps remain the
            // enforced correctness gate.
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
        },
    },
]

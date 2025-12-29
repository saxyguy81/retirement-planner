# ESLint Configuration

> **STATUS: COMPLETE** - Updated 2025-12-28
>
> **DONE:**
> - Phase 1: Dependencies installed (eslint 9.39.2, prettier 3.7.4, plugins)
> - Phase 2: eslint.config.js created with flat config format
> - Phase 3: Prettier configuration (.prettierrc, .prettierignore)
> - Phase 4: npm scripts added (lint, lint:fix, format, format:check, check)
> - Phase 5: VS Code integration (.vscode/settings.json, extensions.json)
> - Phase 6: lint:fix run, 0 errors (53 warnings for unused vars - acceptable)

## Overview

Add a modern ESLint 9 configuration with Prettier integration for consistent code quality and formatting across the retirement planner codebase.

## Current State

- No ESLint or Prettier configuration
- React 18 + Vite 5 project with ESM modules
- Vitest for testing
- Tailwind CSS for styling
- JSX files (not TypeScript)

## Desired End State

- ESLint 9 with flat config format (`eslint.config.js`)
- Prettier for code formatting
- React, React Hooks, and import ordering rules
- Vitest globals recognized in test files
- VS Code integration for auto-fix on save
- `npm run lint` and `npm run lint:fix` scripts

## What We're NOT Doing

- TypeScript configuration (project uses plain JSX)
- Accessibility (a11y) rules (can be added later if needed)
- Pre-commit hooks with Husky/lint-staged (can be added later)

---

## Phase 1: Install Dependencies

### Changes Required

```bash
npm install -D eslint@^9.0.0 \
  @eslint/js \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-import \
  eslint-plugin-vitest \
  prettier \
  eslint-config-prettier \
  eslint-plugin-prettier
```

### Success Criteria

#### Automated Verification:
- [ ] All packages install without errors
- [ ] `npx eslint --version` shows v9.x

---

## Phase 2: Create ESLint Configuration

### Changes Required

**File**: `eslint.config.js`

```javascript
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import vitestPlugin from 'eslint-plugin-vitest';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.min.js',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // React configuration
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // Node.js globals for config files
        process: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed with React 18
      'react/prop-types': 'off', // Not using PropTypes
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/no-unescaped-entities': 'warn',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import rules
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',

      // General JS rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console for this app
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],

      // Prettier integration
      'prettier/prettier': 'warn',
    },
  },

  // Test files configuration
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    plugins: {
      vitest: vitestPlugin,
    },
    languageOptions: {
      globals: {
        ...vitestPlugin.environments.env.globals,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'no-unused-vars': 'off', // Test files often have unused vars
    },
  },

  // Prettier must be last to override other formatting rules
  prettierConfig,
];
```

### Success Criteria

#### Automated Verification:
- [ ] File created at `eslint.config.js`
- [ ] `npx eslint --print-config src/App.jsx` shows merged config

---

## Phase 3: Create Prettier Configuration

### Changes Required

**File**: `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "avoid"
}
```

**File**: `.prettierignore`

```
dist
node_modules
coverage
*.min.js
```

### Success Criteria

#### Automated Verification:
- [ ] Files created at `.prettierrc` and `.prettierignore`
- [ ] `npx prettier --check src/App.jsx` runs without error

---

## Phase 4: Add npm Scripts

### Changes Required

**File**: `package.json` (add to scripts)

```json
{
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,json,css}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,json,css}\"",
    "check": "npm run lint && npm run test:unit && npm run build"
  }
}
```

### Success Criteria

#### Automated Verification:
- [ ] `npm run lint` executes and shows results
- [ ] `npm run lint:fix` auto-fixes issues
- [ ] `npm run format:check` verifies formatting
- [ ] `npm run check` runs full validation pipeline

---

## Phase 5: VS Code Integration (Optional)

### Changes Required

**File**: `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": ["javascript", "javascriptreact"]
}
```

**File**: `.vscode/extensions.json`

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

### Success Criteria

#### Manual Verification:
- [ ] VS Code shows ESLint errors inline
- [ ] Saving a file auto-fixes ESLint issues and formats with Prettier

---

## Phase 6: Fix Existing Lint Issues

### Changes Required

Run `npm run lint:fix` to auto-fix issues, then manually address any remaining warnings.

Expected issues to fix:
- Import ordering (auto-fixable)
- Trailing commas (auto-fixable)
- Semicolons (auto-fixable)
- Unused variables (manual review)

### Success Criteria

#### Automated Verification:
- [ ] `npm run lint` exits with code 0 (no errors)
- [ ] `npm run format:check` shows all files formatted
- [ ] `npm run check` passes (lint + test + build)

---

## Testing Strategy

1. Run `npm run lint` on existing codebase
2. Run `npm run lint:fix` to auto-fix issues
3. Verify build still works: `npm run build`
4. Verify tests still pass: `npm test`
5. Open project in VS Code and verify integration

## References

- [ESLint 9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
- [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [Prettier ESLint Integration](https://prettier.io/docs/en/integrating-with-linters.html)

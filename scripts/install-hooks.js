#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync, chmodSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function main() {
  const gitHooksDir = resolve(ROOT, '.git', 'hooks');
  const sourceHook = resolve(ROOT, 'scripts', 'hooks', 'pre-push');
  const targetHook = resolve(gitHooksDir, 'pre-push');

  console.log('Installing git pre-push hook...');
  console.log('');

  // Check if .git directory exists
  if (!existsSync(resolve(ROOT, '.git'))) {
    console.error('ERROR: This directory is not a git repository.');
    console.error('Initialize git first: git init');
    process.exit(1);
  }

  // Create hooks directory if it doesn't exist
  if (!existsSync(gitHooksDir)) {
    mkdirSync(gitHooksDir, { recursive: true });
  }

  // Check if hook source exists
  if (!existsSync(sourceHook)) {
    console.error('ERROR: Pre-push hook source not found at scripts/hooks/pre-push');
    process.exit(1);
  }

  // Check if hook already exists
  if (existsSync(targetHook)) {
    const existing = readFileSync(targetHook, 'utf-8');
    const source = readFileSync(sourceHook, 'utf-8');

    if (existing === source) {
      console.log('Pre-push hook is already installed and up to date.');
      process.exit(0);
    }

    console.log('Updating existing pre-push hook...');
  }

  // Copy hook
  copyFileSync(sourceHook, targetHook);

  // Make executable
  chmodSync(targetHook, '755');

  console.log('Pre-push hook installed successfully!');
  console.log('');
  console.log('The hook will run before each push:');
  console.log('  1. Unit tests (npm run test:unit)');
  console.log('  2. Baseline documentation check');
  console.log('  3. Build verification');
  console.log('');
  console.log('To bypass the hook in emergencies (NOT recommended):');
  console.log('  git push --no-verify');

  process.exit(0);
}

main();

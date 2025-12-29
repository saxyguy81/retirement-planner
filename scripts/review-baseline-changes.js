#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function getChangedBaselines() {
  try {
    // Get staged changes
    const staged = execSync('git diff --cached --name-only', {
      cwd: ROOT,
      encoding: 'utf-8'
    });

    // Get unstaged changes
    const unstaged = execSync('git diff --name-only', {
      cwd: ROOT,
      encoding: 'utf-8'
    });

    const allChanges = (staged + unstaged).split('\n').filter(Boolean);

    return allChanges.filter(f =>
      f.includes('__baselines__') ||
      f.includes('__snapshots__') ||
      f.endsWith('.snap')
    );
  } catch {
    return [];
  }
}

function checkChangeLog(changedFiles) {
  const changeLogPath = resolve(ROOT, 'BASELINE_CHANGE_LOG.md');

  if (!existsSync(changeLogPath)) {
    console.error('ERROR: BASELINE_CHANGE_LOG.md not found');
    process.exit(1);
  }

  const changeLog = readFileSync(changeLogPath, 'utf-8');
  const missingJustifications = [];

  changedFiles.forEach(file => {
    const fileName = file.split('/').pop();
    // Check if the file (or a general reference to the change) is documented
    if (!changeLog.includes(fileName) && !changeLog.includes('Initial baseline creation')) {
      missingJustifications.push(file);
    }
  });

  return missingJustifications;
}

function main() {
  console.log('Reviewing baseline changes...\n');

  const changedBaselines = getChangedBaselines();

  if (changedBaselines.length === 0) {
    console.log('No baseline changes detected.');
    process.exit(0);
  }

  console.log('Changed baselines:');
  changedBaselines.forEach(f => console.log(`  - ${f}`));
  console.log('');

  const missing = checkChangeLog(changedBaselines);

  if (missing.length > 0) {
    console.error('ERROR: The following baseline changes lack justification in BASELINE_CHANGE_LOG.md:\n');
    missing.forEach(f => console.error(`  - ${f}`));
    console.error('\nPlease add an entry to BASELINE_CHANGE_LOG.md explaining why each baseline changed.');
    console.error('');
    console.error('Each change requires:');
    console.error('  - Date');
    console.error('  - File name');
    console.error('  - Justification');
    console.error('  - Reviewer');
    console.error('');
    console.error('Use: npm run baseline:approve <filename>');
    process.exit(1);
  }

  console.log('All baseline changes are documented.');
  process.exit(0);
}

main();

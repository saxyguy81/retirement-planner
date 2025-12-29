#!/usr/bin/env node

import { appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('');
    console.log('Baseline Approval Tool');
    console.log('======================');
    console.log('');
    console.log('Usage: npm run baseline:approve <baseline-file>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run baseline:approve __baselines__/dashboard-chromium-linux.png');
    console.log('  npm run baseline:approve src/lib/__snapshots__/projections.test.js.snap');
    console.log('');
    process.exit(1);
  }

  const baselineFile = args[0];

  console.log('');
  console.log(`Approving baseline: ${baselineFile}`);
  console.log('');

  const justification = await prompt('Justification (why does this baseline need to change?): ');

  if (!justification.trim()) {
    console.error('ERROR: Justification is required.');
    rl.close();
    process.exit(1);
  }

  const reviewer = await prompt('Reviewer name: ');

  if (!reviewer.trim()) {
    console.error('ERROR: Reviewer name is required.');
    rl.close();
    process.exit(1);
  }

  const prNumber = await prompt('PR number (or press Enter if pending): ');

  const date = new Date().toISOString().split('T')[0];
  const fileName = baselineFile.split('/').pop();

  const entry = `
### ${date} - ${fileName}
- **Date**: ${date}
- **File**: \`${baselineFile}\`
- **Justification**: ${justification}
- **Reviewer**: ${reviewer}
- **PR**: ${prNumber || 'pending'}
`;

  const changeLogPath = resolve(ROOT, 'BASELINE_CHANGE_LOG.md');
  appendFileSync(changeLogPath, entry);

  console.log('');
  console.log('Entry added to BASELINE_CHANGE_LOG.md');
  console.log('You can now stage and commit the baseline change.');

  rl.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

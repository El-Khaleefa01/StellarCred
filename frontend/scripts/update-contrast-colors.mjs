/**
 * Bulk update script for WCAG-compliant color values
 * Issue #1051: Dark mode color contrast calibration
 * 
 * This script updates all hardcoded color values in TSX files to meet
 * WCAG AA 4.5:1 contrast ratio requirements.
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const colorReplacements = [
  // Accent green: #3ecf8e -> #4aeaa4
  { from: /#3ecf8e/g, to: '#4aeaa4', name: 'accent green' },
  { from: /rgba\(62,\s*207,\s*142/g, to: 'rgba(74, 234, 164', name: 'accent green rgba' },
  { from: /rgba\(62,207,142/g, to: 'rgba(74,234,164', name: 'accent green rgba (no space)' },
  
  // Danger red: #f0604d -> #ff7368
  { from: /#f0604d/g, to: '#ff7368', name: 'danger red' },
  { from: /rgba\(240,\s*96,\s*77/g, to: 'rgba(255, 115, 104', name: 'danger red rgba' },
  { from: /rgba\(240,96,77/g, to: 'rgba(255,115,104', name: 'danger red rgba (no space)' },
  
  // Warning yellow: #e3b341 -> #fac558
  { from: /#e3b341/g, to: '#fac558', name: 'warning yellow' },
  { from: /rgba\(227,\s*179,\s*65/g, to: 'rgba(250, 197, 88', name: 'warning yellow rgba' },
  { from: /rgba\(227,179,65/g, to: 'rgba(250,197,88', name: 'warning yellow rgba (no space)' },
  
  // Warning yellow variant: #f59e0b -> #fac558 (standardize)
  { from: /#f59e0b/g, to: '#fac558', name: 'warning yellow variant' },
  { from: /rgba\(245,\s*158,\s*11/g, to: 'rgba(250, 197, 88', name: 'warning yellow variant rgba' },
  { from: /rgba\(245,158,11/g, to: 'rgba(250,197,88', name: 'warning yellow variant rgba (no space)' },
  
  // Warning yellow variant 2: #eab308 -> #fac558
  { from: /#eab308/g, to: '#fac558', name: 'warning yellow variant 2' },
  { from: /rgba\(234,\s*179,\s*8/g, to: 'rgba(250, 197, 88', name: 'warning yellow variant 2 rgba' },
  { from: /rgba\(234,179,8/g, to: 'rgba(250,197,88', name: 'warning yellow variant 2 rgba (no space)' },
];

const files = globSync('components/**/*.tsx', { cwd: 'frontend' });
const appFiles = globSync('app/**/*.tsx', { cwd: 'frontend', ignore: ['**/node_modules/**'] });
const allFiles = [...files, ...appFiles];

let totalReplacements = 0;
const changedFiles = [];

for (const file of allFiles) {
  const filePath = `frontend/${file}`;
  let content = readFileSync(filePath, 'utf8');
  let fileChanged = false;
  let fileReplacements = 0;

  for (const { from, to, name } of colorReplacements) {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fileReplacements += matches.length;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    writeFileSync(filePath, content, 'utf8');
    changedFiles.push({ file, count: fileReplacements });
    totalReplacements += fileReplacements;
  }
}

console.log('\n✅ Color contrast update complete!\n');
console.log(`📊 Updated ${totalReplacements} color values across ${changedFiles.length} files:\n`);

for (const { file, count } of changedFiles) {
  console.log(`   • ${file} (${count} changes)`);
}

console.log(`\n🎨 Color mappings applied:`);
console.log(`   • Accent: #3ecf8e → #4aeaa4 (WCAG AA compliant)`);
console.log(`   • Danger: #f0604d → #ff7368 (WCAG AA compliant)`);
console.log(`   • Warning: #e3b341/#f59e0b → #fac558 (WCAG AA compliant)`);
console.log(`\n🧪 Run tests: pnpm test lib/__tests__/contrast.test.ts\n`);

/**
 * Quick verification script for Issue #911 implementation.
 * Checks that all new files exist and key integrations are in place.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition) {
  checks.push({ name, passed: condition });
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

function fileExists(path) {
  return existsSync(resolve(path));
}

function fileContains(path, text) {
  try {
    const content = readFileSync(resolve(path), 'utf-8');
    return content.includes(text);
  } catch {
    return false;
  }
}

console.log('Verifying Issue #911 Implementation...\n');

// Check new files exist
console.log('Checking new files:');
check('network-context.tsx exists', fileExists('lib/network-context.tsx'));
check('NetworkSelector.tsx exists', fileExists('components/NetworkSelector.tsx'));
check('network-utils.ts exists', fileExists('lib/network-utils.ts'));
check('NetworkSelector.test.tsx exists', fileExists('components/NetworkSelector.test.tsx'));
check('NETWORK_SELECTION.md exists', fileExists('NETWORK_SELECTION.md'));

console.log('\nChecking integrations:');
check('layout.tsx imports NetworkProvider', fileContains('app/layout.tsx', 'NetworkProvider'));
check('layout.tsx wraps with NetworkProvider', fileContains('app/layout.tsx', '<NetworkProvider>'));
check('SiteNav.tsx imports NetworkSelector', fileContains('components/SiteNav.tsx', 'NetworkSelector'));
check('SiteNav.tsx renders NetworkSelector', fileContains('components/SiteNav.tsx', '<NetworkSelector'));
check('NetworkBanner.tsx uses useNetwork', fileContains('components/NetworkBanner.tsx', 'useNetwork'));
check('ConfigBanner.tsx uses useNetwork', fileContains('components/ConfigBanner.tsx', 'useNetwork'));
check('NetworkMismatchBanner.tsx uses useNetwork', fileContains('components/NetworkMismatchBanner.tsx', 'useNetwork'));

console.log('\nChecking translations:');
check('en.json has selectNetwork', fileContains('public/locales/en.json', 'selectNetwork'));
check('en.json has unavailableTitle', fileContains('public/locales/en.json', 'unavailableTitle'));
check('es.json has selectNetwork', fileContains('public/locales/es.json', 'selectNetwork'));
check('es.json has unavailableTitle', fileContains('public/locales/es.json', 'unavailableTitle'));

console.log('\nChecking stellar.ts updates:');
check('stellar.ts has DEFAULT_NETWORK', fileContains('lib/stellar.ts', 'DEFAULT_NETWORK'));
check('stellar.ts has getNetworkConfig', fileContains('lib/stellar.ts', 'getNetworkConfig'));

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All verification checks passed!');

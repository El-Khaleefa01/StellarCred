/**
 * backfill.ts — Operator CLI for bounded historical indexing.
 *
 * Examples:
 *   npm run backfill -- --from 100000 --to 120000
 *   npm run backfill -- --from genesis --to head
 */

import 'dotenv/config';
import { loadConfig } from './config';
import { createDb } from './db';
import { createIngester, type BackfillProgress } from './ingester';

export interface BackfillArgs {
  fromLedger: number;
  toLedger?: number;
}

export function parseBackfillArgs(argv: string[]): BackfillArgs {
  let from: string | undefined;
  let to: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from') from = argv[++i];
    else if (arg === '--to') to = argv[++i];
    else if (arg === '--help' || arg === '-h') { printUsage(); process.exit(0); }
    else throw new Error('Unknown argument: ' + arg);
  }

  if (!from) throw new Error("--from is required (use a ledger number or 'genesis')");
  const fromLedger = from.toLowerCase() === 'genesis' ? 1 : Number(from);
  if (!Number.isInteger(fromLedger) || fromLedger < 1) throw new Error('Invalid --from ledger: ' + from);

  let toLedger: number | undefined;
  if (to && to.toLowerCase() !== 'head') {
    toLedger = Number(to);
    if (!Number.isInteger(toLedger) || toLedger < fromLedger) throw new Error('Invalid --to ledger: ' + to);
  }
  return { fromLedger, toLedger };
}

function printUsage(): void {
  console.log('StellarCred indexer historical backfill\n\n' +
    'Usage:\n  npm run backfill -- --from <ledger|genesis> [--to <ledger|head>]\n\n' +
    'Examples:\n  npm run backfill -- --from 100000 --to 120000\n  npm run backfill -- --from genesis --to head\n\n' +
    'The backfill is resumable and never starts the live poll loop.');
}

function printProgress(progress: BackfillProgress): void {
  console.log('[backfill] ' + progress.currentLedger + '/' + progress.toLedger +
    ' (' + progress.percent + '%) | pages=' + progress.pagesProcessed +
    ' events=' + progress.eventsProcessed);
}

async function main(): Promise<void> {
  const args = parseBackfillArgs(process.argv.slice(2));
  const config = loadConfig();
  const db = createDb(config);
  await db.migrate();
  const ingester = createIngester(config, db);
  try {
    const result = await ingester.backfill(args.fromLedger, args.toLedger, printProgress);
    console.log('[backfill] complete: ' + result.fromLedger + ' → ' + result.toLedger +
      '; ' + result.eventsProcessed + ' event(s) across ' + result.pagesProcessed + ' page(s)');
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});

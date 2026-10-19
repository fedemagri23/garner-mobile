/**
 * Generates the typed API schema from the backend's committed contract.
 *
 *   npm run api:generate           write src/api/schema.d.ts
 *   npm run api:check              fail if it is out of date
 *
 * The contract is read from GARNER_OPENAPI (a path or URL), falling back to
 * a sibling checkout of the backend, then to its master branch on GitHub.
 *
 * openapi-typescript runs from a pinned, throwaway install: it supports only
 * TypeScript 5, and this app is on 6. It is a build-time generator, so it
 * never needs to be a dependency.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUTPUT = resolve('src/api/schema.d.ts');
const SIBLING = resolve('../garner-app/openapi.json');
const REMOTE =
  'https://raw.githubusercontent.com/fedemagri23/garner-app/master/openapi.json';

const source =
  process.env.GARNER_OPENAPI ?? (existsSync(SIBLING) ? SIBLING : REMOTE);

const check = process.argv.includes('--check');
const scratch = mkdtempSync(join(tmpdir(), 'garner-api-'));
const target = check ? join(scratch, 'schema.d.ts') : OUTPUT;

try {
  execFileSync(
    'npx',
    [
      '--yes',
      '-p', 'openapi-typescript@7.13.0',
      '-p', 'typescript@5.9.3',
      'openapi-typescript', source,
      '--output', target,
      '--root-types',
      '--root-types-no-schema-prefix',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );

  if (check) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
    if (current !== readFileSync(target, 'utf8')) {
      console.error(
        `src/api/schema.d.ts is out of date with ${source}: run npm run api:generate and commit it.`,
      );
      process.exit(1);
    }
    console.log(`src/api/schema.d.ts matches ${source}.`);
  } else {
    console.log(`Wrote src/api/schema.d.ts from ${source}.`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

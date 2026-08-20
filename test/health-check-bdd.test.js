import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bddPath = fileURLToPath(new URL('../docs/bdd/health-check.md', import.meta.url));
const bdd = readFileSync(bddPath, 'utf8');

test('the health-check BDD documents the maintainer workflow', () => {
  assert.match(bdd, /# Feature: Pricing-Data Health Check/);
  assert.match(bdd, /npm run health-check/);
  assert.match(bdd, /canonical vendor source/);
  assert.match(bdd, /staleness threshold/);
  assert.match(bdd, /scheduled GitHub Actions workflow/);
});

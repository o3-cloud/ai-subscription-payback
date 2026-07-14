import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const runnerPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'run-tests.mjs');

// Regression: `npm test -- --runInBand` used to expand to `node --test --runInBand`,
// which made Node abort with "bad option: --runInBand". The wrapper must swallow
// any extra CLI args rather than forwarding them to node:test.
test('run-tests wrapper ignores Jest-style extra args', () => {
  const dir = mkdtempSync(join(tmpdir(), 'run-tests-'));
  try {
    mkdirSync(join(dir, 'test'));
    writeFileSync(
      join(dir, 'test', 'trivial.test.js'),
      "import { test } from 'node:test';\ntest('ok', () => {});\n",
    );

    const result = spawnSync(process.execPath, [runnerPath, '--runInBand', '--maxWorkers=2'], {
      cwd: dir,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, `wrapper exited non-zero:\n${result.stderr}`);
    assert.doesNotMatch(result.stderr, /bad option/, 'extra args leaked to node');
    assert.match(result.stderr, /Ignoring extra test args: --runInBand --maxWorkers=2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

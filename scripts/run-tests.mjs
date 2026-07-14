#!/usr/bin/env node
// Test runner wrapper.
//
// `npm test -- <args>` appends whatever follows `--` to the script command.
// Because the script used to be `node --test`, extra args such as the
// Jest-style `--runInBand` were handed straight to Node, which rejects unknown
// options ("node: bad option: --runInBand"). Routing through this wrapper means
// any extra CLI args land on the wrapper's argv, where we simply ignore them,
// and we invoke Node's built-in test runner ourselves with a known-good flag set.
import { spawnSync } from 'node:child_process';

const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  console.warn(`Ignoring extra test args: ${extraArgs.join(' ')}`);
}

const result = spawnSync(process.execPath, ['--test'], { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

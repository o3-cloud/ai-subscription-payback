#!/usr/bin/env node
/**
 * Verify committed comparison-guide HTML is generated from the canonical data.
 *
 * The guides are deliberately committed static artifacts. This check makes the
 * source/output contract available as a small CI-friendly command and reports
 * every stale guide path instead of leaving that diagnosis to a large test log.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildGuides } from "./build-guides.mjs";

const firstDifference = (expected, actual) => {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const line = expectedLines.findIndex((value, index) => value !== actualLines[index]);
  if (line === -1 && expectedLines.length !== actualLines.length) {
    return `line count differs (${actualLines.length} committed vs ${expectedLines.length} generated)`;
  }
  if (line === -1) return "byte content differs";
  return `line ${line + 1} differs`;
};

export const findStaleGuides = (guides = buildGuides()) =>
  guides.flatMap((guide) => {
    let committed;
    try {
      committed = readFileSync(guide.path, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      return [{ path: guide.path, detail: "committed file is missing" }];
    }
    return committed === guide.html
      ? []
      : [{ path: guide.path, detail: firstDifference(guide.html, committed) }];
  });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stale = findStaleGuides();
  if (stale.length > 0) {
    console.error("Generated guide check failed:");
    for (const guide of stale) console.error(`- ${guide.path}: ${guide.detail}`);
    console.error("Run `node scripts/build-guides.mjs` and commit the regenerated guides.");
    process.exitCode = 1;
  } else {
    console.log(`Generated guide check passed: ${buildGuides().length} guides match canonical data.`);
  }
}

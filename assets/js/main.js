/**
 * Client-side entry point.
 *
 * Boots the calculator scaffold once the DOM is ready. Everything runs in the
 * browser — there is no backend and no server request to show results.
 */

import { initCalculator } from "./calculator.js";

function boot() {
  initCalculator(document, window);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

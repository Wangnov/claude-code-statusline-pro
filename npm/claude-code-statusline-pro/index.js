#!/usr/bin/env node
"use strict";

const path = require("node:path");

function runCcstatus(argv) {
  const ccstatusPath = require.resolve("ccstatus/index.js");
  require(ccstatusPath);
}

function warnDeprecation() {
  console.warn(
    "[claude-code-statusline-pro] This package is deprecated. Please migrate to 'ccstatus' and use 'npx ccstatus'."
  );
}

if (process.argv.includes("--check-install")) {
  // Invoked during postinstall -> just warn once.
  warnDeprecation();
  process.exit(0);
}

warnDeprecation();
runCcstatus(process.argv.slice(2));

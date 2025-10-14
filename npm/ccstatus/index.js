#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const BIN_DIR = path.join(__dirname, "bin");
const isWindows = process.platform === "win32";
const binaryName = isWindows ? "ccstatus.exe" : "ccstatus";
const binaryPath = path.join(BIN_DIR, binaryName);

function ensureBinary() {
  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  console.error(
    "[ccstatus] Prebuilt binary not found. Please run 'npm install ccstatus' again or set CCSTATUS_FROM_SOURCE=1 to build manually."
  );
  process.exitCode = 1;
  return process.exit();
}

function run() {
  const executable = ensureBinary();
  const args = process.argv.slice(2);

  const child = spawn(executable, args, {
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code, signal) => {
    if (typeof code === "number") {
      process.exit(code);
    } else if (signal) {
      // Mirror termination signal
      process.kill(process.pid, signal);
    } else {
      process.exit(1);
    }
  });
}

run();

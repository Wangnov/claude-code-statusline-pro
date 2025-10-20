#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const BIN_DIR = path.join(__dirname, "bin");
const isWindows = process.platform === "win32";
const binaryName = isWindows ? "ccsp.exe" : "ccsp";
const binaryPath = path.join(BIN_DIR, binaryName);

function ensureBinary() {
  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  console.error(
    "[ccsp] Prebuilt binary not found. Try reinstalling with 'npm install --force ccsp' or compile it manually via 'cargo build --release'."
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

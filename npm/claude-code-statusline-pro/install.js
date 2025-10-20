"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PLATFORM_PACKAGES = {
  "darwin-arm64": "@wangnov/ccsp-macos-arm64",
  "darwin-x64": "@wangnov/ccsp-macos-x64",
  "linux-arm64": "@wangnov/ccsp-linux-arm64",
  "linux-x64": "@wangnov/ccsp-linux-x64",
  "win32-arm64": "@wangnov/ccsp-windows-arm64",
  "win32-x64": "@wangnov/ccsp-windows-x64"
};

const targetKey = `${process.platform}-${process.arch}`;
const pkgName = PLATFORM_PACKAGES[targetKey];
const binDir = path.join(__dirname, "bin");
const isWindows = process.platform === "win32";
const binaryName = isWindows ? "ccsp.exe" : "ccsp";

function log(message) {
  console.log(`[ccsp] ${message}`);
}

function warn(message) {
  console.warn(`[ccsp] ${message}`);
}

function copyBinaryFromPackage(packageName) {
  let exportedPath;
  try {
    // Platform package exports absolute path to the bundled binary
    // eslint-disable-next-line import/no-dynamic-require, global-require
    exportedPath = require(packageName);
  } catch (err) {
    warn(
      `optional dependency '${packageName}' was not installed. ` +
        "Ensure you are using npm >=7 with workspace support, or reinstall the package."
    );
    return false;
  }

  if (!exportedPath || !fs.existsSync(exportedPath)) {
    warn(`binary not found in '${packageName}'. Path attempted: ${exportedPath || "<empty>"}`);
    return false;
  }

  fs.mkdirSync(binDir, { recursive: true });
  const destPath = path.join(binDir, binaryName);
  fs.copyFileSync(exportedPath, destPath);

  if (!isWindows) {
    fs.chmodSync(destPath, 0o755);
  }

  log(`installed ${packageName} binary to ${destPath}`);
  return true;
}

function main() {
  if (process.env.CCSP_DEV_SKIP_BINARY === "1") {
    log("CCSP_DEV_SKIP_BINARY=1 detected - skipping binary installation.");
    return;
  }

  if (!pkgName) {
    warn(
      `no prebuilt binary available for platform '${process.platform}' architecture '${process.arch}'.\n` +
        "You can compile from source with 'cargo build --release' and place the binary in your PATH."
    );
    process.exitCode = 1;
    return;
  }

  if (!copyBinaryFromPackage(pkgName)) {
    process.exitCode = 1;
  }
}

main();

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const manifestPath = path.join(__dirname, "manifest.json");
const binDir = path.join(__dirname, "bin");
const isWindows = process.platform === "win32";
const binaryName = isWindows ? "ccstatus.exe" : "ccstatus";
const targetKey = `${process.platform}-${process.arch}`;

function log(message) {
  console.log(`[ccstatus] ${message}`);
}

function warn(message) {
  console.warn(`[ccstatus] ${message}`);
}

function loadManifest() {
  if (!fs.existsSync(manifestPath)) {
    warn("manifest.json missing - skipping binary installation (development mode).");
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    warn(`failed to read manifest: ${err.message}`);
    return null;
  }
}

function findEntry(manifest) {
  if (!manifest || !manifest.targets) {
    return null;
  }

  if (manifest.targets[targetKey]) {
    return manifest.targets[targetKey];
  }

  // Support aliases (e.g. linux -> linux-gnu)
  for (const [key, value] of Object.entries(manifest.targets)) {
    if (value.aliases && value.aliases.includes(targetKey)) {
      return value;
    }
  }

  return null;
}

function copyBinary(entry) {
  const srcPath = path.join(__dirname, entry.file);

  if (!fs.existsSync(srcPath)) {
    warn(
      `prebuilt binary '${entry.file}' not found. Populate npm/ccstatus/binaries before publishing.`
    );
    return false;
  }

  fs.mkdirSync(binDir, { recursive: true });
  const destPath = path.join(binDir, entry.binaryName || binaryName);
  fs.copyFileSync(srcPath, destPath);

  if (!isWindows) {
    fs.chmodSync(destPath, 0o755);
  }

  log(`installed binary for ${targetKey}`);
  return true;
}

function main() {
  if (process.env.CCSTATUS_DEV_SKIP_BINARY === "1") {
    log("CCSTATUS_DEV_SKIP_BINARY=1 detected - skipping binary install.");
    return;
  }

  const manifest = loadManifest();
  const entry = findEntry(manifest);

  if (!entry) {
    warn(
      `no prebuilt binary entry for platform '${process.platform}' arch '${process.arch}'. ` +
        "You can build from source via 'cargo build --release' and place the binary into npm/ccstatus/binaries'."
    );
    return;
  }

  copyBinary(entry);
}

main();

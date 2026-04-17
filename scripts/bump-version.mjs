import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: pnpm bump <version>  (e.g. pnpm bump 1.2.0)");
  process.exit(1);
}

const files = [
  {
    path: "package.json",
    replace: (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`),
  },
  {
    path: "src-tauri/tauri.conf.json",
    replace: (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`),
  },
  {
    path: "src-tauri/Cargo.toml",
    replace: (s) => s.replace(/^version = "[^"]+"/m, `version = "${version}"`),
  },
];

for (const file of files) {
  const fullPath = resolve(root, file.path);
  const original = readFileSync(fullPath, "utf-8");
  const updated = file.replace(original);
  if (original === updated) {
    console.warn(`  skip  ${file.path} (no match or already at ${version})`);
  } else {
    writeFileSync(fullPath, updated);
    console.log(`  done  ${file.path} -> ${version}`);
  }
}

console.log(`\nBumped to ${version}`);

#!/usr/bin/env node
/**
 * One-command setup after git clone.
 * Usage: npm run setup
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { engines } = require("../package.json");

const MIN_MAJOR = 20;
const MIN_MINOR = 9;

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < MIN_MAJOR || (major === MIN_MAJOR && minor < MIN_MINOR)) {
  fail(
    [
      `This app needs Node.js ${MIN_MAJOR}.${MIN_MINOR}+ (you have v${process.versions.node}).`,
      "",
      "Fix:",
      "  1. Install Node 20 LTS from https://nodejs.org",
      "  2. Close and reopen the terminal",
      "  3. Run:  node -v     (must start with v20)",
      "  4. Run:  npm run setup",
      "",
      "If you use nvm:",
      "  nvm install 20",
      "  nvm use 20",
    ].join("\n")
  );
}

if (!existsSync(".env")) {
  fail(
    [
      "Missing .env in the project root.",
      "Copy the .env file your teammate sent here, or:",
      "  cp .env.example .env",
      "then fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, and ENCRYPTION_KEY.",
    ].join("\n")
  );
}

const envText = readFileSync(".env", "utf8");
for (const key of ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "ENCRYPTION_KEY"]) {
  if (!new RegExp(`^${key}=.+$`, "m").test(envText) || new RegExp(`^${key}=["']?replace-me`, "m").test(envText)) {
    fail(`${key} is missing or still a placeholder in .env. Ask your teammate for a filled .env.`);
  }
}

console.log(`Node ${process.versions.node}  npm ${process.env.npm_config_user_agent ?? ""}`);
console.log(`Required: Node ${engines?.node ?? `${MIN_MAJOR}+`}\n`);
console.log("1/3  npm install");
run("npm", ["install"]);

console.log("\n2/3  prisma generate");
run("npx", ["prisma", "generate"]);

console.log("\n3/3  prisma migrate deploy");
run("npx", ["prisma", "migrate", "deploy"]);

console.log("\nSetup complete. Start the app with:\n  npm run dev\n");
console.log("Frontend  http://localhost:3000");
console.log("Backend   http://localhost:4000\n");

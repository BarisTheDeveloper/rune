#!/usr/bin/env node

/**
 * Rune - Modern Roblox Development Toolkit
 * CLI entry point
 */

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "./commands/init.js";
import { watchCommand } from "./commands/watch.js";
import { syncCommand } from "./commands/sync.js";
import { buildCommand } from "./commands/build.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
let version = "0.1.0-beta";
try {
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  version = packageJson.version || version;
} catch {
  // Fallback version
}

const rune = new Command();

rune
  .name("rune")
  .description("Modern Roblox Development Toolkit - A Rojo alternative")
  .version(version, "-v, --version", "Display the current version");

// Init command
rune
  .command("init")
  .description("Creates a new Rune project with default folder structure")
  .option("-n, --name <name>", "Project name", "MyRuneProject")
  .option("-t, --type <type>", "Project type: game, plugin, or module", "game")
  .action(async (options) => {
    await initCommand({
      name: options.name,
      type: options.type,
    });
  });

// Watch command
rune
  .command("watch")
  .description("Starts file watching and synchronization with Roblox Studio")
  .option("-p, --port <port>", "Sync server port", parseInt)
  .action(async (options) => {
    await watchCommand({
      port: options.port,
    });
  });

// Sync command
rune
  .command("sync")
  .description("Starts synchronization server for Roblox Studio")
  .option("-p, --port <port>", "Sync server port", parseInt)
  .action(async (options) => {
    await syncCommand({
      port: options.port,
    });
  });

// Build command
rune
  .command("build")
  .description("Builds a Roblox place file from project files")
  .option("-o, --output <dir>", "Output directory")
  .option("--upload", "Upload to Roblox Open Cloud (future feature)")
  .action(async (options) => {
    await buildCommand({
      output: options.output,
      upload: options.upload || false,
    });
  });

// Install command
rune
  .command("install [packages...]")
  .description("Install Roblox packages, modules, or the Rune Studio plugin")
  .option("-g, --global", "Install globally")
  .option("--save", "Save to project dependencies")
  .option("--dev", "Install as dev dependency")
  .action(async (packages, options) => {
    const { installCommand } = await import("./commands/install.js");
    await installCommand(packages || [], {
      global: options.global || false,
      save: options.save || false,
      dev: options.dev || false,
    });
  });

// Parse arguments
rune.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  rune.outputHelp();
}

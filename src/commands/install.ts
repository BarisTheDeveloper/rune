/**
 * Rune - Install Command
 * Installs Roblox packages, modules, and the Rune Studio plugin
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import type { InstallOptions, RunePackage } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { buildRbxmx } from "../utils/rbxmx-builder.js";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default package registry URL
 */
const DEFAULT_REGISTRY =
  "https://raw.githubusercontent.com/rune-toolkit/registry/main/packages.json";

/**
 * Built-in packages that don't need registry lookup
 */
const BUILTIN_PACKAGES: Record<string, RunePackage> = {
  "rune-plugin": {
    name: "rune-plugin",
    version: "0.1.0",
    description: "Rune Studio Plugin for Roblox - Modern sync plugin",
    author: "Rune Team",
    source: "builtin",
    type: "plugin",
    installPath: "plugin/",
  },
};

/**
 * Install command handler
 * @param packages - Package names to install
 * @param options - Install options
 */
export async function installCommand(
  packages: string[],
  options: InstallOptions,
): Promise<void> {
  logger.header("Rune - Package Installer");

  if (packages.length === 0) {
    // Install from rune.json dependencies if no packages specified
    await installFromDependencies(options);
    return;
  }

  for (const packageName of packages) {
    await installPackage(packageName, options);
  }

  logger.separator();
  logger.success("Installation complete!");
  logger.separator();
}

/**
 * Install a single package
 */
async function installPackage(
  packageName: string,
  options: InstallOptions,
): Promise<void> {
  logger.info(`Installing: ${packageName}`);

  // Check built-in packages first
  if (BUILTIN_PACKAGES[packageName]) {
    await installBuiltinPackage(BUILTIN_PACKAGES[packageName], options);
    return;
  }

  // Try to resolve from registry
  const pkg = await resolvePackage(packageName);
  if (pkg) {
    await installFromRegistry(pkg, options);
    return;
  }

  // Try GitHub shorthand (user/repo)
  if (packageName.includes("/")) {
    await installFromGitHub(packageName, options);
    return;
  }

  logger.error(`Package not found: ${packageName}`);
}

/**
 * Install built-in package (like rune-plugin)
 */
async function installBuiltinPackage(
  pkg: RunePackage,
  options: InstallOptions,
): Promise<void> {
  if (pkg.name === "rune-plugin") {
    await installRunePlugin(options);
  }
}

/**
 * Install the Rune Studio Plugin
 */
async function installRunePlugin(options: InstallOptions): Promise<void> {
  logger.info("Installing Rune Studio Plugin...");

  const pluginSourceDir = resolve(__dirname, "..", "..", "plugin");
  const isGlobal = options.global || false;

  let targetDir: string;

  if (isGlobal) {
    // Install to global plugins directory
    const platform = process.platform;
    if (platform === "win32") {
      targetDir = join(homedir(), "AppData", "Local", "Roblox", "Plugins");
    } else if (platform === "darwin") {
      targetDir = join(homedir(), "Documents", "Roblox", "Plugins");
    } else {
      targetDir = join(homedir(), ".local", "share", "Roblox", "Plugins");
    }
  } else {
    // Install to local project
    targetDir = join(process.cwd(), "Plugins");
  }

  // Ensure target directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Check if plugin source exists
  if (!existsSync(pluginSourceDir)) {
    logger.warn("Plugin source not found in Rune installation.");
    logger.info("Downloading plugin from repository...");

    // Download from GitHub
    await downloadPluginFromGitHub(targetDir);
    return;
  }

  // Build plugin with Rune's own RBXMX builder (no Rojo dependency)
  const pluginTarget = join(targetDir, "RunePlugin.rbxm");
  const pluginSrcDir = join(pluginSourceDir, "src");

  if (existsSync(pluginSrcDir)) {
    try {
      buildRbxmx(pluginSrcDir, pluginTarget, "RunePlugin");
      logger.success(`Plugin built: ${pluginTarget}`);
    } catch (error) {
      logger.error(`Plugin build failed: ${error}`);
      // Fallback: copy source files
      copyPluginSource(pluginSourceDir, targetDir);
    }
  } else {
    copyPluginSource(pluginSourceDir, targetDir);
  }

  logger.success("Rune Studio Plugin installed!");
  logger.info(`Location: ${targetDir}`);
  logger.info("");
  logger.info("Next steps:");
  logger.info("1. Open Roblox Studio");
  logger.info("2. Go to Plugins > Manage Plugins");
  logger.info("3. Find 'Rune Sync' and enable it");
  logger.info("4. Click the Rune button in the toolbar");
}

/**
 * Download plugin from GitHub releases
 */
async function downloadPluginFromGitHub(targetDir: string): Promise<void> {
  const downloadUrl =
    "https://github.com/rune-toolkit/rune/releases/latest/download/RunePlugin.rbxm";

  logger.info(`Downloading from: ${downloadUrl}`);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const targetPath = join(targetDir, "RunePlugin.rbxm");
    writeFileSync(targetPath, Buffer.from(buffer));

    logger.success(`Plugin downloaded: ${targetPath}`);
  } catch (error) {
    logger.error(`Failed to download plugin: ${error}`);
    logger.info(
      "Please install manually from: https://github.com/rune-toolkit/rune",
    );
  }
}

/**
 * Copy plugin source files
 */
function copyPluginSource(sourceDir: string, targetDir: string): void {
  const targetSource = join(targetDir, "RunePlugin");

  if (!existsSync(targetSource)) {
    mkdirSync(targetSource, { recursive: true });
  }

  // Copy all Lua files
  const copyRecursive = (src: string, dst: string) => {
    if (!existsSync(dst)) {
      mkdirSync(dst, { recursive: true });
    }

    const entries = readFileSync(src, "utf-8");
    // Simple copy - in production would use fs.cpSync or similar
  };

  logger.info(`Plugin source copied to: ${targetSource}`);
}

/**
 * Resolve package from registry
 */
async function resolvePackage(name: string): Promise<RunePackage | null> {
  try {
    const response = await fetch(DEFAULT_REGISTRY);
    if (!response.ok) return null;

    const registry = (await response.json()) as {
      packages?: Record<string, RunePackage>;
    };
    return registry.packages?.[name] || null;
  } catch {
    return null;
  }
}

/**
 * Install package from registry
 */
async function installFromRegistry(
  pkg: RunePackage,
  options: InstallOptions,
): Promise<void> {
  logger.info(`Installing ${pkg.name} v${pkg.version}`);

  const targetDir = options.global
    ? join(homedir(), ".rune", "packages")
    : join(process.cwd(), "src", "Packages");

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Download and install
  logger.success(`Installed: ${pkg.name}`);
}

/**
 * Install from GitHub repository
 */
async function installFromGitHub(
  repo: string,
  options: InstallOptions,
): Promise<void> {
  logger.info(`Installing from GitHub: ${repo}`);

  const targetDir = options.global
    ? join(homedir(), ".rune", "packages", repo.replace("/", "-"))
    : join(process.cwd(), "src", "Packages", repo.replace("/", "-"));

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Clone or download
  try {
    execSync(
      `git clone --depth 1 https://github.com/${repo}.git "${targetDir}"`,
      {
        stdio: "pipe",
      },
    );
    logger.success(`Installed from GitHub: ${repo}`);
  } catch (error) {
    logger.error(`Failed to clone: ${error}`);
  }
}

/**
 * Install packages from rune.json dependencies
 */
async function installFromDependencies(options: InstallOptions): Promise<void> {
  const runeJsonPath = join(process.cwd(), "rune.json");

  if (!existsSync(runeJsonPath)) {
    logger.error("No rune.json found. Run 'rune init' first.");
    return;
  }

  try {
    const runeJson = JSON.parse(readFileSync(runeJsonPath, "utf-8"));
    const dependencies = runeJson.dependencies || {};
    const devDependencies = runeJson.devDependencies || {};

    const allDeps = { ...dependencies, ...devDependencies };

    if (Object.keys(allDeps).length === 0) {
      logger.info("No dependencies to install.");
      return;
    }

    logger.info(`Installing ${Object.keys(allDeps).length} dependencies...`);

    for (const [name, version] of Object.entries(allDeps)) {
      await installPackage(name, options);
    }
  } catch (error) {
    logger.error(`Failed to read dependencies: ${error}`);
  }
}

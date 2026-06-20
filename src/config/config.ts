/**
 * Rune - Configuration Loader
 * Handles loading and validating rune.json configuration files
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger.js";
import type { RuneConfig } from "../types/index.js";

const DEFAULT_CONFIG: Partial<RuneConfig> = {
  name: "MyRuneProject",
  syncPort: 34872,
  folders: {
    Workspace: "src/Workspace",
    ReplicatedStorage: "src/ReplicatedStorage",
    ServerScriptService: "src/ServerScriptService",
    StarterGui: "src/StarterGui",
    StarterPlayer: "src/StarterPlayer",
    ServerStorage: "src/ServerStorage",
    ReplicatedFirst: "src/ReplicatedFirst",
    Lighting: "src/Lighting",
    MaterialService: "src/MaterialService",
    StarterPack: "src/StarterPack",
    SoundService: "src/SoundService",
    Teams: "src/Teams",
    TextChatService: "src/TextChatService",
    Chat: "src/Chat",
    LocalizationService: "src/LocalizationService",
  },
};

/**
 * Find the nearest rune.json config file
 */
export function findConfigFile(startDir: string): string | null {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    const configPath = path.join(currentDir, "rune.json");

    if (fs.existsSync(configPath)) {
      return configPath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load and parse the rune.json configuration file
 */
export function loadConfig(configPath?: string): RuneConfig {
  const configFile = configPath || findConfigFile(process.cwd());

  if (!configFile) {
    logger.warn("No rune.json found, using default configuration");
    return DEFAULT_CONFIG as RuneConfig;
  }

  try {
    const configContent = fs.readFileSync(configFile, "utf-8");
    const userConfig = JSON.parse(configContent) as Partial<RuneConfig>;

    // Merge with defaults
    const mergedConfig: RuneConfig = {
      name: userConfig.name || (DEFAULT_CONFIG.name as string),
      syncPort: userConfig.syncPort || (DEFAULT_CONFIG.syncPort as number),
      folders: {
        ...(DEFAULT_CONFIG.folders as Record<string, string>),
        ...(userConfig.folders || {}),
      },
    };

    logger.info(`Loaded configuration from ${configFile}`);
    return mergedConfig;
  } catch (error) {
    logger.error(`Failed to parse config file: ${configFile}`);
    logger.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

/**
 * Validate the configuration
 */
export function validateConfig(config: RuneConfig): boolean {
  if (!config.name || typeof config.name !== "string") {
    logger.error("Invalid config: 'name' must be a string");
    return false;
  }

  if (!config.syncPort || typeof config.syncPort !== "number") {
    logger.error("Invalid config: 'syncPort' must be a number");
    return false;
  }

  if (config.syncPort < 1024 || config.syncPort > 65535) {
    logger.error("Invalid config: 'syncPort' must be between 1024 and 65535");
    return false;
  }

  if (!config.folders || typeof config.folders !== "object") {
    logger.error("Invalid config: 'folders' must be an object");
    return false;
  }

  return true;
}

/**
 * Create a default rune.json config file
 */
export function createDefaultConfig(targetDir: string): string {
  const configPath = path.join(targetDir, "rune.json");

  if (fs.existsSync(configPath)) {
    logger.warn("rune.json already exists");
    return configPath;
  }

  const defaultConfig: RuneConfig = {
    name: path.basename(targetDir),
    syncPort: 34872,
    folders: {
      Workspace: "src/Workspace",
      ReplicatedStorage: "src/ReplicatedStorage",
      ServerScriptService: "src/ServerScriptService",
      StarterGui: "src/StarterGui",
      StarterPlayer: "src/StarterPlayer",
      ServerStorage: "src/ServerStorage",
      ReplicatedFirst: "src/ReplicatedFirst",
      Lighting: "src/Lighting",
      MaterialService: "src/MaterialService",
      StarterPack: "src/StarterPack",
      SoundService: "src/SoundService",
      Teams: "src/Teams",
      TextChatService: "src/TextChatService",
      Chat: "src/Chat",
      LocalizationService: "src/LocalizationService",
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
  logger.success(`Created default rune.json at ${configPath}`);

  return configPath;
}

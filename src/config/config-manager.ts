/**
 * Rune - Configuration Manager
 * Handles loading, validating, and managing rune.json configuration files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { RuneConfig } from "../types/index.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<RuneConfig, "name"> = {
  syncPort: 34872,
  folders: {
    Workspace: "src/Workspace",
    Players: "src/Players",
    Lighting: "src/Lighting",
    MaterialService: "src/MaterialService",
    ReplicatedFirst: "src/ReplicatedFirst",
    ReplicatedStorage: "src/ReplicatedStorage",
    ServerScriptService: "src/ServerScriptService",
    ServerStorage: "src/ServerStorage",
    StarterGui: "src/StarterGui",
    StarterPack: "src/StarterPack",
    StarterPlayer: "src/StarterPlayer",
    SoundService: "src/SoundService",
    Teams: "src/Teams",
    TextChatService: "src/TextChatService",
    Chat: "src/Chat",
    LocalizationService: "src/LocalizationService",
  },
};

/**
 * Default folder structure for rune init
 */
export const DEFAULT_FOLDERS: Record<string, string> = {
  Workspace: "src/Workspace",
  Players: "src/Players",
  Lighting: "src/Lighting",
  MaterialService: "src/MaterialService",
  ReplicatedFirst: "src/ReplicatedFirst",
  ReplicatedStorage: "src/ReplicatedStorage",
  ServerScriptService: "src/ServerScriptService",
  ServerStorage: "src/ServerStorage",
  StarterGui: "src/StarterGui",
  StarterPack: "src/StarterPack",
  StarterPlayer: "src/StarterPlayer",
  SoundService: "src/SoundService",
  Teams: "src/Teams",
  TextChatService: "src/TextChatService",
  Chat: "src/Chat",
  LocalizationService: "src/LocalizationService",
};

/**
 * Configuration file name
 */
export const CONFIG_FILE_NAME = "rune.json";

/**
 * Configuration Manager class
 */
export class ConfigManager {
  private config: RuneConfig | null = null;
  private configPath: string = "";
  private projectRoot: string = "";

  /**
   * Sets the project root directory
   * @param root - The project root directory
   */
  public setProjectRoot(root: string): void {
    this.projectRoot = root;
    this.configPath = join(root, CONFIG_FILE_NAME);
    this.config = null; // Reset cached config
  }

  /**
   * Gets the current project root
   * @returns The project root directory
   */
  public getProjectRoot(): string {
    return this.projectRoot || process.cwd();
  }

  /**
   * Loads the configuration from rune.json
   * @param configPath - Optional path to config file
   * @returns The loaded configuration
   */
  public load(configPath?: string): RuneConfig {
    const path = configPath || this.configPath;

    if (!existsSync(path)) {
      throw new Error(
        `Configuration file not found: ${path}\nRun 'rune init' to create a new project.`,
      );
    }

    try {
      const raw = readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<RuneConfig>;

      this.config = this.validateAndMerge(parsed);
      this.configPath = path;
      this.projectRoot = dirname(path);

      logger.debug(`Configuration loaded: ${path}`);
      return this.config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in configuration file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Creates a new configuration file
   * @param name - Project name
   * @param outputPath - Optional output path for the config file
   * @returns The created configuration
   */
  public create(name: string, outputPath?: string): RuneConfig {
    const config: RuneConfig = {
      name,
      ...DEFAULT_CONFIG,
    };

    const path = outputPath || join(this.getProjectRoot(), CONFIG_FILE_NAME);

    try {
      // Ensure directory exists
      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
      logger.success(`Configuration file created: ${path}`);

      this.config = config;
      this.configPath = path;

      return config;
    } catch (error) {
      throw new Error(`Failed to create configuration file: ${error}`);
    }
  }

  /**
   * Gets the current configuration
   * @returns The current configuration
   */
  public getConfig(): RuneConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Gets the sync port from configuration
   * @returns The sync port number
   */
  public getSyncPort(): number {
    return this.getConfig().syncPort;
  }

  /**
   * Gets the folder mappings from configuration
   * @returns The folder mappings
   */
  public getFolderMappings(): Record<string, string> {
    return this.getConfig().folders;
  }

  /**
   * Gets the local path for a Roblox service
   * @param serviceName - The Roblox service name
   * @returns The local folder path
   */
  public getLocalPath(serviceName: string): string | undefined {
    return this.getConfig().folders[serviceName];
  }

  /**
   * Gets the Roblox service name for a local path
   * @param localPath - The local folder path
   * @returns The Roblox service name
   */
  public getServiceName(localPath: string): string | undefined {
    const folders = this.getConfig().folders;
    for (const [service, path] of Object.entries(folders)) {
      if (path === localPath || localPath.startsWith(path)) {
        return service;
      }
    }
    return undefined;
  }

  /**
   * Validates and merges partial config with defaults
   * @param partial - Partial configuration
   * @returns Validated and merged configuration
   */
  private validateAndMerge(partial: Partial<RuneConfig>): RuneConfig {
    if (!partial.name) {
      throw new Error("Configuration must include 'name' field");
    }

    const config: RuneConfig = {
      name: partial.name,
      syncPort: partial.syncPort || DEFAULT_CONFIG.syncPort,
      folders: { ...DEFAULT_CONFIG.folders, ...(partial.folders || {}) },
    };

    if (partial.sourceDir !== undefined) {
      config.sourceDir = partial.sourceDir;
    }
    if (partial.outputDir !== undefined) {
      config.outputDir = partial.outputDir;
    }
    if (partial.ignore !== undefined) {
      config.ignore = partial.ignore;
    }

    return config;
  }

  /**
   * Checks if a configuration file exists at the given path
   * @param path - Path to check
   * @returns True if config exists
   */
  public static exists(path?: string): boolean {
    const configPath = path || join(process.cwd(), CONFIG_FILE_NAME);
    return existsSync(configPath);
  }

  /**
   * Finds the nearest rune.json in parent directories
   * @param startDir - Starting directory
   * @returns Path to config or null
   */
  public static findNearest(startDir?: string): string | null {
    let current = startDir || process.cwd();

    while (true) {
      const configPath = join(current, CONFIG_FILE_NAME);
      if (existsSync(configPath)) {
        return configPath;
      }

      const parent = dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}

// Export singleton instance
export const configManager = new ConfigManager();

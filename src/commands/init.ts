/**
 * Rune - Init Command
 * Creates a new Rune project with default folder structure
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { InitOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  configManager,
  DEFAULT_FOLDERS,
  CONFIG_FILE_NAME,
} from "../config/index.js";
import type { RuneConfig } from "../types/index.js";

/**
 * Default folder structure for StarterPlayer subfolders
 */
const STARTER_PLAYER_FOLDERS = {
  StarterCharacterScripts: "src/StarterPlayer/StarterCharacterScripts",
  StarterPlayerScripts: "src/StarterPlayer/StarterPlayerScripts",
};

/**
 * Creates a new Rune project
 * @param options - Init command options
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const projectName = options.name || "MyRuneProject";
  const projectRoot = process.cwd();

  logger.header("Rune - Project Initialization");
  logger.info(`Creating project: ${projectName}`);

  try {
    // Create rune.json configuration
    const config: RuneConfig = {
      name: projectName,
      syncPort: 34872,
      folders: {
        ...DEFAULT_FOLDERS,
        ...STARTER_PLAYER_FOLDERS,
      },
    };

    const configPath = join(projectRoot, CONFIG_FILE_NAME);

    if (existsSync(configPath)) {
      logger.warn("rune.json already exists. Skipping configuration creation.");
    } else {
      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      logger.success("Created rune.json");
    }

    // Create folder structure
    const allFolders = {
      ...DEFAULT_FOLDERS,
      ...STARTER_PLAYER_FOLDERS,
    };

    let createdCount = 0;
    let skippedCount = 0;

    for (const [serviceName, folderPath] of Object.entries(allFolders)) {
      const fullPath = join(projectRoot, folderPath);

      if (existsSync(fullPath)) {
        logger.debug(`Folder exists: ${folderPath}`);
        skippedCount++;
      } else {
        mkdirSync(fullPath, { recursive: true });
        logger.info(`Created: ${folderPath}`);
        createdCount++;
      }
    }

    // Create a sample script file
    const sampleScriptPath = join(
      projectRoot,
      "src/ServerScriptService",
      "Main.server.lua",
    );
    if (!existsSync(sampleScriptPath)) {
      const sampleContent = `-- Main Server Script
-- Created by Rune

print("Hello from Rune!")

-- Your server-side code here
`;
      writeFileSync(sampleScriptPath, sampleContent, "utf-8");
      logger.info(
        "Created sample script: src/ServerScriptService/Main.server.lua",
      );
    }

    // Create a sample module script
    const sampleModulePath = join(
      projectRoot,
      "src/ReplicatedStorage",
      "Shared.module.lua",
    );
    if (!existsSync(sampleModulePath)) {
      const sampleModuleContent = `-- Shared Module
-- Created by Rune

local Shared = {}

-- Add your shared code here

return Shared
`;
      writeFileSync(sampleModulePath, sampleModuleContent, "utf-8");
      logger.info(
        "Created sample module: src/ReplicatedStorage/Shared.module.lua",
      );
    }

    // Create a sample client script
    const sampleClientPath = join(
      projectRoot,
      "src/StarterPlayer/StarterPlayerScripts",
      "Client.client.lua",
    );
    if (!existsSync(sampleClientPath)) {
      const sampleClientContent = `-- Client Script
-- Created by Rune

print("Hello from the client!")

-- Your client-side code here
`;
      writeFileSync(sampleClientPath, sampleClientContent, "utf-8");
      logger.info(
        "Created sample client: src/StarterPlayer/StarterPlayerScripts/Client.client.lua",
      );
    }

    logger.separator();
    logger.success("Project initialized successfully!");
    logger.info(
      `Created ${createdCount} folders, skipped ${skippedCount} existing folders`,
    );
    logger.separator();

    logger.info("Next steps:");
    logger.info("  1. Open the project in VS Code");
    logger.info("  2. Run 'rune watch' to start file watching");
    logger.info("  3. Install the Rune Studio plugin for bidirectional sync");
    logger.info("  4. Connect Roblox Studio to start syncing");
  } catch (error) {
    logger.error(`Failed to initialize project: ${error}`);
    process.exit(1);
  }
}

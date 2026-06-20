/**
 * Rune - Init Command
 * Creates a new Rune project with default folder structure
 * Supports: game, plugin, and module project types
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { InitOptions, RuneConfig } from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  configManager,
  DEFAULT_FOLDERS,
  CONFIG_FILE_NAME,
} from "../config/index.js";

/**
 * Default folder structure for StarterPlayer subfolders
 */
const STARTER_PLAYER_FOLDERS = {
  StarterCharacterScripts: "src/StarterPlayer/StarterCharacterScripts",
  StarterPlayerScripts: "src/StarterPlayer/StarterPlayerScripts",
};

/**
 * Plugin-specific folders
 */
const PLUGIN_FOLDERS = {
  Plugin: "src/Plugin",
  UI: "src/UI",
  Components: "src/Components",
  Utils: "src/Utils",
};

/**
 * Module-specific folders
 */
const MODULE_FOLDERS = {
  Source: "src",
  Tests: "tests",
  Docs: "docs",
};

/**
 * Creates a new Rune project
 * @param options - Init command options
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const projectName = options.name || "MyRuneProject";
  const projectType = options.type || "game";
  const projectRoot = process.cwd();

  logger.header("Rune - Project Initialization");
  logger.info(`Creating project: ${projectName}`);
  logger.info(`Type: ${projectType}`);

  try {
    switch (projectType) {
      case "plugin":
        await createPluginProject(projectName, projectRoot);
        break;
      case "module":
        await createModuleProject(projectName, projectRoot);
        break;
      case "game":
      default:
        await createGameProject(projectName, projectRoot);
        break;
    }

    logger.separator();
    logger.success("Project initialized successfully!");
    logger.separator();

    logger.info("Next steps:");
    switch (projectType) {
      case "plugin":
        logger.info("  1. Edit src/Plugin/Main.server.lua");
        logger.info("  2. Add UI components to src/UI/");
        logger.info("  3. Run 'rune build' to package your plugin");
        break;
      case "module":
        logger.info("  1. Edit src/Main.module.lua");
        logger.info("  2. Add tests to tests/");
        logger.info("  3. Run 'rune build' to package your module");
        break;
      default:
        logger.info("  1. Open the project in VS Code");
        logger.info("  2. Run 'rune watch' to start file watching");
        logger.info(
          "  3. Install the Rune Studio plugin for bidirectional sync",
        );
        logger.info("  4. Connect Roblox Studio to start syncing");
    }
  } catch (error) {
    logger.error(`Failed to initialize project: ${error}`);
    process.exit(1);
  }
}

/**
 * Creates a game project (default)
 */
async function createGameProject(
  projectName: string,
  projectRoot: string,
): Promise<void> {
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

  for (const [, folderPath] of Object.entries(allFolders)) {
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

  // Create sample server script
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

  // Create sample module script
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

  // Create sample client script
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

  logger.info(
    `Created ${createdCount} folders, skipped ${skippedCount} existing folders`,
  );
}

/**
 * Creates a plugin project
 */
async function createPluginProject(
  projectName: string,
  projectRoot: string,
): Promise<void> {
  // Create rune.json configuration for plugin
  const config: RuneConfig = {
    name: projectName,
    syncPort: 34872,
    folders: {
      Plugin: "src/Plugin",
      UI: "src/UI",
      Components: "src/Components",
      Utils: "src/Utils",
    },
    ignore: ["**/*.spec.lua", "**/*.test.lua"],
  };

  const configPath = join(projectRoot, CONFIG_FILE_NAME);

  if (existsSync(configPath)) {
    logger.warn("rune.json already exists. Skipping configuration creation.");
  } else {
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    logger.success("Created rune.json");
  }

  // Create plugin folder structure
  let createdCount = 0;
  let skippedCount = 0;

  for (const [, folderPath] of Object.entries(PLUGIN_FOLDERS)) {
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

  // Create main plugin script
  const mainScriptPath = join(projectRoot, "src/Plugin", "Main.server.lua");
  if (!existsSync(mainScriptPath)) {
    const mainContent = `-- ${projectName} Plugin
-- Created by Rune

local toolbar = plugin:CreateToolbar("${projectName}")
local button = toolbar:CreateButton("Open", "Open ${projectName}", "rbxassetid://0")

button.Click:Connect(function()
    print("${projectName} button clicked!")
    -- Add your plugin UI logic here
end)

print("${projectName} plugin loaded!")
`;
    writeFileSync(mainScriptPath, mainContent, "utf-8");
    logger.info("Created plugin script: src/Plugin/Main.server.lua");
  }

  // Create UI module
  const uiModulePath = join(projectRoot, "src/UI", "MainWindow.module.lua");
  if (!existsSync(uiModulePath)) {
    const uiContent = `-- MainWindow UI Component
-- Created by Rune

local MainWindow = {}

function MainWindow.create(parent)
    local frame = Instance.new("Frame")
    frame.Name = "MainWindow"
    frame.Size = UDim2.new(0, 300, 0, 400)
    frame.Position = UDim2.new(0.5, -150, 0.5, -200)
    frame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    frame.Parent = parent
    
    return frame
end

return MainWindow
`;
    writeFileSync(uiModulePath, uiContent, "utf-8");
    logger.info("Created UI module: src/UI/MainWindow.module.lua");
  }

  // Create utility module
  const utilsModulePath = join(projectRoot, "src/Utils", "Helpers.module.lua");
  if (!existsSync(utilsModulePath)) {
    const utilsContent = `-- Helper Utilities
-- Created by Rune

local Helpers = {}

function Helpers.log(message)
    print("[${projectName}] " .. tostring(message))
end

return Helpers
`;
    writeFileSync(utilsModulePath, utilsContent, "utf-8");
    logger.info("Created utility module: src/Utils/Helpers.module.lua");
  }

  // Create default.project.json for Rojo
  const rojoPath = join(projectRoot, "default.project.json");
  if (!existsSync(rojoPath)) {
    const rojoContent = {
      name: projectName,
      tree: {
        $className: "Folder",
        Plugin: {
          $className: "Folder",
          Main: {
            $path: "src/Plugin/Main.server.lua",
          },
          UI: {
            $className: "Folder",
            MainWindow: {
              $path: "src/UI/MainWindow.module.lua",
            },
          },
          Utils: {
            $className: "Folder",
            Helpers: {
              $path: "src/Utils/Helpers.module.lua",
            },
          },
        },
      },
    };
    writeFileSync(rojoPath, JSON.stringify(rojoContent, null, 2), "utf-8");
    logger.info("Created default.project.json for Rojo");
  }

  logger.info(
    `Created ${createdCount} folders, skipped ${skippedCount} existing folders`,
  );
}

/**
 * Creates a module/library project
 */
async function createModuleProject(
  projectName: string,
  projectRoot: string,
): Promise<void> {
  // Create rune.json configuration for module
  const config: RuneConfig = {
    name: projectName,
    syncPort: 34872,
    folders: {
      Source: "src",
      Tests: "tests",
    },
    ignore: ["**/*.spec.lua", "**/*.test.lua"],
  };

  const configPath = join(projectRoot, CONFIG_FILE_NAME);

  if (existsSync(configPath)) {
    logger.warn("rune.json already exists. Skipping configuration creation.");
  } else {
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    logger.success("Created rune.json");
  }

  // Create module folder structure
  let createdCount = 0;
  let skippedCount = 0;

  for (const [, folderPath] of Object.entries(MODULE_FOLDERS)) {
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

  // Create main module file
  const mainModulePath = join(projectRoot, "src", "init.module.lua");
  if (!existsSync(mainModulePath)) {
    const mainContent = `-- ${projectName}
-- A Roblox module created by Rune

local ${projectName} = {}

--[[
    Initialize the module
]]
function ${projectName}.init()
    print("${projectName} initialized!")
end

--[[
    Example function
    @param value - Input value
    @return Result
]]
function ${projectName}.process(value)
    return value * 2
end

return ${projectName}
`;
    writeFileSync(mainModulePath, mainContent, "utf-8");
    logger.info("Created main module: src/init.module.lua");
  }

  // Create test file
  const testPath = join(projectRoot, "tests", "main.test.lua");
  if (!existsSync(testPath)) {
    const testContent = `-- Tests for ${projectName}
-- Created by Rune

local ${projectName} = require("../src/init.module")

-- Test initialization
${projectName}.init()

-- Test process function
local result = ${projectName}.process(5)
assert(result == 10, "process(5) should return 10")

print("All tests passed!")
`;
    writeFileSync(testPath, testContent, "utf-8");
    logger.info("Created test file: tests/main.test.lua");
  }

  // Create README for the module
  const readmePath = join(projectRoot, "README.md");
  if (!existsSync(readmePath)) {
    const readmeContent = `# ${projectName}

A Roblox module created with Rune.

## Installation

\`\`\`bash
rune install ${projectName}
\`\`\`

## Usage

\`\`\`lua
local ${projectName} = require(path.to.${projectName})
${projectName}.init()
\`\`\`

## API

### \`${projectName}.init()\`
Initializes the module.

### \`${projectName}.process(value)\`
Processes a value and returns the result.

## Development

\`\`\`bash
# Run tests
rune test
\`\`\`
`;
    writeFileSync(readmePath, readmeContent, "utf-8");
    logger.info("Created README.md");
  }

  logger.info(
    `Created ${createdCount} folders, skipped ${skippedCount} existing folders`,
  );
}

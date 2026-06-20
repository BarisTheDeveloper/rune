/**
 * Rune - Build Command
 * Builds a Roblox place file from project files
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { configManager, ConfigManager } from "../config/index.js";
import {
  detectScriptType,
  isScriptFile,
  isModelFile,
} from "../utils/script-detector.js";

/**
 * Collected instance interface
 */
interface CollectedInstance {
  className: string;
  name: string;
  children: CollectedInstance[];
  source?: string;
}

/**
 * Builds the project into a .rbxlx file
 * @param options - Build command options
 */
export async function buildCommand(options: BuildOptions): Promise<void> {
  logger.header("Rune - Build");

  try {
    // Load configuration
    const configPath = ConfigManager.findNearest();
    if (!configPath) {
      logger.error("No rune.json found. Run 'rune init' first.");
      process.exit(1);
    }

    const config = configManager.load(configPath);
    const projectRoot = configManager.getProjectRoot();

    logger.info(`Project: ${config.name}`);
    logger.info(`Config: ${configPath}`);

    // Determine output path
    const outputDir = options.output || join(projectRoot, "dist");
    const placeName = "Game.rbxlx";
    const outputPath = join(outputDir, placeName);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    logger.info(`Output: ${outputPath}`);
    logger.info("Building project...");

    // Collect all files and build instance tree
    const instances = await collectInstances(projectRoot, config.folders);

    // Generate RBXLX XML
    const rbxlxContent = generateRbxlxXml(instances, config.name);

    // Write output file
    writeFileSync(outputPath, rbxlxContent, "utf-8");

    logger.separator();
    logger.success("Build complete!");
    logger.info(`Output: ${outputPath}`);
    logger.info(`Instances: ${instances.length}`);
    logger.separator();

    // Handle upload if requested
    if (options.upload) {
      logger.warn("Upload feature is not yet implemented.");
      logger.info("Future support: rune build --upload");
    }
  } catch (error) {
    logger.error(`Build failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Collects all instances from the project folders
 */
async function collectInstances(
  projectRoot: string,
  folders: Record<string, string>,
): Promise<CollectedInstance[]> {
  const instances: CollectedInstance[] = [];

  for (const [serviceName, folderPath] of Object.entries(folders)) {
    const fullPath = join(projectRoot, folderPath);

    if (!existsSync(fullPath)) {
      continue;
    }

    // Create service folder instance
    const serviceInstance: CollectedInstance = {
      className: serviceName,
      name: serviceName,
      children: [],
    };

    await scanDirectory(fullPath, folderPath, serviceInstance.children);
    instances.push(serviceInstance);
  }

  return instances;
}

/**
 * Recursively scans a directory for instances
 */
async function scanDirectory(
  dirPath: string,
  relativeBase: string,
  children: CollectedInstance[],
): Promise<void> {
  const { readdirSync } = await import("node:fs");

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = join(relativeBase, entry.name);

      if (entry.isDirectory()) {
        const folderInstance: CollectedInstance = {
          className: "Folder",
          name: entry.name,
          children: [],
        };

        await scanDirectory(fullPath, relativePath, folderInstance.children);
        children.push(folderInstance);
      } else if (entry.isFile()) {
        const fileInstance = await createInstanceFromFile(fullPath, entry.name);
        if (fileInstance) {
          children.push(fileInstance);
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to scan directory: ${dirPath}`);
  }
}

/**
 * Creates an instance from a file
 */
async function createInstanceFromFile(
  filePath: string,
  fileName: string,
): Promise<CollectedInstance | null> {
  // Handle script files
  if (isScriptFile(fileName)) {
    const scriptInfo = detectScriptType(fileName);
    const instanceName = scriptInfo.baseName;

    try {
      const content = readFileSync(filePath, "utf-8");

      return {
        className: scriptInfo.className,
        name: instanceName,
        children: [],
        source: content,
      };
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`);
      return null;
    }
  }

  // Handle model files
  if (isModelFile(fileName)) {
    const modelName = fileName.replace(/\.(rbxm|rbxmx)$/, "");

    return {
      className: "Folder",
      name: modelName,
      children: [],
    };
  }

  return null;
}

/**
 * Generates RBXLX XML content
 */
function generateRbxlxXml(
  instances: CollectedInstance[],
  projectName: string,
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n';

  // Add project metadata
  xml += '  <Item class="Folder" referent="RBX0">\n';
  xml += "    <Properties>\n";
  xml += `    <string name="Name">${escapeXml(projectName)}</string>\n`;
  xml += "    </Properties>\n";

  // Add instances
  let referentIndex = 1;
  for (const instance of instances) {
    xml += generateInstanceXml(instance, `RBX${referentIndex++}`, "    ");
  }

  xml += "  </Item>\n";
  xml += "</roblox>\n";

  return xml;
}

/**
 * Generates XML for a single instance
 */
function generateInstanceXml(
  instance: CollectedInstance,
  referent: string,
  indent: string,
): string {
  let xml = `${indent}<Item class="${instance.className}" referent="${referent}">\n`;
  xml += `${indent}  <Properties>\n`;
  xml += `${indent}    <string name="Name">${escapeXml(instance.name)}</string>\n`;
  xml += `${indent}  </Properties>\n`;

  // Add source for scripts
  if (instance.source) {
    xml += `${indent}  <Content name="Source">\n`;
    xml += `${indent}    <ProtectedString><![CDATA[${instance.source}]]></ProtectedString>\n`;
    xml += `${indent}  </Content>\n`;
  }

  // Add children
  let childIndex = 0;
  for (const child of instance.children) {
    const childReferent = `${referent}_${childIndex++}`;
    xml += generateInstanceXml(child, childReferent, `${indent}  `);
  }

  xml += `${indent}</Item>\n`;

  return xml;
}

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string): string {
  const AMP = String.fromCharCode(38);
  const LT = String.fromCharCode(60);
  const GT = String.fromCharCode(62);
  const QUOT = String.fromCharCode(34);
  const APOS = String.fromCharCode(39);

  return unsafe
    .replace(new RegExp(AMP, "g"), `${AMP}amp;`)
    .replace(new RegExp(LT, "g"), `${AMP}lt;`)
    .replace(new RegExp(GT, "g"), `${AMP}gt;`)
    .replace(new RegExp(QUOT, "g"), `${AMP}quot;`)
    .replace(new RegExp(APOS, "g"), `${AMP}apos;`);
}

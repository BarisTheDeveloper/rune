/**
 * Rune - Build Command
 * Builds a Roblox place file (.rbxlx) from project files
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

interface CollectedInstance {
  className: string;
  name: string;
  children: CollectedInstance[];
  source?: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  logger.header("Rune - Build");

  try {
    const configPath = ConfigManager.findNearest();
    if (!configPath) {
      logger.error("No rune.json found. Run 'rune init' first.");
      process.exit(1);
    }

    const config = configManager.load(configPath);
    const projectRoot = configManager.getProjectRoot();

    logger.info(`Project: ${config.name}`);

    const outputDir = options.output || join(projectRoot, "dist");
    const outputPath = join(outputDir, "Game.rbxlx");

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    logger.info(`Output: ${outputPath}`);
    logger.info("Building project...");

    const instances = await collectInstances(projectRoot, config.folders);
    const content = generateRbxlx(instances, config.name);

    writeFileSync(outputPath, content, "utf-8");

    logger.separator();
    logger.success("Build complete!");
    logger.info(`Output: ${outputPath}`);
    logger.info(`Instances: ${countInstances(instances)}`);
    logger.separator();
  } catch (error) {
    logger.error(`Build failed: ${error}`);
    process.exit(1);
  }
}

async function collectInstances(
  projectRoot: string,
  folders: Record<string, string>,
): Promise<CollectedInstance[]> {
  const instances: CollectedInstance[] = [];

  for (const [serviceName, folderPath] of Object.entries(folders)) {
    const fullPath = join(projectRoot, folderPath);
    if (!existsSync(fullPath)) continue;

    const service: CollectedInstance = {
      className: "Folder",
      name: serviceName,
      children: [],
    };

    await scanDir(fullPath, folderPath, service.children);
    instances.push(service);
  }

  return instances;
}

async function scanDir(
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
        const folder: CollectedInstance = {
          className: "Folder",
          name: entry.name,
          children: [],
        };
        await scanDir(fullPath, relativePath, folder.children);
        children.push(folder);
      } else if (entry.isFile()) {
        const inst = await fileToInstance(fullPath, entry.name);
        if (inst) children.push(inst);
      }
    }
  } catch (error) {
    logger.error(`Failed to scan: ${dirPath}`);
  }
}

async function fileToInstance(
  filePath: string,
  fileName: string,
): Promise<CollectedInstance | null> {
  if (isScriptFile(fileName)) {
    const info = detectScriptType(fileName);
    try {
      const source = readFileSync(filePath, "utf-8");
      return { className: info.className, name: info.baseName, children: [], source };
    } catch {
      return null;
    }
  }

  if (isModelFile(fileName)) {
    return {
      className: "Folder",
      name: fileName.replace(/\.(rbxm|rbxmx)$/, ""),
      children: [],
    };
  }

  return null;
}

function generateRbxlx(
  instances: CollectedInstance[],
  projectName: string,
): string {
  let ref = 0;
  const nextRef = () => `RBX${ref++}`;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime"';
  xml += ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
  xml += ' xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd"';
  xml += ' version="4">\n';
  xml += '  <Item class="Folder" referent="RBX0">\n';
  xml += '    <Properties>\n';
  xml += `      <string name="Name">${escapeXml(projectName)}</string>\n`;
  xml += '    </Properties>\n';

  for (const inst of instances) {
    xml += renderInstance(inst, nextRef(), 2);
  }

  xml += '  </Item>\n';
  xml += '</roblox>\n';
  return xml;
}

function renderInstance(
  inst: CollectedInstance,
  referent: string,
  depth: number,
): string {
  const pad = "  ".repeat(depth);
  let xml = `${pad}<Item class="${inst.className}" referent="${referent}">\n`;
  xml += `${pad}  <Properties>\n`;
  xml += `${pad}    <string name="Name">${escapeXml(inst.name)}</string>\n`;
  xml += `${pad}  </Properties>\n`;

  if (inst.source) {
    xml += `${pad}  <Content name="Source">\n`;
    xml += `${pad}    <ProtectedString><![CDATA[${inst.source}]]></ProtectedString>\n`;
    xml += `${pad}  </Content>\n`;
  }

  for (let i = 0; i < inst.children.length; i++) {
    xml += renderInstance(inst.children[i]!, `${referent}_${i}`, depth + 1);
  }

  xml += `${pad}</Item>\n`;
  return xml;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function countInstances(instances: CollectedInstance[]): number {
  let count = instances.length;
  for (const inst of instances) {
    count += countInstances(inst.children);
  }
  return count;
}

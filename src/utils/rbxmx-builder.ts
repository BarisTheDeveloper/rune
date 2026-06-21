/**
 * Rune - RBXMX Builder
 * Builds .rbxmx (XML) model files from Lua source files
 * Used for plugin building without Rojo dependency
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, basename, extname } from "node:path";
import { logger } from "./logger.js";

/**
 * Instance node for RBXMX tree
 */
interface RbxmxNode {
  className: string;
  name: string;
  source?: string;
  children: RbxmxNode[];
}

let referentCounter = 0;

function generateReferent(): string {
  referentCounter++;
  return `RBX${referentCounter.toString().padStart(8, "0")}`;
}

/**
 * Detects Roblox class from file extension and name
 */
function detectClassFromFile(filePath: string): string {
  const ext = extname(filePath);
  const name = basename(filePath, ext);

  if (ext === ".server.lua") return "Script";
  if (ext === ".client.lua") return "LocalScript";
  if (ext === ".module.lua" || ext === ".lua") return "ModuleScript";

  return "Folder";
}

/**
 * Cleans name from file extension
 */
function cleanName(filePath: string): string {
  const name = basename(filePath);
  return name
    .replace(/\.server\.lua$/, "")
    .replace(/\.client\.lua$/, "")
    .replace(/\.module\.lua$/, "")
    .replace(/\.lua$/, "");
}

/**
 * Recursively scans directory and builds instance tree
 */
function scanDirectory(dirPath: string): RbxmxNode[] {
  const nodes: RbxmxNode[] = [];

  if (!existsSync(dirPath)) return nodes;

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry.startsWith(".")) continue;

      const children = scanDirectory(fullPath);
      nodes.push({
        className: "Folder",
        name: entry,
        children,
      });
    } else if (entry.endsWith(".lua")) {
      const source = readFileSync(fullPath, "utf-8");
      nodes.push({
        className: detectClassFromFile(fullPath),
        name: cleanName(fullPath),
        source,
        children: [],
      });
    }
  }

  return nodes;
}

/**
 * Generates RBXMX XML from node tree
 */
function generateRbxmxXml(
  nodes: RbxmxNode[],
  rootName: string = "Root",
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<roblox version="4">');

  const rootRef = generateReferent();
  lines.push(`  <Item class="Folder" referent="${rootRef}">`);
  lines.push(`    <Properties>`);
  lines.push(`      <string name="Name">${rootName}</string>`);
  lines.push(`    </Properties>`);

  for (const node of nodes) {
    lines.push(...generateNodeXml(node, 2));
  }

  lines.push("  </Item>");
  lines.push("</roblox>");

  return lines.join("\n");
}

/**
 * Generates XML for a single node
 */
function generateNodeXml(node: RbxmxNode, indent: number): string[] {
  const lines: string[] = [];
  const spaces = "  ".repeat(indent);
  const ref = generateReferent();

  lines.push(`${spaces}<Item class="${node.className}" referent="${ref}">`);
  lines.push(`${spaces}  <Properties>`);
  lines.push(`${spaces}    <string name="Name">${node.name}</string>`);

  if (node.source !== undefined) {
    lines.push(
      `${spaces}    <ProtectedString name="Source"><![CDATA[${node.source}]]></ProtectedString>`,
    );
  }

  lines.push(`${spaces}  </Properties>`);

  for (const child of node.children) {
    lines.push(...generateNodeXml(child, indent + 1));
  }

  lines.push(`${spaces}</Item>`);

  return lines;
}

/**
 * Builds a .rbxmx plugin file from source directory
 */
export function buildRbxmx(
  sourceDir: string,
  outputPath: string,
  rootName: string = "RunePlugin",
): string {
  logger.info(`Building RBXMX from: ${sourceDir}`);

  referentCounter = 0;
  const nodes = scanDirectory(sourceDir);
  const xml = generateRbxmxXml(nodes, rootName);

  const rbxmxPath = outputPath.replace(/\.rbxm$/, ".rbxmx");
  writeFileSync(rbxmxPath, xml, "utf-8");

  logger.success(`Plugin built: ${rbxmxPath}`);
  return rbxmxPath;
}

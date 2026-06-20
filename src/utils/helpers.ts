/**
 * Rune - Utility Helpers
 * General purpose helper functions
 */

import * as path from "path";
import * as fs from "fs";

/**
 * Convert a file path to a Roblox-compatible instance name
 */
export function pathToInstanceName(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  return basename;
}

/**
 * Check if a file is an instance definition file
 */
export function isInstanceDefinitionFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".instance.json");
}

/**
 * Parse an instance definition file
 */
export function parseInstanceDefinition(
  content: string,
): import("../types/index.js").InstanceDefinition | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.ClassName && parsed.Name) {
      return parsed as import("../types/index.js").InstanceDefinition;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ensure a directory exists, create it if it doesn't
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read a file safely, return null if it doesn't exist
 */
export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Write a file safely, create directories if needed
 */
export function writeFileSafe(filePath: string, content: string): boolean {
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file or directory safely
 */
export function deletePathSafe(targetPath: string): boolean {
  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Convert a relative path to an absolute path
 */
export function toAbsolutePath(relativePath: string, baseDir: string): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(baseDir, relativePath);
}

/**
 * Generate a unique ID for tracking instances
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get the service name from a folder path
 */
export function folderPathToServiceName(folderPath: string): string {
  const parts = folderPath.split(path.sep);
  const lastPart = parts[parts.length - 1] ?? "";
  // Convert kebab-case or snake_case to PascalCase for service name
  return lastPart
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s/g, "");
}

/**
 * Check if a file is a Lua file
 */
export function isLuaFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".lua");
}

/**
 * Get the relative path from a base directory
 */
export function getRelativePath(fullPath: string, baseDir: string): string {
  return path.relative(baseDir, fullPath);
}

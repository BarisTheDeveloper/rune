/**
 * Rune - Settings
 * Core settings and configuration constants
 */

import { readFileSync, existsSync } from "node:fs";

export const CoreFiles = {
  VersionFile: "./rune.version",
  RuneConfigJSON: "rune.config.json",
};

/**
 * Safely reads the installed version from the version file
 */
export function getInstalledVersion(): string[] {
  try {
    if (existsSync(CoreFiles.VersionFile)) {
      return readFileSync(CoreFiles.VersionFile).toString().split(":");
    }
  } catch {
    // Version file not found or unreadable
  }
  return ["0.1", "BETA"];
}

/**
 * Lazy-loaded configuration object
 */
export function getConfig() {
  return {
    RuneVersion: getInstalledVersion(),
  };
}

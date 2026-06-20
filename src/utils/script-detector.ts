/**
 * Rune - Script Type Detector
 * Automatically determines Roblox script types from file names
 */

import * as path from "path";

export type ScriptType = "ModuleScript" | "Script" | "LocalScript" | "Unknown";

export interface ScriptDetection {
  fileName: string;
  scriptType: ScriptType;
  isTypeScript: boolean;
  className: string;
  baseName: string;
}

/**
 * Detect script type from filename
 */
export function detectScriptType(fileName: string): ScriptDetection {
  const ext = path.extname(fileName).toLowerCase();
  const nameWithoutExt = fileName.slice(0, -ext.length);
  const isTypeScript = ext === ".ts";

  // Check for module pattern: *.module.lua or *.module.ts
  if (nameWithoutExt.endsWith(".module")) {
    return {
      fileName,
      scriptType: "ModuleScript",
      isTypeScript,
      className: "ModuleScript",
      baseName: nameWithoutExt.slice(0, -7),
    };
  }

  // Check for server pattern: *.server.lua or *.server.ts
  if (nameWithoutExt.endsWith(".server")) {
    return {
      fileName,
      scriptType: "Script",
      isTypeScript,
      className: "Script",
      baseName: nameWithoutExt.slice(0, -7),
    };
  }

  // Check for client pattern: *.client.lua or *.client.ts
  if (nameWithoutExt.endsWith(".client")) {
    return {
      fileName,
      scriptType: "LocalScript",
      isTypeScript,
      className: "LocalScript",
      baseName: nameWithoutExt.slice(0, -7),
    };
  }

  // Default: if it's a .lua file without pattern, treat as regular Script
  if (ext === ".lua") {
    return {
      fileName,
      scriptType: "Script",
      isTypeScript: false,
      className: "Script",
      baseName: nameWithoutExt,
    };
  }

  // TypeScript files without explicit pattern
  if (ext === ".ts") {
    return {
      fileName,
      scriptType: "Script",
      isTypeScript: true,
      className: "Script",
      baseName: nameWithoutExt,
    };
  }

  return {
    fileName,
    scriptType: "Unknown",
    isTypeScript: false,
    className: "Unknown",
    baseName: nameWithoutExt,
  };
}

/**
 * Get the appropriate file extension for a script type
 */
export function getScriptExtension(
  scriptType: ScriptType,
  useTypeScript: boolean = false,
): string {
  const baseExt = useTypeScript ? ".ts" : ".lua";

  switch (scriptType) {
    case "ModuleScript":
      return `.module${baseExt}`;
    case "Script":
      return `.server${baseExt}`;
    case "LocalScript":
      return `.client${baseExt}`;
    default:
      return baseExt;
  }
}

/**
 * Check if a file is a script file
 */
export function isScriptFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (ext !== ".lua" && ext !== ".ts") {
    return false;
  }

  const nameWithoutExt = fileName.slice(0, -ext.length);
  return (
    nameWithoutExt.endsWith(".module") ||
    nameWithoutExt.endsWith(".server") ||
    nameWithoutExt.endsWith(".client") ||
    ext === ".lua"
  );
}

/**
 * Get the logical name of a script (without type suffix)
 */
export function getScriptLogicalName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const nameWithoutExt = fileName.slice(0, -ext.length);

  // Remove type suffix
  if (nameWithoutExt.endsWith(".module")) {
    return nameWithoutExt.slice(0, -7);
  }
  if (nameWithoutExt.endsWith(".server")) {
    return nameWithoutExt.slice(0, -7);
  }
  if (nameWithoutExt.endsWith(".client")) {
    return nameWithoutExt.slice(0, -7);
  }

  return nameWithoutExt;
}

/**
 * Check if a file is a model file (.rbxm or .rbxmx)
 */
export function isModelFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ext === ".rbxm" || ext === ".rbxmx";
}

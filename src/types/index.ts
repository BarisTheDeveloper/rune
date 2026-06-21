/**
 * Rune - Type Definitions
 */

// Roblox class names supported by Rune
export type RobloxClassName =
  | "Folder"
  | "Script"
  | "LocalScript"
  | "ModuleScript"
  | "Model"
  | "Part"
  | "MeshPart"
  | "UnionOperation"
  | "Decal"
  | "Texture"
  | "Sound"
  | "Animation"
  | "ScreenGui"
  | "Frame"
  | "TextLabel"
  | "TextButton"
  | "ImageLabel"
  | "ImageButton"
  | "IntValue"
  | "StringValue"
  | "BoolValue"
  | "NumberValue"
  | "Color3Value"
  | "Vector3Value"
  | "Configuration"
  | "Workspace"
  | "Players"
  | "Lighting"
  | "MaterialService"
  | "ReplicatedFirst"
  | "ReplicatedStorage"
  | "ServerScriptService"
  | "ServerStorage"
  | "StarterGui"
  | "StarterPack"
  | "StarterPlayer"
  | "SoundService"
  | "Teams"
  | "TextChatService"
  | "Chat"
  | "LocalizationService";

// Roblox property definition
export interface RobloxProperty {
  name: string;
  type: string;
  value: unknown;
}

// Roblox instance data
export interface RobloxInstance {
  id: string;
  className: RobloxClassName;
  name: string;
  parentId: string | null;
  properties: Record<string, RobloxProperty>;
  children: string[];
  source?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

// Rune configuration
export interface RuneConfig {
  name: string;
  syncPort: number;
  folders: Record<string, string>;
  sourceDir?: string;
  outputDir?: string;
  ignore?: string[];
}

// CLI Options
export interface InitOptions {
  name?: string;
  path?: string;
  type?: "game" | "plugin" | "module";
}

export interface WatchOptions {
  port?: number;
  config?: string;
}

export interface SyncOptions {
  port?: number;
  config?: string;
}

export interface BuildOptions {
  output?: string;
  config?: string;
  upload?: boolean;
}

export interface InstallOptions {
  global?: boolean;
  save?: boolean;
  dev?: boolean;
}

// Package definition for rune install
export interface RunePackage {
  name: string;
  version: string;
  description?: string;
  author?: string;
  source: string;
  type: "module" | "plugin" | "tool";
  dependencies?: string[];
  installPath?: string;
}

// Package registry entry
export interface PackageRegistry {
  packages: Record<string, RunePackage>;
  lastUpdated: string;
}

// Instance definition file format
export interface InstanceDefinition {
  ClassName: string;
  Name: string;
  Properties?: Record<string, unknown>;
  Attributes?: Record<string, unknown>;
  Tags?: string[];
}

// WebSocket message types
export interface WSMessage {
  type: string;
  id?: string;
  data?: unknown;
  payload?: unknown;
  error?: string;
  timestamp?: number;
  requestId?: string;
}

// File change event
export interface FileChangeEvent {
  type: "created" | "changed" | "deleted" | "renamed";
  path: string;
  newPath?: string;
}

// Sync operation result
export interface SyncResult {
  success: boolean;
  instancesSynced: number;
  errors: string[];
}

// Build result
export interface BuildResult {
  success: boolean;
  outputPath?: string;
  instanceCount: number;
  errors: string[];
}

// Logger levels
export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

// Script types detected from filenames
export type ScriptType = "Script" | "LocalScript" | "ModuleScript" | "Unknown";

/**
 * Rune - File System Watcher
 * Watches project files for changes and triggers sync events
 */

import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, basename, extname } from "node:path";
import type { InstanceDefinition, RobloxClassName } from "../types/index.js";
import type { ScriptType } from "../utils/script-detector.js";
import { logger } from "../utils/logger.js";
import {
  detectScriptType,
  isScriptFile,
  isModelFile,
} from "../utils/script-detector.js";
import { isInstanceDefinitionFile } from "../utils/helpers.js";
import { generateFileId } from "../utils/id-generator.js";
import { RobloxInstanceModel } from "../models/roblox-instance.js";
import { InstanceTree } from "../models/instance-tree.js";
import { configManager } from "../config/config-manager.js";

/**
 * File change event types
 */
export type FileChangeType =
  | "add"
  | "change"
  | "unlink"
  | "unlinkDir"
  | "addDir";

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  relativePath: string;
  serviceName?: string | undefined;
}

/**
 * FileWatcher - watches project files for changes
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private instanceTree: InstanceTree;
  private projectRoot: string;
  private isWatching: boolean = false;

  // Event callbacks
  private onFileChange?: (event: FileChangeEvent) => void;
  private onInstanceCreate?: (instance: RobloxInstanceModel) => void;
  private onInstanceUpdate?: (instance: RobloxInstanceModel) => void;
  private onInstanceDelete?: (instanceId: string) => void;

  // Track file-to-instance mappings
  private fileToInstanceMap: Map<string, string> = new Map();
  private instanceToFileMap: Map<string, string> = new Map();

  constructor(projectRoot: string, instanceTree: InstanceTree) {
    this.projectRoot = projectRoot;
    this.instanceTree = instanceTree;
  }

  /**
   * Sets the callback for file changes
   */
  public setOnFileChange(callback: (event: FileChangeEvent) => void): void {
    this.onFileChange = callback;
  }

  /**
   * Sets the callback for instance creation
   */
  public setOnInstanceCreate(
    callback: (instance: RobloxInstanceModel) => void,
  ): void {
    this.onInstanceCreate = callback;
  }

  /**
   * Sets the callback for instance update
   */
  public setOnInstanceUpdate(
    callback: (instance: RobloxInstanceModel) => void,
  ): void {
    this.onInstanceUpdate = callback;
  }

  /**
   * Sets the callback for instance deletion
   */
  public setOnInstanceDelete(callback: (instanceId: string) => void): void {
    this.onInstanceDelete = callback;
  }

  /**
   * Starts watching project files
   */
  public async start(): Promise<void> {
    if (this.isWatching) {
      logger.warn("File watcher is already running");
      return;
    }

    const config = configManager.getConfig();
    const folders = Object.values(config.folders);

    // Build watch paths
    const watchPaths = folders
      .map((folder) => join(this.projectRoot, folder))
      .filter((path) => existsSync(path));

    if (watchPaths.length === 0) {
      logger.warn(
        "No valid folders to watch. Run 'rune init' to set up your project.",
      );
      return;
    }

    logger.info(`Watching ${watchPaths.length} folders...`);

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/rune.json",
        ...((config.ignore || []) as string[]),
      ],
    });

    this.watcher
      .on("add", (path: string) => this.handleFileEvent("add", path))
      .on("change", (path: string) => this.handleFileEvent("change", path))
      .on("unlink", (path: string) => this.handleFileEvent("unlink", path))
      .on("addDir", (path: string) => this.handleFileEvent("addDir", path))
      .on("unlinkDir", (path: string) =>
        this.handleFileEvent("unlinkDir", path),
      )
      .on("ready", () => {
        logger.success("File watcher ready");
        this.isWatching = true;
      })
      .on("error", (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`File watcher error: ${message}`);
      });
  }

  /**
   * Stops watching files
   */
  public async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      logger.info("File watcher stopped");
    }
  }

  /**
   * Handles a file system event
   */
  private async handleFileEvent(
    type: FileChangeType,
    filePath: string,
  ): Promise<void> {
    const relativePath = relative(this.projectRoot, filePath);
    const serviceName = this.getServiceNameForPath(relativePath);

    logger.debug(`File ${type}: ${relativePath}`);

    const event: FileChangeEvent = {
      type,
      path: filePath,
      relativePath,
      serviceName,
    };

    if (this.onFileChange) {
      this.onFileChange(event);
    }

    // Process the file based on type
    switch (type) {
      case "add":
      case "change":
        await this.handleFileAddOrUpdate(filePath, relativePath, type);
        break;
      case "unlink":
        this.handleFileDelete(filePath, relativePath);
        break;
      case "addDir":
        this.handleDirectoryAdd(relativePath);
        break;
      case "unlinkDir":
        this.handleDirectoryDelete(relativePath);
        break;
    }
  }

  /**
   * Handles file add or update
   */
  private async handleFileAddOrUpdate(
    filePath: string,
    relativePath: string,
    eventType: "add" | "change",
  ): Promise<void> {
    const fileName = basename(filePath);

    // Handle script files
    if (isScriptFile(fileName)) {
      await this.handleScriptFile(filePath, relativePath, fileName, eventType);
      return;
    }

    // Handle model files
    if (isModelFile(fileName)) {
      await this.handleModelFile(filePath, relativePath, fileName, eventType);
      return;
    }

    // Handle instance definition files
    if (isInstanceDefinitionFile(fileName)) {
      await this.handleInstanceDefinitionFile(
        filePath,
        relativePath,
        fileName,
        eventType,
      );
      return;
    }

    // Handle regular files as folders or generic instances
    logger.debug(`Unhandled file type: ${fileName}`);
  }

  /**
   * Handles a script file
   */
  private async handleScriptFile(
    filePath: string,
    relativePath: string,
    fileName: string,
    eventType: "add" | "change",
  ): Promise<void> {
    const scriptInfo = detectScriptType(fileName);
    const instanceName = scriptInfo.baseName;
    const fileId = generateFileId(relativePath);

    // Read file content
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`);
      return;
    }

    // Find or create parent folder instance
    const parentPath = dirname(relativePath);
    const parentId = this.getOrCreateFolderInstance(parentPath);

    // Check if instance already exists
    const existingInstance = this.instanceTree.findInstance(
      instanceName,
      parentId,
    );

    if (existingInstance) {
      // Update existing instance
      existingInstance.setSource(content);

      logger.info(`Script updated: ${instanceName} (${scriptInfo.scriptType})`);

      if (this.onInstanceUpdate) {
        this.onInstanceUpdate(existingInstance);
      }
    } else {
      // Create new instance
      const instance = new RobloxInstanceModel(
        scriptInfo.className as RobloxClassName,
        instanceName,
        parentId,
        fileId,
      );
      instance.setSource(content);

      this.instanceTree.addInstance(instance);
      this.fileToInstanceMap.set(relativePath, instance.id);
      this.instanceToFileMap.set(instance.id, relativePath);

      logger.info(`Script created: ${instanceName} (${scriptInfo.scriptType})`);

      if (this.onInstanceCreate) {
        this.onInstanceCreate(instance);
      }
    }
  }

  /**
   * Handles a model file (.rbxm or .rbxmx)
   */
  private async handleModelFile(
    filePath: string,
    relativePath: string,
    fileName: string,
    eventType: "add" | "change",
  ): Promise<void> {
    const modelName = fileName.replace(/\.(rbxm|rbxmx)$/, "");
    const fileId = generateFileId(relativePath);

    // Find or create parent folder instance
    const parentPath = dirname(relativePath);
    const parentId = this.getOrCreateFolderInstance(parentPath);

    // Check if model instance already exists
    const existingInstance = this.instanceTree.findInstance(
      modelName,
      parentId,
    );

    if (existingInstance) {
      logger.info(`Model updated: ${modelName}`);

      if (this.onInstanceUpdate) {
        this.onInstanceUpdate(existingInstance);
      }
    } else {
      // Create model folder instance
      const instance = new RobloxInstanceModel(
        "Folder",
        modelName,
        parentId,
        fileId,
      );

      this.instanceTree.addInstance(instance);
      this.fileToInstanceMap.set(relativePath, instance.id);
      this.instanceToFileMap.set(instance.id, relativePath);

      logger.info(`Model created: ${modelName}`);

      if (this.onInstanceCreate) {
        this.onInstanceCreate(instance);
      }
    }
  }

  /**
   * Handles an instance definition file
   */
  private async handleInstanceDefinitionFile(
    filePath: string,
    relativePath: string,
    fileName: string,
    eventType: "add" | "change",
  ): Promise<void> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const definition = JSON.parse(content) as InstanceDefinition;

      const fileId = generateFileId(relativePath);
      const parentPath = dirname(relativePath);
      const parentId = this.getOrCreateFolderInstance(parentPath);

      const instance = new RobloxInstanceModel(
        definition.ClassName as RobloxClassName,
        definition.Name,
        parentId,
        fileId,
      );

      // Apply properties
      if (definition.Properties) {
        for (const [key, value] of Object.entries(definition.Properties)) {
          instance.setProperty(
            key,
            typeof value === "string" ? "string" : typeof value,
            value,
          );
        }
      }

      // Apply attributes
      if (definition.Attributes) {
        for (const [key, value] of Object.entries(definition.Attributes)) {
          instance.setAttribute(key, value);
        }
      }

      // Apply tags
      if (definition.Tags) {
        for (const tag of definition.Tags) {
          instance.addTag(tag);
        }
      }

      this.instanceTree.addInstance(instance);
      this.fileToInstanceMap.set(relativePath, instance.id);
      this.instanceToFileMap.set(instance.id, relativePath);

      logger.info(
        `Instance definition created: ${definition.Name} (${definition.ClassName})`,
      );

      if (this.onInstanceCreate) {
        this.onInstanceCreate(instance);
      }
    } catch (error) {
      logger.error(`Failed to parse instance definition: ${filePath}`);
    }
  }

  /**
   * Handles file deletion
   */
  private handleFileDelete(filePath: string, relativePath: string): void {
    const instanceId = this.fileToInstanceMap.get(relativePath);

    if (instanceId) {
      this.instanceTree.removeInstance(instanceId);
      this.fileToInstanceMap.delete(relativePath);
      this.instanceToFileMap.delete(instanceId);

      logger.info(`Instance deleted: ${relativePath}`);

      if (this.onInstanceDelete) {
        this.onInstanceDelete(instanceId);
      }
    }
  }

  /**
   * Handles directory addition
   */
  private handleDirectoryAdd(relativePath: string): void {
    const parentId = this.getOrCreateFolderInstance(relativePath);
    logger.debug(`Directory created: ${relativePath}`);
  }

  /**
   * Handles directory deletion
   */
  private handleDirectoryDelete(relativePath: string): void {
    const instanceId = this.fileToInstanceMap.get(relativePath);

    if (instanceId) {
      this.instanceTree.removeInstance(instanceId, true);
      this.fileToInstanceMap.delete(relativePath);
      this.instanceToFileMap.delete(instanceId);

      logger.info(`Directory deleted: ${relativePath}`);
    }
  }

  /**
   * Creates a new folder instance
   */
  private createFolderInstance(
    name: string,
    parentId: string | null,
    path: string,
  ): RobloxInstanceModel {
    return new RobloxInstanceModel(
      "Folder",
      name,
      parentId,
      generateFileId(path),
    );
  }

  /**
   * Gets or creates a folder instance for a path
   */
  private getOrCreateFolderInstance(folderPath: string): string | null {
    if (folderPath === "." || folderPath === "") {
      return null;
    }

    // Normalize Windows backslashes to forward slashes
    const normalized = folderPath.replace(/\\/g, "/");

    // Split into parts, skip first component if it's "src" (source root)
    const parts = normalized.split("/").filter((p) => p && p !== "src");

    // Build hierarchy: each folder becomes child of the previous
    let currentParentId: string | null = null;

    for (const part of parts) {
      // Build the path for this specific folder level
      const partPath = currentParentId ? `${normalized}::${part}` : normalized;
      
      // Check if folder already exists under this parent
      const existing = this.instanceTree.findInstance(part, currentParentId);
      if (existing) {
        currentParentId = existing.id;
        continue;
      }

      const newInst = this.createFolderInstance(part, currentParentId, partPath);
      this.instanceTree.addInstance(newInst);
      this.fileToInstanceMap.set(partPath, newInst.id);
      currentParentId = newInst.id;
    }

    return currentParentId;
  }

  /**
   * Gets the Roblox service name for a file path
   */
  private getServiceNameForPath(relativePath: string): string | undefined {
    const config = configManager.getConfig();

    for (const [serviceName, folderPath] of Object.entries(config.folders)) {
      if (relativePath.startsWith(folderPath)) {
        return serviceName;
      }
    }

    return undefined;
  }

  /**
   * Gets the instance tree
   */
  public getInstanceTree(): InstanceTree {
    return this.instanceTree;
  }

  /**
   * Checks if the watcher is running
   */
  public getIsWatching(): boolean {
    return this.isWatching;
  }

  /**
   * Scans all project files and builds the initial instance tree
   */
  public async scanProject(): Promise<void> {
    const config = configManager.getConfig();
    const folders = config.folders;

    logger.info("Scanning project files...");

    for (const [serviceName, folderPath] of Object.entries(folders)) {
      const fullPath = join(this.projectRoot, folderPath);

      if (!existsSync(fullPath)) {
        continue;
      }

      await this.scanDirectory(fullPath, folderPath);
    }

    logger.success(
      `Project scan complete. ${this.instanceTree.size()} instances found.`,
    );
  }

  /**
   * Recursively scans a directory
   */
  private async scanDirectory(
    dirPath: string,
    relativeBase: string,
  ): Promise<void> {
    const { readdirSync } = await import("node:fs");

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relativePath = join(relativeBase, entry.name);

        if (entry.isDirectory()) {
          this.getOrCreateFolderInstance(relativePath);
          await this.scanDirectory(fullPath, relativePath);
        } else if (entry.isFile()) {
          await this.handleFileAddOrUpdate(fullPath, relativePath, "add");
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory: ${dirPath}`);
    }
  }

  /**
   * Writes script source back to file (bidirectional sync from Studio)
   */
  public writeScriptSource(instanceId: string, source: string): boolean {
    const relativePath = this.instanceToFileMap.get(instanceId);
    if (!relativePath) {
      logger.warn(`No file mapping for instance: ${instanceId}`);
      return false;
    }

    const fullPath = join(this.projectRoot, relativePath);
    try {
      // Temporarily unwatch to avoid re-triggering
      if (this.watcher) {
        this.watcher.unwatch(fullPath);
      }

      writeFileSync(fullPath, source, "utf-8");
      logger.success(`Studio → File: ${relativePath}`);

      // Re-watch after a short delay
      if (this.watcher) {
        setTimeout(() => {
          this.watcher?.add(fullPath);
        }, 500);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to write file: ${fullPath}`);
      return false;
    }
  }

  /**
   * Gets the file path for an instance ID
   */
  public getFilePathForInstance(instanceId: string): string | undefined {
    return this.instanceToFileMap.get(instanceId);
  }

  /**
   * Creates a file on disk for a Studio-created instance
   */
  public createFileForInstance(
    instance: import("../models/roblox-instance.js").RobloxInstanceModel,
    tree: import("../models/instance-tree.js").InstanceTree,
  ): string | null {
    // Find the service folder by walking up the parent chain
    const pathParts: string[] = [instance.name];
    let current = instance;
    while (current.parentId) {
      const parent = tree.getInstance(current.parentId);
      if (!parent) break;
      pathParts.unshift(parent.name);
      current = parent;
    }

    // Generate extension suffix
    let suffix = "";
    if (instance.className === "ModuleScript") suffix = ".module";
    else if (instance.className === "LocalScript") suffix = ".client";
    else if (instance.className === "Script") suffix = ".server";

    const fileName = `${instance.name}${suffix}.luau`;
    const relativePath = join("src", ...pathParts.slice(1), fileName);

    const fullPath = join(this.projectRoot, relativePath);

    try {
      if (this.watcher) this.watcher.unwatch(fullPath);
      writeFileSync(fullPath, instance.source || "", "utf-8");

      this.fileToInstanceMap.set(relativePath, instance.id);
      this.instanceToFileMap.set(instance.id, relativePath);

      if (this.watcher) {
        setTimeout(() => this.watcher?.add(fullPath), 500);
      }

      logger.success(`Studio → File: ${relativePath}`);
      return relativePath;
    } catch (error) {
      logger.error(`Failed to create file: ${fullPath}`);
      return null;
    }
  }

  /**
   * Deletes the file on disk for a Studio-deleted instance
   */
  public deleteFileForInstance(instanceId: string): void {
    const relativePath = this.instanceToFileMap.get(instanceId);
    if (!relativePath) {
      logger.warn(`No file mapping for deleted instance: ${instanceId}`);
      return;
    }

    const fullPath = join(this.projectRoot, relativePath);
    try {
      if (this.watcher) this.watcher.unwatch(fullPath);
      unlinkSync(fullPath);
      this.fileToInstanceMap.delete(relativePath);
      this.instanceToFileMap.delete(instanceId);
      logger.success(`Studio → Deleted: ${relativePath}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${fullPath}`);
    }
  }
}

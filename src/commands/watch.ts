/**
 * Rune - Watch Command
 * Starts file watching and synchronization with Roblox Studio
 */

import type { WatchOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { configManager, ConfigManager } from "../config/index.js";
import { FileWatcher } from "../filesystem/index.js";
import { SyncServer } from "../websocket/index.js";
import { InstanceTree } from "../models/index.js";

/**
 * Starts the file watcher and sync server
 * @param options - Watch command options
 */
export async function watchCommand(options: WatchOptions): Promise<void> {
  logger.header("Rune - Watch Mode");

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

    // Get port from options or config
    const port = options.port || config.syncPort || 34872;

    // Create instance tree
    const instanceTree = new InstanceTree();

    // Create file watcher
    const fileWatcher = new FileWatcher(projectRoot, instanceTree);

    // Create sync server
    const syncServer = new SyncServer(port, instanceTree);

    // Set up file watcher callbacks
    fileWatcher.setOnFileChange((event) => {
      logger.info(`File ${event.type}: ${event.relativePath}`);
    });

    fileWatcher.setOnInstanceCreate((instance) => {
      logger.success(
        `Instance created: ${instance.name} (${instance.className})`,
      );

      // Notify Studio about new instance
      if (syncServer.getIsRunning()) {
        syncServer.broadcast({
          type: "instance_created",
          data: instance.serialize(),
        });
      }
    });

    fileWatcher.setOnInstanceUpdate((instance) => {
      logger.info(`Instance updated: ${instance.name}`);

      // Notify Studio about updated instance
      if (syncServer.getIsRunning()) {
        syncServer.broadcast({
          type: "instance_updated",
          data: instance.serialize(),
        });
      }
    });

    fileWatcher.setOnInstanceDelete((instanceId) => {
      logger.info(`Instance deleted: ${instanceId}`);

      // Notify Studio about deleted instance
      if (syncServer.getIsRunning()) {
        syncServer.broadcast({
          type: "instance_deleted",
          data: { id: instanceId },
        });
      }
    });

    // Set up sync server callbacks for bidirectional sync
    syncServer.setOnClientConnect((clientId) => {
      logger.success(`Studio Connected: ${clientId}`);
    });

    syncServer.setOnClientDisconnect((clientId) => {
      logger.info(`Studio Disconnected: ${clientId}`);
    });

    syncServer.setOnInstanceCreate((instance) => {
      logger.info(`Studio created instance: ${instance.name}`);
      // In bidirectional sync, we would update the filesystem here
    });

    syncServer.setOnInstanceUpdate((instance) => {
      logger.info(`Studio updated instance: ${instance.name}`);
      // In bidirectional sync, we would update the filesystem here
    });

    syncServer.setOnInstanceDelete((instanceId) => {
      logger.info(`Studio deleted instance: ${instanceId}`);
      // In bidirectional sync, we would update the filesystem here
    });

    syncServer.setOnInstanceMove((instanceId, newParentId) => {
      logger.info(`Studio moved instance: ${instanceId}`);
      // In bidirectional sync, we would update the filesystem here
    });

    syncServer.setOnScriptUpdate((instanceId, source) => {
      const instance = instanceTree.getInstance(instanceId);
      if (instance) {
        logger.info(`Studio updated script: ${instance.name}`);
        // In bidirectional sync, we would update the file here
      }
    });

    syncServer.setOnPropertyUpdate((instanceId, propertyName, value) => {
      const instance = instanceTree.getInstance(instanceId);
      if (instance) {
        logger.info(
          `Studio updated property: ${propertyName} on ${instance.name}`,
        );
        // In bidirectional sync, we would update the instance definition file here
      }
    });

    // Scan existing project files
    logger.info("Scanning project files...");
    await fileWatcher.scanProject();

    // Start the sync server
    logger.info(`Starting sync server on port ${port}...`);
    await syncServer.start();

    // Start file watching
    logger.info("Starting file watcher...");
    await fileWatcher.start();

    logger.separator();
    logger.success("Rune is now watching for changes!");
    logger.info("Connect Roblox Studio with the Rune plugin to start syncing.");
    logger.separator();

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      await fileWatcher.stop();
      await syncServer.stop();
      logger.success("Rune stopped.");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(`Watch failed: ${error}`);
    process.exit(1);
  }
}

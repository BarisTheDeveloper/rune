/**
 * Rune - Sync Command
 * Starts synchronization server for Roblox Studio
 */

import type { SyncOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { configManager, ConfigManager } from "../config/index.js";
import { SyncServer } from "../websocket/index.js";
import { InstanceTree } from "../models/index.js";

/**
 * Starts the sync server
 * @param options - Sync command options
 */
export async function syncCommand(options: SyncOptions): Promise<void> {
  logger.header("Rune - Sync Server");

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

    // Create sync server
    const syncServer = new SyncServer(port, instanceTree);

    // Set up sync server callbacks
    syncServer.setOnClientConnect((clientId) => {
      logger.success(`Studio Connected: ${clientId}`);
    });

    syncServer.setOnClientDisconnect((clientId) => {
      logger.info(`Studio Disconnected: ${clientId}`);
    });

    syncServer.setOnInstanceCreate((instance) => {
      logger.success(
        `Instance created: ${instance.name} (${instance.className})`,
      );
    });

    syncServer.setOnInstanceUpdate((instance) => {
      logger.info(`Instance updated: ${instance.name}`);
    });

    syncServer.setOnInstanceDelete((instanceId) => {
      logger.info(`Instance deleted: ${instanceId}`);
    });

    syncServer.setOnInstanceMove((instanceId, newParentId) => {
      logger.info(`Instance moved: ${instanceId}`);
    });

    syncServer.setOnScriptUpdate((instanceId, source) => {
      const instance = instanceTree.getInstance(instanceId);
      if (instance) {
        logger.info(`Script updated: ${instance.name}`);
      }
    });

    syncServer.setOnPropertyUpdate((instanceId, propertyName, value) => {
      const instance = instanceTree.getInstance(instanceId);
      if (instance) {
        logger.info(`Property updated: ${propertyName} on ${instance.name}`);
      }
    });

    // Start the sync server
    logger.info(`Starting sync server on port ${port}...`);
    await syncServer.start();

    logger.separator();
    logger.success("Sync server is running!");
    logger.info(`Port: ${port}`);
    logger.info("Connect Roblox Studio with the Rune plugin to start syncing.");
    logger.separator();

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      await syncServer.stop();
      logger.success("Sync server stopped.");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(`Sync failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Rune - WebSocket Server
 * Handles bidirectional synchronization with Roblox Studio
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { WSMessage, RobloxClassName } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { generateRequestId, generateSessionId } from "../utils/id-generator.js";
import { InstanceTree } from "../models/instance-tree.js";
import { RobloxInstanceModel } from "../models/roblox-instance.js";

/**
 * WebSocket Server for Roblox Studio synchronization
 */
export class SyncServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private instanceTree: InstanceTree;
  private port: number;
  private isRunning: boolean = false;

  // Event callbacks
  private onClientConnect?: (clientId: string) => void;
  private onClientDisconnect?: (clientId: string) => void;
  private onInstanceCreate?: (instance: RobloxInstanceModel) => void;
  private onInstanceUpdate?: (instance: RobloxInstanceModel) => void;
  private onInstanceDelete?: (instanceId: string) => void;
  private onInstanceMove?: (
    instanceId: string,
    newParentId: string | null,
  ) => void;
  private onScriptUpdate?: (instanceId: string, source: string) => void;
  private onPropertyUpdate?: (
    instanceId: string,
    propertyName: string,
    value: unknown,
  ) => void;

  constructor(port: number, instanceTree: InstanceTree) {
    this.port = port;
    this.instanceTree = instanceTree;
  }

  /**
   * Sets the callback for client connection
   */
  public setOnClientConnect(callback: (clientId: string) => void): void {
    this.onClientConnect = callback;
  }

  /**
   * Sets the callback for client disconnection
   */
  public setOnClientDisconnect(callback: (clientId: string) => void): void {
    this.onClientDisconnect = callback;
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
   * Sets the callback for instance move
   */
  public setOnInstanceMove(
    callback: (instanceId: string, newParentId: string | null) => void,
  ): void {
    this.onInstanceMove = callback;
  }

  /**
   * Sets the callback for script update
   */
  public setOnScriptUpdate(
    callback: (instanceId: string, source: string) => void,
  ): void {
    this.onScriptUpdate = callback;
  }

  /**
   * Sets the callback for property update
   */
  public setOnPropertyUpdate(
    callback: (
      instanceId: string,
      propertyName: string,
      value: unknown,
    ) => void,
  ): void {
    this.onPropertyUpdate = callback;
  }

  /**
   * Starts the WebSocket server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on("listening", () => {
          logger.success(`Sync server started on port ${this.port}`);
          this.isRunning = true;
          resolve();
        });

        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
          this.handleConnection(ws, req);
        });

        this.wss.on("error", (error: Error) => {
          logger.error(`Sync server error: ${error.message}`);
          reject(error);
        });

        this.wss.on("close", () => {
          logger.info("Sync server stopped");
          this.isRunning = false;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the WebSocket server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        // Close all client connections
        for (const ws of this.clients.values()) {
          ws.close();
        }
        this.clients.clear();

        this.wss.close(() => {
          this.wss = null;
          this.isRunning = false;
          logger.info("Sync server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handles a new client connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = generateSessionId();
    this.clients.set(clientId, ws);

    logger.success(`Studio Connected: ${clientId}`);

    if (this.onClientConnect) {
      this.onClientConnect(clientId);
    }

    // Send initial sync response with current hierarchy
    this.sendHierarchy(clientId);

    ws.on("message", (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    ws.on("close", () => {
      this.clients.delete(clientId);
      logger.info(`Studio Disconnected: ${clientId}`);

      if (this.onClientDisconnect) {
        this.onClientDisconnect(clientId);
      }
    });

    ws.on("error", (error: Error) => {
      logger.error(`Client error (${clientId}): ${error.message}`);
    });

    // Handle ping/pong for connection health
    ws.on("pong", () => {
      // Connection is alive
    });
  }

  /**
   * Handles incoming WebSocket messages
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WSMessage;
      logger.debug(`Received message: ${message.type} from ${clientId}`);

      switch (message.type) {
        case "sync_request":
          this.handleSyncRequest(clientId, message);
          break;
        case "instance_create":
          this.handleInstanceCreate(clientId, message);
          break;
        case "instance_update":
          this.handleInstanceUpdate(clientId, message);
          break;
        case "instance_delete":
          this.handleInstanceDelete(clientId, message);
          break;
        case "instance_move":
          this.handleInstanceMove(clientId, message);
          break;
        case "property_update":
          this.handlePropertyUpdate(clientId, message);
          break;
        case "script_update":
          this.handleScriptUpdate(clientId, message);
          break;
        case "hierarchy_request":
          this.handleHierarchyRequest(clientId, message);
          break;
        case "ping":
          this.sendToClient(clientId, { type: "pong", payload: {} });
          break;
        default:
          logger.warn(`Unknown message type: ${message.type} from ${clientId}`);
      }
    } catch (error) {
      logger.error(`Failed to parse message from ${clientId}: ${error}`);
      this.sendToClient(clientId, {
        type: "error",
        payload: { message: "Invalid message format" },
      });
    }
  }

  /**
   * Handles sync request from Studio
   */
  private handleSyncRequest(clientId: string, message: WSMessage): void {
    const payload = message.payload as { projectId?: string; placeId?: string };
    logger.info(`Sync requested: ${payload?.projectId || "unknown"}`);

    const syncResponse: WSMessage = {
      type: "sync_response",
      payload: {
        success: true,
        message: "Sync established",
        instances: this.instanceTree
          .getAllInstances()
          .map((i) => i.serialize()),
      },
    };
    if (message.id) {
      syncResponse.id = message.id;
    }
    this.sendToClient(clientId, syncResponse);
  }

  /**
   * Handles instance creation from Studio
   */
  private handleInstanceCreate(clientId: string, message: WSMessage): void {
    const payload = message.payload as { instance: Record<string, unknown> };
    const instance = RobloxInstanceModel.deserialize(payload.instance);

    this.instanceTree.addInstance(instance);
    logger.info(`Instance created: ${instance.name} (${instance.className})`);

    if (this.onInstanceCreate) {
      this.onInstanceCreate(instance);
    }

    // Broadcast to other clients
    this.broadcast(
      {
        type: "instance_create",
        payload: { instance: instance.serialize() },
      },
      clientId,
    );
  }

  /**
   * Handles instance update from Studio
   */
  private handleInstanceUpdate(clientId: string, message: WSMessage): void {
    const payload = message.payload as {
      instanceId: string;
      changes: Record<string, unknown>;
    };

    const instance = this.instanceTree.getInstance(payload.instanceId);
    if (instance) {
      // Apply changes
      if (payload.changes.name) {
        instance.name = payload.changes.name as string;
      }
      if (payload.changes.className) {
        instance.className = payload.changes.className as RobloxClassName;
      }

      logger.info(`Instance updated: ${instance.name}`);

      if (this.onInstanceUpdate) {
        this.onInstanceUpdate(instance);
      }

      // Broadcast to other clients
      this.broadcast(
        {
          type: "instance_update",
          payload: { instanceId: instance.id, changes: payload.changes },
        },
        clientId,
      );
    }
  }

  /**
   * Handles instance deletion from Studio
   */
  private handleInstanceDelete(clientId: string, message: WSMessage): void {
    const payload = message.payload as { instanceId: string };

    this.instanceTree.removeInstance(payload.instanceId);
    logger.info(`Instance deleted: ${payload.instanceId}`);

    if (this.onInstanceDelete) {
      this.onInstanceDelete(payload.instanceId);
    }

    // Broadcast to other clients
    this.broadcast(
      {
        type: "instance_delete",
        payload: { instanceId: payload.instanceId },
      },
      clientId,
    );
  }

  /**
   * Handles instance move from Studio
   */
  private handleInstanceMove(clientId: string, message: WSMessage): void {
    const payload = message.payload as {
      instanceId: string;
      newParentId: string | null;
    };

    this.instanceTree.moveInstance(payload.instanceId, payload.newParentId);
    logger.info(`Instance moved: ${payload.instanceId}`);

    if (this.onInstanceMove) {
      this.onInstanceMove(payload.instanceId, payload.newParentId);
    }

    // Broadcast to other clients
    this.broadcast(
      {
        type: "instance_move",
        payload: {
          instanceId: payload.instanceId,
          newParentId: payload.newParentId,
        },
      },
      clientId,
    );
  }

  /**
   * Handles property update from Studio
   */
  private handlePropertyUpdate(clientId: string, message: WSMessage): void {
    const payload = message.payload as {
      instanceId: string;
      propertyName: string;
      value: unknown;
    };

    const instance = this.instanceTree.getInstance(payload.instanceId);
    if (instance) {
      instance.setProperty(
        payload.propertyName,
        typeof payload.value === "string" ? "string" : typeof payload.value,
        payload.value,
      );

      logger.info(
        `Property updated: ${payload.propertyName} on ${instance.name}`,
      );

      if (this.onPropertyUpdate) {
        this.onPropertyUpdate(
          payload.instanceId,
          payload.propertyName,
          payload.value,
        );
      }

      // Broadcast to other clients
      this.broadcast(
        {
          type: "property_update",
          payload: {
            instanceId: payload.instanceId,
            propertyName: payload.propertyName,
            value: payload.value,
          },
        },
        clientId,
      );
    }
  }

  /**
   * Handles script update from Studio
   */
  private handleScriptUpdate(clientId: string, message: WSMessage): void {
    const payload = message.payload as { instanceId: string; source: string };

    const instance = this.instanceTree.getInstance(payload.instanceId);
    if (instance) {
      instance.setSource(payload.source);

      logger.info(`Script updated: ${instance.name}`);

      if (this.onScriptUpdate) {
        this.onScriptUpdate(payload.instanceId, payload.source);
      }

      // Broadcast to other clients
      this.broadcast(
        {
          type: "script_update",
          payload: { instanceId: payload.instanceId, source: payload.source },
        },
        clientId,
      );
    }
  }

  /**
   * Handles hierarchy request from Studio
   */
  private handleHierarchyRequest(clientId: string, message: WSMessage): void {
    this.sendHierarchy(clientId, message.id);
  }

  /**
   * Sends the current hierarchy to a client
   */
  private sendHierarchy(clientId: string, requestId?: string): void {
    const instances = this.instanceTree
      .getAllInstances()
      .map((i) => i.serialize());

    const message: WSMessage = {
      type: "hierarchy_response",
      payload: { instances },
    };
    if (requestId) {
      message.id = requestId;
    }
    this.sendToClient(clientId, message);
  }

  /**
   * Sends a message to a specific client
   */
  private sendToClient(clientId: string, message: WSMessage): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcasts a message to all clients except the sender
   */
  private broadcast(message: WSMessage, excludeClientId?: string): void {
    const messageStr = JSON.stringify(message);
    for (const [clientId, ws] of this.clients) {
      if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  /**
   * Sends a message to all clients (including sender)
   */
  public broadcastToAll(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  /**
   * Gets the number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Checks if the server is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Gets the instance tree
   */
  public getInstanceTree(): InstanceTree {
    return this.instanceTree;
  }
}

/**
 * Rune - WebSocket Server
 * Handles bidirectional synchronization with Roblox Studio
 * Supports both WebSocket and HTTP polling fallback
 */

import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
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
  private httpServer: ReturnType<typeof createServer> | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private instanceTree: InstanceTree;
  private port: number;
  private isRunning: boolean = false;

  // Polling support: message queue for HTTP polling clients
  private pollMessages: Map<string, WSMessage[]> = new Map();
  private pollingClients: Set<string> = new Set();

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
   * Starts the WebSocket server with HTTP fallback on separate port
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Start WebSocket server on main port
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on("listening", () => {
          logger.success(`WebSocket server started on port ${this.port}`);
        });

        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
          this.handleConnection(ws, req);
        });

        this.wss.on("error", (error: Error) => {
          logger.error(`WebSocket server error: ${error.message}`);
          reject(error);
        });

        // Start HTTP polling server on port+1
        const httpPort = this.port + 1;
        this.httpServer = createServer((req, res) => {
          this.handleHttpRequest(req, res);
        });

        this.httpServer.listen(httpPort, () => {
          logger.success(`HTTP polling server started on port ${httpPort}`);
          this.isRunning = true;
          resolve();
        });

        this.httpServer.on("error", (error: Error) => {
          logger.error(`HTTP server error: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handles HTTP requests (for polling fallback)
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const rawUrl = req.url || "";
    // Strip query string for route matching
    const url = rawUrl.split("?")[0] || "/";
    const clientId = this.extractClientId(req);

    // Enable CORS for Roblox Studio
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-rune-client-id");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", version: "0.1.0-beta" }));
      return;
    }

    if (url === "/poll") {
      const messages = this.pollMessages.get(clientId) || [];
      this.pollMessages.set(clientId, []);
      // Track this polling client for broadcasts
      if (!this.pollingClients.has(clientId)) {
        this.pollingClients.add(clientId);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(messages));
      return;
    }

    if (url === "/send" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const message = JSON.parse(body);
          this.handleMessage(clientId, Buffer.from(JSON.stringify(message)));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    // Default: 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  /**
   * Extracts client ID from request headers or query
   */
  private extractClientId(req: IncomingMessage): string {
    const headerId = req.headers["x-rune-client-id"];
    if (headerId) return headerId as string;

    // Try to extract from query string
    const url = req.url || "";
    const match = url.match(/[?&]clientId=([^&]+)/);
    if (match && match[1]) return match[1];

    return "polling-" + generateSessionId();
  }

  /**
   * Stops the WebSocket server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        // Close all client connections
        for (const ws of Array.from(this.clients.values())) {
          ws.close();
        }
        this.clients.clear();

        this.wss.close(() => {
          this.wss = null;
        });
      }

      if (this.httpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
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
      logger.error(`WebSocket error for ${clientId}: ${error.message}`);
      this.clients.delete(clientId);
    });
  }

  /**
   * Handles incoming messages from clients
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WSMessage;

      switch (message.type) {
        case "request_sync":
          this.sendHierarchy(clientId);
          break;

        case "studio_instance_created":
          this.handleInstanceCreate(message);
          break;

        case "studio_instance_updated":
          this.handleInstanceUpdate(message);
          break;

        case "studio_instance_deleted":
          this.handleInstanceDelete(message);
          break;

        case "studio_instance_moved":
          this.handleInstanceMove(message);
          break;

        case "studio_script_updated":
          this.handleScriptUpdate(message);
          break;

        case "studio_property_changed":
          this.handlePropertyUpdate(message);
          break;

        case "ping":
          this.sendToClient(clientId, {
            type: "pong",
            ...(message.requestId
              ? { requestId: message.requestId }
              : {}),
          });
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Failed to parse message from ${clientId}: ${error}`);
    }
  }

  /**
   * Sends the current instance hierarchy to a client
   */
  private sendHierarchy(clientId: string): void {
    const allInstances = this.instanceTree.getAllInstances();
    const instances = allInstances.map((inst) => inst.serialize());
    this.sendToClient(clientId, {
      type: "full_sync",
      requestId: generateRequestId(),
      data: {
        instances,
        count: instances.length,
        rootIds: this.instanceTree.getRootInstances().map((i) => i.id),
      },
    });
  }

  /**
   * Handles instance creation from Studio
   */
  private handleInstanceCreate(message: WSMessage): void {
    if (!message.data) return;

    const raw = message.data as Record<string, unknown>;
    const instance = RobloxInstanceModel.deserialize(raw);
    this.instanceTree.addInstance(instance);

    if (this.onInstanceCreate) {
      this.onInstanceCreate(instance);
    }

    logger.info(`Studio created: ${instance.name} (${instance.className})`);
  }

  /**
   * Handles instance update from Studio
   */
  private handleInstanceUpdate(message: WSMessage): void {
    if (!message.data) return;

    const raw = message.data as Record<string, unknown>;
    const instance = RobloxInstanceModel.deserialize(raw);
    this.instanceTree.updateInstance(instance);

    if (this.onInstanceUpdate) {
      this.onInstanceUpdate(instance);
    }

    logger.info(`Studio updated: ${instance.name}`);
  }

  /**
   * Handles instance deletion from Studio
   */
  private handleInstanceDelete(message: WSMessage): void {
    const data = message.data as Record<string, unknown> | undefined;
    if (!data?.id) return;

    const instanceId = data.id as string;
    this.instanceTree.removeInstance(instanceId);

    if (this.onInstanceDelete) {
      this.onInstanceDelete(instanceId);
    }

    logger.info(`Instance deleted: ${instanceId}`);
  }

  /**
   * Handles instance move from Studio
   */
  private handleInstanceMove(message: WSMessage): void {
    const data = message.data as Record<string, unknown> | undefined;
    if (!data?.id) return;

    const { id, newParentId } = data as {
      id: string;
      newParentId: string | null;
    };
    this.instanceTree.moveInstance(id, newParentId);

    if (this.onInstanceMove) {
      this.onInstanceMove(id, newParentId);
    }

    logger.info(`Instance moved: ${id} -> ${newParentId || "root"}`);
  }

  /**
   * Handles script source update from Studio
   */
  private handleScriptUpdate(message: WSMessage): void {
    const data = message.data as Record<string, unknown> | undefined;
    if (!data?.id || !data?.source) return;

    const { id, source } = data as { id: string; source: string };
    this.instanceTree.updateScriptSource(id, source);

    if (this.onScriptUpdate) {
      this.onScriptUpdate(id, source);
    }

    logger.info(`Script updated: ${id}`);
  }

  /**
   * Handles property update from Studio
   */
  private handlePropertyUpdate(message: WSMessage): void {
    const data = message.data as Record<string, unknown> | undefined;
    if (!data?.id || !data?.property) return;

    const { id, property, value } = data as {
      id: string;
      property: string;
      value: unknown;
    };
    this.instanceTree.updateProperty(id, property, value);

    if (this.onPropertyUpdate) {
      this.onPropertyUpdate(id, property, value);
    }

    logger.info(`Property updated: ${id}.${property}`);
  }

  /**
   * Sends a message to a specific client
   */
  public sendToClient(clientId: string, message: WSMessage): boolean {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }

    // Fallback: queue for polling clients
    const queued = this.pollMessages.get(clientId) || [];
    queued.push(message);
    this.pollMessages.set(clientId, queued);
    return true;
  }

  /**
   * Broadcasts a message to all connected clients
   */
  public broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    // Send to WebSocket clients
    for (const [clientId, ws] of Array.from(this.clients.entries())) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
    // Also queue for all known polling clients
    for (const clientId of Array.from(this.pollingClients)) {
      const queued = this.pollMessages.get(clientId) || [];
      queued.push(message);
      this.pollMessages.set(clientId, queued);
    }
  }

  /**
   * Sends a sync update for a specific instance
   */
  public sendSyncUpdate(instance: RobloxInstanceModel): void {
    this.broadcast({
      type: "sync_update",
      requestId: generateRequestId(),
      data: instance,
    });
  }

  /**
   * Sends a sync delete notification
   */
  public sendSyncDelete(instanceId: string): void {
    this.broadcast({
      type: "sync_delete",
      requestId: generateRequestId(),
      data: { id: instanceId },
    });
  }

  /**
   * Sends a sync move notification
   */
  public sendSyncMove(instanceId: string, newParentId: string | null): void {
    this.broadcast({
      type: "sync_move",
      requestId: generateRequestId(),
      data: { id: instanceId, newParentId },
    });
  }

  /**
   * Sends a property update notification
   */
  public sendPropertyUpdate(
    instanceId: string,
    propertyName: string,
    value: unknown,
  ): void {
    this.broadcast({
      type: "property_update",
      requestId: generateRequestId(),
      data: { id: instanceId, property: propertyName, value },
    });
  }

  /**
   * Checks if the server is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Gets the number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }
}

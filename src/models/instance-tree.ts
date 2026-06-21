/**
 * Rune - Instance Tree Model
 * Manages the hierarchy of Roblox instances
 */

import type { RobloxClassName } from "../types/index.js";
import { RobloxInstanceModel } from "./roblox-instance.js";
import { logger } from "../utils/logger.js";

/**
 * InstanceTree - manages a tree of Roblox instances
 */
export class InstanceTree {
  private instances: Map<string, RobloxInstanceModel> = new Map();
  private rootIds: string[] = [];

  /**
   * Adds an instance to the tree
   * @param instance - The instance to add
   */
  public addInstance(instance: RobloxInstanceModel): void {
    this.instances.set(instance.id, instance);

    if (instance.parentId === null) {
      if (!this.rootIds.includes(instance.id)) {
        this.rootIds.push(instance.id);
      }
    } else {
      const parent = this.instances.get(instance.parentId);
      if (parent) {
        parent.addChild(instance.id);
      } else {
        logger.warn(
          `Parent instance not found: ${instance.parentId} for ${instance.name}`,
        );
      }
    }
  }

  /**
   * Removes an instance from the tree
   * @param instanceId - The instance ID to remove
   * @param recursive - Whether to remove children recursively
   */
  public removeInstance(instanceId: string, recursive: boolean = true): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    // Remove from parent's children
    if (instance.parentId) {
      const parent = this.instances.get(instance.parentId);
      if (parent) {
        parent.removeChild(instanceId);
      }
    }

    // Remove from root IDs if applicable
    this.rootIds = this.rootIds.filter((id) => id !== instanceId);

    // Remove children recursively
    if (recursive) {
      const childrenToRemove = [...instance.children];
      for (const childId of childrenToRemove) {
        this.removeInstance(childId, true);
      }
    }

    this.instances.delete(instanceId);
  }

  /**
   * Gets an instance by ID
   * @param instanceId - The instance ID
   * @returns The instance or undefined
   */
  public getInstance(instanceId: string): RobloxInstanceModel | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Gets all instances
   * @returns Array of all instances
   */
  public getAllInstances(): RobloxInstanceModel[] {
    return Array.from(this.instances.values());
  }

  /**
   * Gets root instances
   * @returns Array of root instances
   */
  public getRootInstances(): RobloxInstanceModel[] {
    return this.rootIds
      .map((id) => this.instances.get(id))
      .filter((inst): inst is RobloxInstanceModel => inst !== undefined);
  }

  /**
   * Gets children of an instance
   * @param parentId - The parent instance ID
   * @returns Array of child instances
   */
  public getChildren(parentId: string): RobloxInstanceModel[] {
    const parent = this.instances.get(parentId);
    if (!parent) return [];

    return parent.children
      .map((id) => this.instances.get(id))
      .filter((inst): inst is RobloxInstanceModel => inst !== undefined);
  }

  /**
   * Finds an instance by name and parent
   * @param name - Instance name
   * @param parentId - Parent instance ID (null for root)
   * @returns The instance or undefined
   */
  public findInstance(
    name: string,
    parentId: string | null = null,
  ): RobloxInstanceModel | undefined {
    for (const instance of Array.from(this.instances.values())) {
      if (instance.name === name && instance.parentId === parentId) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * Finds instances by class name
   * @param className - The class name to search for
   * @returns Array of matching instances
   */
  public findByClassName(className: RobloxClassName): RobloxInstanceModel[] {
    const results: RobloxInstanceModel[] = [];
    for (const instance of Array.from(this.instances.values())) {
      if (instance.className === className) {
        results.push(instance);
      }
    }
    return results;
  }

  /**
   * Gets the full path of an instance
   * @param instanceId - The instance ID
   * @returns The full path string
   */
  public getInstancePath(instanceId: string): string {
    const instance = this.instances.get(instanceId);
    if (!instance) return "";

    const parts: string[] = [instance.name];
    let current: RobloxInstanceModel | undefined = instance;

    while (current && current.parentId) {
      current = this.instances.get(current.parentId);
      if (current) {
        parts.unshift(current.name);
      }
    }

    return parts.join(".");
  }

  /**
   * Moves an instance to a new parent
   * @param instanceId - The instance to move
   * @param newParentId - The new parent ID (null for root)
   */
  public moveInstance(instanceId: string, newParentId: string | null): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    // Remove from old parent
    if (instance.parentId) {
      const oldParent = this.instances.get(instance.parentId);
      if (oldParent) {
        oldParent.removeChild(instanceId);
      }
    }

    // Remove from root if it was a root
    this.rootIds = this.rootIds.filter((id) => id !== instanceId);

    // Update parent reference
    instance.parentId = newParentId;

    // Add to new parent or root
    if (newParentId) {
      const newParent = this.instances.get(newParentId);
      if (newParent) {
        newParent.addChild(instanceId);
      } else {
        logger.warn(
          `New parent instance not found: ${newParentId} for ${instance.name}`,
        );
        // Revert
        this.rootIds.push(instanceId);
      }
    } else {
      this.rootIds.push(instanceId);
    }
  }

  /**
   * Renames an instance
   * @param instanceId - The instance to rename
   * @param newName - The new name
   */
  public renameInstance(instanceId: string, newName: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.name = newName;
    }
  }

  /**
   * Clears the entire tree
   */
  public clear(): void {
    this.instances.clear();
    this.rootIds = [];
  }

  /**
   * Gets the number of instances in the tree
   * @returns Instance count
   */
  public size(): number {
    return this.instances.size;
  }

  /**
   * Checks if the tree contains an instance
   * @param instanceId - The instance ID
   * @returns True if the instance exists
   */
  public has(instanceId: string): boolean {
    return this.instances.has(instanceId);
  }

  /**
   * Gets the full hierarchy for sending to Studio
   * @returns Array of serialized root instances with children
   */
  public getHierarchy(): unknown[] {
    return this.rootIds
      .map((id) => this.instances.get(id))
      .filter((inst): inst is RobloxInstanceModel => inst !== undefined)
      .map((inst) => inst.serialize());
  }

  /**
   * Updates an existing instance in the tree
   * @param instance - The instance with updated data
   */
  public updateInstance(instance: RobloxInstanceModel): void {
    const existing = this.instances.get(instance.id);
    if (!existing) {
      this.addInstance(instance);
      return;
    }
    // Update mutable fields
    existing.name = instance.name;
    existing.className = instance.className;
    if (instance.source !== undefined) {
      existing.source = instance.source;
    }
    if (instance.properties) {
      existing.properties = instance.properties;
    }
  }

  /**
   * Updates the script source for an instance
   * @param instanceId - The instance ID
   * @param source - The new script source
   */
  public updateScriptSource(instanceId: string, source: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.source = source;
    }
  }

  /**
   * Updates a property on an instance
   * @param instanceId - The instance ID
   * @param propertyName - The property name
   * @param value - The new property value
   */
  public updateProperty(
    instanceId: string,
    propertyName: string,
    value: unknown,
  ): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.setProperty(propertyName, typeof value, value);
    }
  }

  /**
   * Serializes the entire tree to a plain object
   * @returns Serialized tree data
   */
  public serialize(): Record<string, unknown> {
    const instances: Record<string, unknown> = {};
    for (const [id, instance] of Array.from(this.instances)) {
      instances[id] = instance.serialize();
    }

    return {
      instances,
      rootIds: this.rootIds,
    };
  }

  /**
   * Deserializes a tree from plain object data
   * @param data - Serialized tree data
   * @returns A new InstanceTree
   */
  public static deserialize(data: Record<string, unknown>): InstanceTree {
    const tree = new InstanceTree();

    if (data.instances) {
      const instancesData = data.instances as Record<
        string,
        Record<string, unknown>
      >;
      for (const [id, instanceData] of Object.entries(instancesData)) {
        const instance = RobloxInstanceModel.deserialize(instanceData);
        tree.instances.set(id, instance);
      }
    }

    if (data.rootIds) {
      tree.rootIds = data.rootIds as string[];
    }

    return tree;
  }
}

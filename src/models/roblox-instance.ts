/**
 * Rune - Roblox Instance Model
 * Represents a Roblox instance in memory with full property support
 */

import type {
  RobloxInstance,
  RobloxProperty,
  RobloxClassName,
} from "../types/index.js";
import { generateInstanceId } from "../utils/id-generator.js";

/**
 * RobloxInstance class - represents a single Roblox instance
 */
export class RobloxInstanceModel {
  public id: string;
  public className: RobloxClassName;
  public name: string;
  public parentId: string | null;
  public properties: Map<string, RobloxProperty>;
  public children: string[];
  public source?: string;
  public tags?: string[];
  public attributes?: Map<string, unknown>;

  constructor(
    className: RobloxClassName,
    name: string,
    parentId: string | null = null,
    id?: string,
  ) {
    this.id = id || generateInstanceId();
    this.className = className;
    this.name = name;
    this.parentId = parentId;
    this.properties = new Map();
    this.children = [];
    this.tags = [];
    this.attributes = new Map();
  }

  /**
   * Sets a property on this instance
   * @param name - Property name
   * @param type - Property type (Roblox type string)
   * @param value - Property value
   */
  public setProperty(name: string, type: string, value: unknown): void {
    this.properties.set(name, { name, type, value });
  }

  /**
   * Gets a property from this instance
   * @param name - Property name
   * @returns The property or undefined
   */
  public getProperty(name: string): RobloxProperty | undefined {
    return this.properties.get(name);
  }

  /**
   * Gets a property value from this instance
   * @param name - Property name
   * @returns The property value or undefined
   */
  public getPropertyValue<T>(name: string): T | undefined {
    const prop = this.properties.get(name);
    return prop?.value as T | undefined;
  }

  /**
   * Removes a property from this instance
   * @param name - Property name
   */
  public removeProperty(name: string): void {
    this.properties.delete(name);
  }

  /**
   * Adds a child instance ID
   * @param childId - The child instance ID
   */
  public addChild(childId: string): void {
    if (!this.children.includes(childId)) {
      this.children.push(childId);
    }
  }

  /**
   * Removes a child instance ID
   * @param childId - The child instance ID
   */
  public removeChild(childId: string): void {
    this.children = this.children.filter((id) => id !== childId);
  }

  /**
   * Sets the source code for script instances
   * @param source - The source code
   */
  public setSource(source: string): void {
    this.source = source;
  }

  /**
   * Adds a tag to this instance
   * @param tag - The tag to add
   */
  public addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Removes a tag from this instance
   * @param tag - The tag to remove
   */
  public removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter((t) => t !== tag);
    }
  }

  /**
   * Sets an attribute on this instance
   * @param name - Attribute name
   * @param value - Attribute value
   */
  public setAttribute(name: string, value: unknown): void {
    if (!this.attributes) {
      this.attributes = new Map();
    }
    this.attributes.set(name, value);
  }

  /**
   * Gets an attribute from this instance
   * @param name - Attribute name
   * @returns The attribute value or undefined
   */
  public getAttribute<T>(name: string): T | undefined {
    return this.attributes?.get(name) as T | undefined;
  }

  /**
   * Removes an attribute from this instance
   * @param name - Attribute name
   */
  public removeAttribute(name: string): void {
    this.attributes?.delete(name);
  }

  /**
   * Serializes this instance to a plain object for transmission
   * @returns Serialized instance data
   */
  public serialize(): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    for (const [key, prop] of this.properties) {
      properties[key] = {
        type: prop.type,
        value: prop.value,
      };
    }

    const attributes: Record<string, unknown> = {};
    if (this.attributes) {
      for (const [key, value] of this.attributes) {
        attributes[key] = value;
      }
    }

    return {
      id: this.id,
      className: this.className,
      name: this.name,
      parentId: this.parentId,
      properties,
      children: this.children,
      source: this.source,
      tags: this.tags || [],
      attributes,
    };
  }

  /**
   * Creates a RobloxInstanceModel from serialized data
   * @param data - Serialized instance data
   * @returns A new RobloxInstanceModel
   */
  public static deserialize(
    data: Record<string, unknown>,
  ): RobloxInstanceModel {
    const instance = new RobloxInstanceModel(
      data.className as RobloxClassName,
      data.name as string,
      data.parentId as string | null,
      data.id as string,
    );

    // Restore properties
    if (data.properties) {
      const props = data.properties as Record<
        string,
        { type: string; value: unknown }
      >;
      for (const [key, prop] of Object.entries(props)) {
        instance.setProperty(key, prop.type, prop.value);
      }
    }

    // Restore children
    if (data.children) {
      instance.children = data.children as string[];
    }

    // Restore source
    if (data.source) {
      instance.source = data.source as string;
    }

    // Restore tags
    if (data.tags) {
      instance.tags = data.tags as string[];
    }

    // Restore attributes
    if (data.attributes) {
      const attrs = data.attributes as Record<string, unknown>;
      for (const [key, value] of Object.entries(attrs)) {
        instance.setAttribute(key, value);
      }
    }

    return instance;
  }

  /**
   * Creates a deep clone of this instance
   * @returns A new RobloxInstanceModel with the same data
   */
  public clone(): RobloxInstanceModel {
    const cloned = new RobloxInstanceModel(
      this.className,
      this.name,
      this.parentId,
      generateInstanceId(),
    );

    // Clone properties
    for (const [key, prop] of this.properties) {
      cloned.setProperty(key, prop.type, prop.value);
    }

    // Clone children (just IDs, not deep clone)
    cloned.children = [...this.children];

    // Clone source
    if (this.source) {
      cloned.source = this.source;
    }

    // Clone tags
    if (this.tags) {
      cloned.tags = [...this.tags];
    }

    // Clone attributes
    if (this.attributes) {
      for (const [key, value] of this.attributes) {
        cloned.setAttribute(key, value);
      }
    }

    return cloned;
  }
}

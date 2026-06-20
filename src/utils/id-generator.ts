/**
 * Rune - ID Generator Utility
 * Generates unique identifiers for Roblox instances
 */

/**
 * Generates a unique ID for a Roblox instance
 * Uses a combination of timestamp and random string
 * @returns A unique identifier string
 */
export function generateInstanceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `inst_${timestamp}_${randomPart}`;
}

/**
 * Generates a unique ID for a file path mapping
 * @param filePath - The file path
 * @returns A unique identifier string
 */
export function generateFileId(filePath: string): string {
  const hash = simpleHash(filePath);
  return `file_${hash}`;
}

/**
 * Generates a unique ID for a sync session
 * @returns A unique identifier string
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `session_${timestamp}_${randomPart}`;
}

/**
 * Simple hash function for strings
 * @param str - The string to hash
 * @returns A hash string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a request ID for WebSocket messages
 * @returns A unique request identifier string
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

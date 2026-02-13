/**
 * Generic JSON file store with atomic writes and per-file locking.
 * Uses Bun's native file APIs for performance.
 */

import { resolve } from "path";

// Simple per-file lock map to prevent concurrent writes
const locks = new Map<string, Promise<void>>();

/**
 * Get the absolute path for a data file
 */
export function getDataPath(filename: string): string {
  return resolve(process.cwd(), "data", filename);
}

/**
 * Read and parse a JSON file. Returns null if file doesn't exist.
 */
export async function readJsonFile<T>(filepath: string): Promise<T | null> {
  try {
    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      return null;
    }
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Error reading ${filepath}:`, error);
    return null;
  }
}

/**
 * Write JSON to a file atomically (write to temp, then rename).
 * Uses per-file locking to prevent concurrent writes.
 */
export async function writeJsonFile<T>(
  filepath: string,
  data: T
): Promise<boolean> {
  // Wait for any existing write to complete
  const existingLock = locks.get(filepath);
  if (existingLock) {
    await existingLock;
  }

  // Create a new lock for this write
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(filepath, lockPromise);

  try {
    const tempPath = `${filepath}.tmp.${Date.now()}`;
    const content = JSON.stringify(data, null, 2);

    // Write to temp file
    await Bun.write(tempPath, content);

    // Atomic rename (on most filesystems)
    const fs = await import("fs/promises");
    await fs.rename(tempPath, filepath);

    return true;
  } catch (error) {
    console.error(`Error writing ${filepath}:`, error);
    return false;
  } finally {
    releaseLock!();
    locks.delete(filepath);
  }
}

/**
 * Ensure the data directory exists
 */
export async function ensureDataDir(): Promise<void> {
  const fs = await import("fs/promises");
  const dataDir = resolve(process.cwd(), "data");
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {
    // Directory likely already exists
  }
}

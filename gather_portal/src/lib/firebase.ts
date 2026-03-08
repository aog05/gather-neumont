/**
 * Firebase Configuration and Initialization for Admin Portal
 *
 * This file sets up the Firebase app and Firestore database
 * for the Neumont Virtual Campus Admin Portal.
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Firebase configuration object
 * Contains all necessary credentials and settings for the Firebase project
 */
const firebaseConfig = {
  apiKey: "AIzaSyDablA6pLlXL4fK_xXOU-3kOojrKFm4BKc",
  authDomain: "test-neumont.firebaseapp.com",
  projectId: "test-neumont",
  storageBucket: "test-neumont.firebasestorage.app",
  messagingSenderId: "835852599362",
  appId: "1:835852599362:web:204bd4d7ad55e1e859eddb",
  measurementId: "G-JHZ2WN8239"
};

/**
 * Initialize Firebase App
 * This is the core Firebase instance that all other services depend on
 */
export const app: FirebaseApp = initializeApp(firebaseConfig);

/**
 * Initialize Firestore Database
 * This is the main database instance for all data operations
 */
export const db: Firestore = getFirestore(app);

// Firestore emulator activation:
// 1) Explicit env flag takes priority.
// 2) Localhost hostname fallback remains for compatibility.
if (typeof window !== "undefined") {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const isDev = (env.NODE_ENV ?? "development") !== "production";
  const useEmulatorExplicit =
    (env.BUN_PUBLIC_USE_FIRESTORE_EMULATOR ?? "").trim().toLowerCase() === "1" ||
    (env.BUN_PUBLIC_USE_FIRESTORE_EMULATOR ?? "").trim().toLowerCase() === "true";
  const requireEmulator =
    (env.BUN_PUBLIC_REQUIRE_FIRESTORE_EMULATOR ?? "").trim().toLowerCase() === "1" ||
    (env.BUN_PUBLIC_REQUIRE_FIRESTORE_EMULATOR ?? "").trim().toLowerCase() === "true";

  const rawHost = (env.BUN_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "").trim();
  let emuHost = "localhost";
  let emuPort = 8080;
  if (rawHost) {
    const hostValue = rawHost.replace(/^https?:\/\//i, "").split("/")[0];
    if (hostValue === "::1") {
      emuHost = "::1";
    } else if (hostValue.startsWith("::1:")) {
      emuHost = "::1";
      const maybePort = Number(hostValue.slice("::1:".length));
      if (Number.isInteger(maybePort) && maybePort > 0 && maybePort <= 65535) {
        emuPort = maybePort;
      }
    } else {
      const colon = hostValue.lastIndexOf(":");
      if (colon > 0 && hostValue.indexOf(":") === colon) {
        emuHost = hostValue.slice(0, colon) || "localhost";
        const maybePort = Number(hostValue.slice(colon + 1));
        if (Number.isInteger(maybePort) && maybePort > 0 && maybePort <= 65535) {
          emuPort = maybePort;
        }
      } else if (hostValue) {
        emuHost = hostValue;
      }
    }
  }

  let emulatorConnected = false;
  let usedFallback = false;

  if (useEmulatorExplicit) {
    try {
      connectFirestoreEmulator(db, emuHost, emuPort);
      emulatorConnected = true;
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("already")) {
        emulatorConnected = true;
      } else if (isDev) {
        console.warn("[firebase] Failed to connect Firestore emulator:", err);
      }
    }
  } else if (LOOPBACK_HOSTS.has(window.location.hostname)) {
    usedFallback = true;
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
      emulatorConnected = true;
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("already")) {
        emulatorConnected = true;
      } else if (isDev) {
        console.warn("[firebase] Firestore emulator fallback failed:", err);
      }
    }
  }

  if (isDev && usedFallback) {
    console.warn(
      "[firebase] Firestore emulator connected via loopback fallback. Set BUN_PUBLIC_USE_FIRESTORE_EMULATOR=1 for explicit local config."
    );
  }
  if (isDev && !emulatorConnected) {
    console.warn(
      `[firebase] Firestore emulator not connected; using project "${firebaseConfig.projectId}".`
    );
  }
  if (isDev && requireEmulator && !emulatorConnected) {
    console.error(
      "[firebase] Firestore emulator required but not connected. Set BUN_PUBLIC_USE_FIRESTORE_EMULATOR=1."
    );
  }
}

/**
 * Collection names as constants for type safety and consistency
 * Use these throughout the app to avoid typos and ensure consistency
 */
export const COLLECTIONS = {
  PUZZLE: 'Puzzle',
  PUZZLE_WEEK: 'PuzzleWeek',
  NPC: 'NPC',
  PLAYER: 'Player',
  COSMETIC: 'Cosmetic',
  DIALOGUE: 'Dialogue',
  QUEST: 'Quest',
  SKILL_TREE_ITEMS: 'SkillTreeItems',
  ANALYTICS: 'Analytics',
} as const;

/**
 * Type for collection names
 */
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

/**
 * Helper function to check if Firestore is initialized
 */
export const isFirestoreReady = (): boolean => {
  return db !== null && db !== undefined;
};

/**
 * Export default object with all Firebase services
 */
export default {
  app,
  db,
  COLLECTIONS,
  isFirestoreReady,
};


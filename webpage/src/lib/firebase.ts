/**
 * Firebase Configuration and Initialization
 * 
 * This file sets up the Firebase app, Firestore database, and Analytics
 * for the Neumont Virtual Campus Web App.
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";

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
 * Initialize Firebase Analytics
 * Tracks user interactions and app usage
 * Note: Analytics only works in browser environments
 */
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}
export { analytics };

/**
 * Initialize Firestore Database
 * This is the main database instance for all data operations
 */
export const db: Firestore = getFirestore(app);

// Firestore emulator activation is explicit (opt-in) to avoid routing
// all localhost gameplay reads (including NPC dialogue) to a sparse emulator.
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
  }

  if (isDev && useEmulatorExplicit && emulatorConnected) {
    console.warn(
      `[firebase] Firestore emulator connected at ${emuHost}:${emuPort}.`
    );
  }
  if (isDev && !emulatorConnected) {
    console.warn(
      `[firebase] Using project "${firebaseConfig.projectId}" Firestore. Set BUN_PUBLIC_USE_FIRESTORE_EMULATOR=1 to opt in to local emulator.`
    );
  }
  if (isDev && requireEmulator && !emulatorConnected) {
    throw new Error(
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
  PUZZLE_WEEK: 'PuzzleWeek', // Parent collection (e.g., "Jan20261" subcollections)
  NPC: 'NPC',
  PLAYER: 'Player',
  COSMETIC: 'Cosmetic',
  DIALOGUE: 'Dialogue',
  QUEST: 'Quest',
  SKILL_TREE_ITEMS: 'SkillTreeItems',
  QUIZ_QUESTIONS: 'QUIZ_QUESTIONS',
  QUIZ_SCHEDULE: 'QUIZ_SCHEDULE',
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
  analytics,
  db,
  COLLECTIONS,
  isFirestoreReady,
};


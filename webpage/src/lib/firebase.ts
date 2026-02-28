/**
 * Firebase Configuration and Initialization
 * 
 * This file sets up the Firebase app, Firestore database, and Analytics
 * for the Neumont Virtual Campus Web App.
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";

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


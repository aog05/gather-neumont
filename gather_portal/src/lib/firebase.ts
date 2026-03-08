/**
 * Firebase Configuration and Initialization for Admin Portal
 *
 * This file sets up the Firebase app and Firestore database
 * for the Neumont Virtual Campus Admin Portal.
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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

/**
 * Initialize Firebase Storage
 * This is used for uploading and storing files (e.g., cosmetic images)
 */
export const storage: FirebaseStorage = getStorage(app);

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
  QUIZ_QUESTIONS: 'QUIZ_QUESTIONS',
  QUIZ_SCHEDULE: 'QUIZ_SCHEDULE',
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
  storage,
  COLLECTIONS,
  isFirestoreReady,
};


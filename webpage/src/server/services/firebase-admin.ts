import { accessSync, constants, readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getServiceAccountPath(): string | null {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  return path ? path : null;
}

function hasInlineServiceAccountJson(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

function isServiceAccountPathReadable(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function isAdminSdkAvailable(): boolean {
  if (hasInlineServiceAccountJson()) return true;
  const path = getServiceAccountPath();
  return path ? isServiceAccountPathReadable(path) : false;
}

let adminDb: Firestore | null = null;

function loadServiceAccountRaw(): string {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson && inlineJson.trim()) return inlineJson;

  const path = getServiceAccountPath();
  if (!path) {
    throw new Error(
      "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  try {
    const fileContents = readFileSync(path, "utf8");
    if (!fileContents.trim()) {
      throw new Error("empty_file");
    }
    return fileContents;
  } catch (error) {
    if (error instanceof Error && error.message === "empty_file") {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH points to an empty file.");
    }
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_PATH is set but the file cannot be read.",
    );
  }
}

function parseServiceAccount(): ServiceAccountLike {
  const raw = loadServiceAccountRaw();

  try {
    return JSON.parse(raw) as ServiceAccountLike;
  } catch {
    throw new Error(
      "Firebase Admin service account JSON is invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }
}

export function getAdminFirestore(): Firestore {
  if (adminDb) return adminDb;

  const serviceAccount = parseServiceAccount();
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: process.env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id,
    });

  adminDb = getFirestore(app);
  return adminDb;
}

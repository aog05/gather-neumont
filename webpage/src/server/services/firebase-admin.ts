import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function isAdminSdkAvailable(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

let adminDb: Firestore | null = null;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");
  }

  try {
    return JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
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

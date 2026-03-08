/**
 * seed-chat-emulator.ts
 *
 * Seeds a welcome message + pinned-meta to the local Firestore emulator.
 * Uses the Firebase Web SDK (same as the app) - no firebase-admin required.
 * This script never targets production Firestore.
 *
 * Usage:
 *   bun run emu:seed
 *
 * Or manually:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 bun run scripts/seed-chat-emulator.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
  doc,
  getDocs,
  setDoc,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";

function parseEmulatorHost(input: string): { hostname: string; port: number } | null {
  const trimmed = input.trim().replace(/^https?:\/\//i, "").split("/")[0];
  if (!trimmed) return null;

  if (trimmed === "::1") return { hostname: "::1", port: 8080 };
  if (trimmed.startsWith("::1:")) {
    const port = Number(trimmed.slice("::1:".length));
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { hostname: "::1", port };
  }

  const firstColon = trimmed.indexOf(":");
  const lastColon = trimmed.lastIndexOf(":");
  if (firstColon > 0 && firstColon === lastColon) {
    const hostname = trimmed.slice(0, firstColon);
    const port = Number(trimmed.slice(firstColon + 1));
    if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { hostname, port };
  }

  return { hostname: trimmed, port: 8080 };
}

const parsedEmulator = parseEmulatorHost(emulatorHost);
if (!parsedEmulator) {
  console.error(
    `[seed] FIRESTORE_EMULATOR_HOST is "${emulatorHost}" - expected "host:port".\n` +
      "[seed] Refusing to run with an invalid emulator host."
  );
  process.exit(1);
}

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!localHosts.has(parsedEmulator.hostname)) {
  console.error(
    `[seed] FIRESTORE_EMULATOR_HOST resolves to "${parsedEmulator.hostname}" - must be localhost, 127.0.0.1, or ::1.\n` +
      "[seed] Refusing to run against a non-local host."
  );
  process.exit(1);
}

const firebaseConfig = {
  apiKey: "AIzaSyDablA6pLlXL4fK_xXOU-3kOojrKFm4BKc",
  authDomain: "test-neumont.firebaseapp.com",
  projectId: "test-neumont",
  storageBucket: "test-neumont.firebasestorage.app",
  messagingSenderId: "835852599362",
  appId: "1:835852599362:web:204bd4d7ad55e1e859eddb",
};

const app = initializeApp(firebaseConfig, "seed");
const db = getFirestore(app);

const emuHostname = parsedEmulator.hostname;
const emuPort = parsedEmulator.port;
connectFirestoreEmulator(db, emuHostname, emuPort);

console.log(`[seed] Connected to Firestore emulator at ${emuHostname}:${emuPort}`);

async function seed() {
  const messagesRef = collection(db, "chat", "global", "messages");

  const existing = await getDocs(query(messagesRef, limit(1)));
  if (!existing.empty) {
    console.log(
      "[seed] chat/global/messages already has documents - skipping.\n" +
        "[seed] Restart the emulator (Ctrl-C + bun run emu:start) to clear data, then re-run."
    );
    return;
  }

  const messageRef = await addDoc(messagesRef, {
    text: "Welcome to the Neumont Virtual Campus global chat!",
    authorUserId: "system",
    authorUsername: "System",
    authorIsAdmin: true,
    createdAt: serverTimestamp(),
    status: "active",
    reportCount: 0,
    hasOpenReports: false,
    lastReportedAt: null,
  });

  console.log(`[seed] Created message: ${messageRef.id}`);

  await setDoc(doc(db, "chat", "global", "meta", "pinned"), {
    messageId: messageRef.id,
    pinnedAt: serverTimestamp(),
    pinnedByUserId: "system",
    pinnedByUsername: "System",
  });

  console.log(`[seed] Pinned message: ${messageRef.id}`);
  console.log("[seed] Done. Open the forum to see the welcome message + pinned banner.");
}

seed().catch((err: unknown) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});

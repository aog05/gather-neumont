/**
 * seed-chat-emulator.ts
 *
 * Seeds demo chat data to the local Firestore emulator.
 * Uses the Firebase Web SDK (same as the app) — no firebase-admin required.
 * This script NEVER targets production Firestore.
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
  Timestamp,
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
    `[seed] FIRESTORE_EMULATOR_HOST is "${emulatorHost}" — expected "host:port".\n` +
      "[seed] Refusing to run with an invalid emulator host."
  );
  process.exit(1);
}

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!localHosts.has(parsedEmulator.hostname)) {
  console.error(
    `[seed] FIRESTORE_EMULATOR_HOST resolves to "${parsedEmulator.hostname}" — must be localhost, 127.0.0.1, or ::1.\n` +
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

// ── Seed user IDs (not real Firebase auth users — for reactions only) ────────
const U = {
  system: "seed_system",
  alex:   "seed_alex",
  jordan: "seed_jordan",
  sam:    "seed_sam",
  riley:  "seed_riley",
  priya:  "seed_priya",
  marcus: "seed_marcus",
  emily:  "seed_emily",
} as const;

function minsAgo(n: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - n * 60_000));
}

function msg(
  text: string,
  authorUserId: string,
  authorUsername: string,
  authorIsAdmin: boolean,
  createdAt: Timestamp,
  reactions: Record<string, string[]> = {}
) {
  return {
    text,
    authorUserId,
    authorUsername,
    authorIsAdmin,
    createdAt,
    status: "active",
    reportCount: 0,
    hasOpenReports: false,
    lastReportedAt: null,
    reactions,
  };
}

async function seed() {
  const messagesRef = collection(db, "chat", "global", "messages");

  // Idempotency: skip if any messages already exist.
  const existing = await getDocs(query(messagesRef, limit(1)));
  if (!existing.empty) {
    console.log(
      "[seed] chat/global/messages already has documents — skipping.\n" +
        "[seed] Restart the emulator (Ctrl-C + bun run emu:start) to clear data, then re-run."
    );
    return;
  }

  // ── Welcome message (will be pinned) ───────────────────────────────────────
  const welcomeRef = await addDoc(
    messagesRef,
    msg(
      "Welcome to the Neumont Virtual Campus global chat! 🎓 Use this space to connect with fellow students, coordinate study sessions, and explore campus together.",
      U.system, "System", true, minsAgo(120),
      { "👍": [U.alex, U.jordan, U.sam, U.riley, U.priya], "🎉": [U.marcus, U.emily] }
    )
  );
  console.log(`[seed] Created welcome message: ${welcomeRef.id}`);

  // ── Conversation messages ───────────────────────────────────────────────────
  // Written in chronological order (oldest → newest).
  // The feed query orders by createdAt DESC, so newest shows at top.
  const conversationMessages = [
    msg(
      "Hey everyone! Just found this chat 🎉 First day on campus and honestly a little overwhelmed lol",
      U.alex, "alex_k", false, minsAgo(110),
      { "😂": [U.jordan, U.sam, U.riley], "❤️": [U.priya] }
    ),
    msg(
      "Welcome! Pro tip: the CS lab on floor 3 is the best study spot. Way quieter than the library",
      U.jordan, "jordan_m", false, minsAgo(105),
      { "👍": [U.alex, U.sam, U.riley, U.emily] }
    ),
    msg(
      "Just had a conversation with the Dr. Foster NPC about algorithms — he actually gave me a study technique I hadn't tried. Wild 👀",
      U.sam, "sam_chen", false, minsAgo(98),
      { "👀": [U.alex, U.jordan, U.riley, U.priya], "😂": [U.marcus] }
    ),
    msg(
      "okay who else spent like 10 minutes looking for the elevator on floor 1 😂😂",
      U.riley, "riley_t", false, minsAgo(90),
      { "😂": [U.alex, U.sam, U.priya, U.marcus, U.emily], "👍": [U.jordan] }
    ),
    msg(
      "GUILTY 😅 it's tucked behind the main atrium — easy to miss. Should definitely be labeled better",
      U.priya, "priya_s", false, minsAgo(86),
      {}
    ),
    msg(
      "Who's taking Data Structures this semester? Professor just posted office hours — Tuesdays 3–5pm in room 312",
      U.marcus, "marcus_w", false, minsAgo(75),
      { "👍": [U.emily, U.riley, U.sam] }
    ),
    msg(
      "Me! I heard the projects are intense but actually interesting. Anyone down to form a study group?",
      U.emily, "emily_n", false, minsAgo(70),
      { "👍": [U.marcus, U.riley, U.sam], "❤️": [U.priya] }
    ),
    msg(
      "100% in. We could use this chat to coordinate — pick a spot on campus and meet up",
      U.alex, "alex_k", false, minsAgo(64),
      { "👍": [U.jordan, U.sam, U.riley, U.emily, U.priya] }
    ),
    msg(
      "Great idea. Anyone free tomorrow after 2pm? The floor 2 common area has a big table",
      U.jordan, "jordan_m", false, minsAgo(58),
      {}
    ),
    msg(
      "Free after 2:30, I'll be there 👍",
      U.riley, "riley_t", false, minsAgo(52),
      {}
    ),
    msg(
      "Same! I'll bring snacks ❤️",
      U.emily, "emily_n", false, minsAgo(49),
      { "❤️": [U.alex, U.jordan, U.sam, U.riley, U.priya, U.marcus] }
    ),
    msg(
      "Reminder: Study room reservations can be made through the student portal if you need a private space 👉 portal.neumont.edu",
      U.system, "System", true, minsAgo(30),
      { "👍": [U.alex, U.priya, U.marcus] }
    ),
    msg(
      "Good to know, thanks! Random question — anyone know when the campus cafe closes?",
      U.priya, "priya_s", false, minsAgo(20),
      {}
    ),
    msg(
      "8pm weekdays, noon on weekends I think. The hours are in the portal somewhere",
      U.marcus, "marcus_w", false, minsAgo(12),
      { "👍": [U.priya, U.alex] }
    ),
    msg(
      "This community is already so helpful 🎉 Glad I found this chat. See everyone at the study group tomorrow!",
      U.alex, "alex_k", false, minsAgo(4),
      { "🎉": [U.jordan, U.riley, U.priya], "❤️": [U.emily] }
    ),
  ];

  await Promise.all(conversationMessages.map((m) => addDoc(messagesRef, m)));
  console.log(`[seed] Created ${conversationMessages.length} conversation messages`);

  // ── Pin the welcome message ─────────────────────────────────────────────────
  await setDoc(doc(db, "chat", "global", "meta", "pinned"), {
    messageId: welcomeRef.id,
    pinnedAt: minsAgo(118),
    pinnedByUserId: U.system,
    pinnedByUsername: "System",
  });

  console.log(`[seed] Pinned welcome message: ${welcomeRef.id}`);
  console.log(`[seed] Done. ${conversationMessages.length + 1} messages total. Open the forum to see the seeded conversation.`);
}

seed().catch((err: unknown) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});

/**
 * seed-quests.ts
 *
 * Seeds all test Quest documents, Quest Master Rex dialogue tree,
 * a cosmetic reward, and the sarah_dev player to the local Firestore emulator.
 * Uses the Firebase Web SDK — no firebase-admin required.
 * This script NEVER targets production Firestore.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 bun run scripts/seed-quests.ts
 *
 * Or via package.json:
 *   bun run emu:seed:quests
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

// ---------------------------------------------------------------------------
// Emulator bootstrap (mirrors seed-chat-emulator.ts)
// ---------------------------------------------------------------------------

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";

function parseEmulatorHost(input: string): { hostname: string; port: number } {
  const trimmed = input.trim().replace(/^https?:\/\//i, "").split("/")[0];
  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon === -1) return { hostname: trimmed, port: 8080 };
  const hostname = trimmed.slice(0, lastColon);
  const port = Number(trimmed.slice(lastColon + 1));
  return { hostname, port: Number.isInteger(port) ? port : 8080 };
}

const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
};

const app = initializeApp(firebaseConfig, "seed-quests");
const db = getFirestore(app);
const { hostname, port } = parseEmulatorHost(emulatorHost);
connectFirestoreEmulator(db, hostname, port);

console.log(`[seed-quests] Connected to emulator at ${hostname}:${port}`);

// ---------------------------------------------------------------------------
// Quest definitions — covers all trigger types for comprehensive testing
// ---------------------------------------------------------------------------

const quests = [
  // ── Chain 1: Welcome Tour → Faculty → Quiz ──────────────────────────────
  {
    id: "quest_welcome_tour",
    Title: "Welcome to Neumont!",
    smalldesc: "Get oriented by visiting key campus locations.",
    Reward: { Points: 100, Cosmetic: "" },
    Next: "quest_meet_the_faculty",
    objectives: [
      { id: "visit_dean_office",   type: "location", description: "Visit the Dean's Office",   zoneId: "dean_office" },
      { id: "visit_quiz_terminal", type: "location", description: "Find the Quiz Terminal",     zoneId: "quiz_terminal_area" },
      { id: "visit_campus_center", type: "location", description: "Stop by the Campus Center",  zoneId: "campus_center" },
    ],
  },
  {
    id: "quest_meet_the_faculty",
    Title: "Meet the Faculty",
    smalldesc: "Introduce yourself to key staff members on Floor 1.",
    Reward: { Points: 150, Cosmetic: "" },
    Next: "quest_quiz_champion",
    objectives: [
      { id: "talk_walsh",     type: "npc_talk", description: "Talk to Dean Walsh",        npcId: "dean_walsh" },
      { id: "talk_chen",      type: "npc_talk", description: "Talk to Dr. Sarah Chen",    npcId: "dr_chen" },
      { id: "talk_rodriguez", type: "npc_talk", description: "Talk to Prof. Rodriguez",   npcId: "prof_rodriguez" },
    ],
  },
  {
    id: "quest_quiz_champion",
    Title: "Quiz Champion",
    smalldesc: "Prove your knowledge: complete a quiz, build a streak, and earn 500 points.",
    Reward: { Points: 200, Cosmetic: "" },
    Next: "",
    objectives: [
      { id: "complete_quiz",   type: "quiz_complete",  description: "Complete 1 daily quiz",      requiredValue: 1 },
      { id: "quiz_streak_3",   type: "quiz_streak",    description: "Reach a 3-day quiz streak",   requiredValue: 3 },
      { id: "earn_500_points", type: "stat_threshold", description: "Earn 500 total quiz points",  requiredValue: 500 },
    ],
  },

  // ── SG1: Timed Quest ─────────────────────────────────────────────────────
  {
    id: "quest_timed_sprint",
    Title: "The Speed Run",
    smalldesc: "Visit three campus zones in under 5 minutes — the clock starts when you accept!",
    Reward: { Points: 300, Cosmetic: "" },
    Next: "",
    timeLimitMinutes: 5,
    objectives: [
      { id: "sprint_dean",     type: "location", description: "Rush to the Dean's Office",    zoneId: "dean_office" },
      { id: "sprint_advising", type: "location", description: "Sprint to the Advising Center", zoneId: "advising_center" },
      { id: "sprint_cs",       type: "location", description: "Dash to the CS Department",     zoneId: "cs_department" },
    ],
  },

  // ── SG4: Repeatable Daily Quest ──────────────────────────────────────────
  {
    id: "quest_daily_checkin",
    Title: "Daily Check-In",
    smalldesc: "Talk to Quest Master Rex once a day to keep your streak alive!",
    Reward: { Points: 50, Cosmetic: "" },
    Next: "",
    repeatable: true,
    resetCadence: "daily",
    objectives: [
      { id: "talk_quest_master", type: "npc_talk", description: "Talk to Quest Master Rex", npcId: "quest_master" },
    ],
  },

  // ── SG2: Quest Chain (Orientation Part 1 → Part 2) ───────────────────────
  {
    id: "quest_orientation_pt1",
    Title: "Orientation: Part 1",
    smalldesc: "Begin your official campus orientation — visit the Dean's Office and meet Dean Walsh.",
    Reward: { Points: 120, Cosmetic: "" },
    Next: "quest_orientation_pt2",
    objectives: [
      { id: "orient_dean_office", type: "location", description: "Visit the Dean's Office",         zoneId: "dean_office" },
      { id: "orient_talk_walsh",  type: "npc_talk", description: "Introduce yourself to Dean Walsh", npcId: "dean_walsh" },
    ],
  },
  {
    id: "quest_orientation_pt2",
    Title: "Orientation: Part 2",
    smalldesc: "Continue orientation — meet Dr. Chen and explore the CS Department.",
    Reward: { Points: 180, Cosmetic: "" },
    Next: "",
    objectives: [
      { id: "orient_advising",  type: "location", description: "Head to the Advising Center", zoneId: "advising_center" },
      { id: "orient_talk_chen", type: "npc_talk", description: "Talk to Dr. Sarah Chen",      npcId: "dr_chen" },
      { id: "orient_cs_dept",   type: "location", description: "Explore the CS Department",   zoneId: "cs_department" },
    ],
  },

  // ── SG5: Cosmetic Reward Quest ────────────────────────────────────────────
  {
    id: "quest_fashion_week",
    Title: "Fashion Week",
    smalldesc: "Complete a quiz and visit the CS Department to earn the Neumont Quest Hat!",
    Reward: { Points: 250, Cosmetic: "cosmetic_quest_hat", CosmeticId: "cosmetic_quest_hat" },
    Next: "",
    objectives: [
      { id: "fashion_quiz", type: "quiz_complete", description: "Complete any daily quiz",  requiredValue: 1 },
      { id: "fashion_cs",   type: "location",      description: "Visit the CS Department",  zoneId: "cs_department" },
    ],
  },

  // ── SG6: Hidden Quest ─────────────────────────────────────────────────────
  {
    id: "quest_secret_mission",
    Title: "The Hidden Vault",
    smalldesc: "Rumors speak of forgotten zones. Seek them and claim your reward.",
    Reward: { Points: 500, Cosmetic: "" },
    Next: "",
    hidden: true,
    objectives: [
      { id: "secret_advising", type: "location", description: "Find the hidden Advising passage", zoneId: "advising_center" },
      { id: "secret_campus",   type: "location", description: "Locate the secret campus hub",     zoneId: "campus_center" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cosmetic definitions
// ---------------------------------------------------------------------------

const cosmetics = [
  {
    id: "cosmetic_quest_hat",
    Name: "Neumont Quest Hat",
    Type: "Hat",
    ObjectCost: 0,
    description: "Awarded to adventurers who complete the Fashion Week quest.",
  },
];

// ---------------------------------------------------------------------------
// Dialogue tree: Quest Master Rex
// treeId is set only on the root node — FirestoreDialogueService queries by treeId.
// Paths keys = player response text, values = next Firestore document IDs.
// TriggeredQuest fires a quest:start action when the node is displayed.
// ---------------------------------------------------------------------------

const dialogueNodes = [
  {
    id: "qm-root",
    treeId: "quest-master-greeting",
    content: "Quest Master Rex: Greetings, adventurer! I have many challenges waiting. What quest calls to you?",
    TriggeredQuest: "",
    Paths: {
      "Take the Welcome Tour": "qm-give-tour",
      "I want a timed challenge!": "qm-give-timed",
      "Give me a daily check-in": "qm-give-daily",
      "Start the Orientation series": "qm-give-orientation",
      "I seek a fashion quest!": "qm-give-fashion",
      "I heard rumors of a secret...": "qm-give-secret",
      "Nothing today, goodbye": "qm-bye",
    },
  },
  {
    id: "qm-give-tour",
    treeId: "",
    content: "Quest Master Rex: The Welcome Tour covers the Dean's Office, the Quiz Terminal, and the Campus Center. Good luck!",
    TriggeredQuest: "quest_welcome_tour",
    Paths: { "I'm on it!": "qm-bye" },
  },
  {
    id: "qm-give-timed",
    treeId: "",
    content: "Quest Master Rex: The Speed Run — dash to Dean's Office, Advising Center, and CS Department in 5 minutes. GO!",
    TriggeredQuest: "quest_timed_sprint",
    Paths: { "Challenge accepted!": "qm-bye" },
  },
  {
    id: "qm-give-daily",
    treeId: "",
    content: "Quest Master Rex: Just come back and talk to me each day. Simple, but consistency builds character!",
    TriggeredQuest: "quest_daily_checkin",
    Paths: { "I'll see you tomorrow!": "qm-bye" },
  },
  {
    id: "qm-give-orientation",
    treeId: "",
    content: "Quest Master Rex: Orientation Part 1 starts at Dean Walsh's office. Finish it and Part 2 begins automatically!",
    TriggeredQuest: "quest_orientation_pt1",
    Paths: { "Let's do this!": "qm-bye" },
  },
  {
    id: "qm-give-fashion",
    treeId: "",
    content: "Quest Master Rex: Fashion Week! Pass a quiz and visit the CS Department to earn the Neumont Quest Hat!",
    TriggeredQuest: "quest_fashion_week",
    Paths: { "Style is my forte!": "qm-bye" },
  },
  {
    id: "qm-give-secret",
    treeId: "",
    content: "Quest Master Rex: ...You've heard the whispers. The Hidden Vault is real. Seek the Advising passage and the secret campus hub.",
    TriggeredQuest: "quest_secret_mission",
    Paths: { "My lips are sealed.": "qm-bye" },
  },
  {
    id: "qm-bye",
    treeId: "",
    content: "Quest Master Rex: May your quests be glorious! Return anytime, adventurer.",
    TriggeredQuest: "",
    Paths: {},
  },
];

// ---------------------------------------------------------------------------
// Seeding functions
// ---------------------------------------------------------------------------

async function seedQuests() {
  const questCol = collection(db, "Quest");
  for (const quest of quests) {
    const { id, ...data } = quest;
    await setDoc(doc(questCol, id), data);
    console.log(`[seed-quests] ✅ Quest: ${id} (${data.Title})`);
  }
}

async function seedCosmetics() {
  const cosmeticCol = collection(db, "Cosmetic");
  for (const cosmetic of cosmetics) {
    const { id, ...data } = cosmetic;
    await setDoc(doc(cosmeticCol, id), data);
    console.log(`[seed-quests] ✅ Cosmetic: ${id} (${data.Name})`);
  }
}

async function seedDialogues() {
  const dialogueCol = collection(db, "Dialogue");
  for (const node of dialogueNodes) {
    const { id, ...data } = node;
    await setDoc(doc(dialogueCol, id), data);
    console.log(`[seed-quests] ✅ Dialogue: ${id}`);
  }
}

async function seedPlayer() {
  const playerCol = collection(db, "Player");
  // Idempotency: skip if sarah_dev already exists
  const existing = await getDocs(
    query(playerCol, where("Username", "==", "sarah_dev"), limit(1))
  );
  if (!existing.empty) {
    console.log(`[seed-quests] ⚠️  Player sarah_dev already exists — skipping.`);
    return;
  }
  await setDoc(doc(playerCol, "player_sarah_dev"), {
    Username: "sarah_dev",
    RealName: "Sarah Martinez",
    Email: "smartinez@student.neumont.edu",
    Wallet: "2500",
    SkillTree: [],
    OwnedCosmetics: { Hat: [], Shirt: [], Pants: [], Shoes: [], Accessory: [] },
    PuzzleRecord: [],
    CompletedQuests: [],
    ActiveQuests: [],
    QuestProgress: {},
    revealedQuests: [],
  });
  console.log(`[seed-quests] ✅ Player sarah_dev created (doc ID: player_sarah_dev)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log("\n🎯 Seeding Quests...");
  await seedQuests();

  console.log("\n🎨 Seeding Cosmetics...");
  await seedCosmetics();

  console.log("\n💬 Seeding Quest Master Rex Dialogue...");
  await seedDialogues();

  console.log("\n👤 Seeding Player (sarah_dev)...");
  await seedPlayer();

  console.log(
    `\n[seed-quests] ✅ Done — ${quests.length} quests, ${cosmetics.length} cosmetic, ` +
    `${dialogueNodes.length} dialogue nodes.`
  );
}

seed().catch((err) => {
  console.error("[seed-quests] ❌ Fatal error:", err);
  process.exit(1);
});


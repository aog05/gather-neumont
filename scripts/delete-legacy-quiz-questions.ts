import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { COLLECTIONS, db } from "../src/lib/firebase";

type ParsedArgs = {
  apply: boolean;
};

function printUsage(): void {
  console.log(
    "Usage: bun run scripts/delete-legacy-quiz-questions.ts [--dry-run] [--apply]"
  );
  console.log("Default mode is --dry-run");
}

function parseArgs(argv: string[]): ParsedArgs | null {
  let apply = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      return null;
    }
    if (arg === "--dry-run") {
      apply = false;
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    throw new Error(`Unknown flag: ${arg}`);
  }

  return { apply };
}

async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));
  if (!parsedArgs) return;

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.PUZZLE), where("Type", "==", "Quiz"))
  );

  const targetIds = snapshot.docs.map((docSnap) => docSnap.id).sort();
  const summary = {
    mode: parsedArgs.apply ? "apply" : "dry-run",
    collection: COLLECTIONS.PUZZLE,
    targetType: "Quiz",
    count: targetIds.length,
    sampleIds: targetIds.slice(0, 10),
  };

  if (!parsedArgs.apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  let deleted = 0;
  for (const targetId of targetIds) {
    await deleteDoc(doc(db, COLLECTIONS.PUZZLE, targetId));
    deleted += 1;
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        deleted,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[delete-legacy-quiz] Failed:", error);
  process.exit(1);
});

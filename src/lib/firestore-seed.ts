/**
 * Firebase Firestore Database Seeding System
 * 
 * This script populates the Firestore database with realistic test data
 * for the Neumont Virtual Campus Web App.
 * 
 * Usage:
 *   bun run src/lib/firestore-seed.ts           # Normal seeding
 *   bun run src/lib/firestore-seed.ts --dry-run # Preview without writing
 *   bun run src/lib/firestore-seed.ts --clear   # Clear existing data first
 */

import { collection, addDoc, setDoc, doc, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import type {
  Cosmetic,
  SkillTreeItem,
  Puzzle,
  Quest,
  Dialogue,
  NPC,
  Player,
  PuzzleDay,
} from "../types/firestore.types";

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const shouldClear = args.includes("--clear");

// Store created document IDs for referential integrity
const createdIds = {
  cosmetics: [] as string[],
  skills: [] as string[],
  puzzles: [] as string[],
  quests: [] as string[],
  dialogues: [] as string[],
  npcs: [] as string[],
  players: [] as string[],
  puzzleWeeks: [] as string[],
};

// Statistics tracking
const stats = {
  cosmetics: 0,
  skills: 0,
  puzzles: 0,
  quests: 0,
  dialogues: 0,
  npcs: 0,
  players: 0,
  puzzleWeeks: 0, // Now counts PuzzleDay documents in PuzzleWeeks collection
};

/**
 * Prompt user for confirmation
 */
async function confirmSeeding(): Promise<boolean> {
  if (isDryRun) {
    console.log("\n🔍 DRY RUN MODE - No data will be written to the database\n");
    return true;
  }

  console.log("\n⚠️  WARNING: This will add test data to your Firestore database.");
  if (shouldClear) {
    console.log("⚠️  The --clear flag will DELETE all existing data first!");
  }
  console.log("\nPress Ctrl+C to cancel, or press Enter to continue...");

  // Wait for user input
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  return true;
}

/**
 * Clear all existing data from collections
 */
async function clearExistingData() {
  console.log("\n🗑️  Clearing existing data...");

  const collectionsToClean = [
    COLLECTIONS.PLAYER,
    COLLECTIONS.NPC,
    COLLECTIONS.DIALOGUE,
    COLLECTIONS.QUEST,
    COLLECTIONS.PUZZLE,
    COLLECTIONS.SKILL_TREE_ITEMS,
    COLLECTIONS.COSMETIC,
    COLLECTIONS.PUZZLE_WEEK,
  ];

  for (const collectionName of collectionsToClean) {
    const snapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
      count++;
    });

    if (count > 0) {
      await batch.commit();
      console.log(`   ✅ Deleted ${count} documents from ${collectionName}`);
    }
  }

  console.log("✅ Data cleared successfully\n");
}

/**
 * Add a document to Firestore (or simulate in dry-run mode)
 */
async function addDocument<T>(
  collectionName: string,
  data: Omit<T, "id">,
  customId?: string
): Promise<string> {
  if (isDryRun) {
    const fakeId = `dry_run_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`   [DRY RUN] Would create document in ${collectionName}:`, customId || fakeId);
    return fakeId;
  }

  try {
    if (customId) {
      await setDoc(doc(db, collectionName, customId), data);
      return customId;
    } else {
      const docRef = await addDoc(collection(db, collectionName), data);
      return docRef.id;
    }
  } catch (error) {
    console.error(`❌ Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Add a document to a subcollection
 */
async function addSubcollectionDocument<T>(
  parentCollection: string,
  parentDocId: string,
  subcollection: string,
  data: Omit<T, "id">
): Promise<string> {
  if (isDryRun) {
    const fakeId = `dry_run_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`   [DRY RUN] Would create subcollection document in ${parentCollection}/${parentDocId}/${subcollection}`);
    return fakeId;
  }

  try {
    const docRef = await addDoc(
      collection(db, parentCollection, parentDocId, subcollection),
      data
    );
    return docRef.id;
  } catch (error) {
    console.error(`❌ Error adding subcollection document:`, error);
    throw error;
  }
}

/**
 * Seed Cosmetic collection (50 items)
 */
async function seedCosmetics() {
  const cosmetics: Array<Omit<Cosmetic, "id">> = [
    // Hats (10)
    { Name: "Classic Baseball Cap", Type: "hat", shortdesc: "A timeless red baseball cap", SpritePath: "assets/cosmetics/hats/baseball_cap.png", ObjectCost: 0 },
    { Name: "Neumont Beanie", Type: "hat", shortdesc: "Official Neumont winter beanie", SpritePath: "assets/cosmetics/hats/beanie.png", ObjectCost: 500 },
    { Name: "Wizard Hat", Type: "hat", shortdesc: "For the coding wizards", SpritePath: "assets/cosmetics/hats/wizard_hat.png", ObjectCost: 1200 },
    { Name: "Top Hat", Type: "hat", shortdesc: "Classy formal top hat", SpritePath: "assets/cosmetics/hats/top_hat.png", ObjectCost: 2000 },
    { Name: "Gamer Headset", Type: "hat", shortdesc: "RGB gaming headset", SpritePath: "assets/cosmetics/hats/headset.png", ObjectCost: 1500 },
    { Name: "Graduation Cap", Type: "hat", shortdesc: "You earned it!", SpritePath: "assets/cosmetics/hats/grad_cap.png", ObjectCost: 5000 },
    { Name: "Cowboy Hat", Type: "hat", shortdesc: "Yeehaw, partner!", SpritePath: "assets/cosmetics/hats/cowboy_hat.png", ObjectCost: 800 },
    { Name: "Propeller Beanie", Type: "hat", shortdesc: "Nerdy and proud", SpritePath: "assets/cosmetics/hats/propeller.png", ObjectCost: 600 },
    { Name: "Crown", Type: "hat", shortdesc: "For leaderboard royalty", SpritePath: "assets/cosmetics/hats/crown.png", ObjectCost: 3500 },
    { Name: "Backwards Cap", Type: "hat", shortdesc: "Cool kid vibes", SpritePath: "assets/cosmetics/hats/backwards_cap.png", ObjectCost: 300 },

    // Shirts (10)
    { Name: "Plain White Tee", Type: "shirt", shortdesc: "Simple and clean", SpritePath: "assets/cosmetics/shirts/white_tee.png", ObjectCost: 0 },
    { Name: "Neumont Hoodie", Type: "shirt", shortdesc: "Official Neumont hoodie", SpritePath: "assets/cosmetics/shirts/neumont_hoodie.png", ObjectCost: 1000 },
    { Name: "Code Ninja Shirt", Type: "shirt", shortdesc: "I code in the shadows", SpritePath: "assets/cosmetics/shirts/ninja_shirt.png", ObjectCost: 750 },
    { Name: "Formal Suit Jacket", Type: "shirt", shortdesc: "Business professional", SpritePath: "assets/cosmetics/shirts/suit_jacket.png", ObjectCost: 2500 },
    { Name: "Hackathon Tee", Type: "shirt", shortdesc: "Survived 48 hours of coding", SpritePath: "assets/cosmetics/shirts/hackathon_tee.png", ObjectCost: 600 },
    { Name: "Pixel Art Sweater", Type: "shirt", shortdesc: "8-bit style sweater", SpritePath: "assets/cosmetics/shirts/pixel_sweater.png", ObjectCost: 1200 },
    { Name: "Flannel Shirt", Type: "shirt", shortdesc: "Casual developer style", SpritePath: "assets/cosmetics/shirts/flannel.png", ObjectCost: 400 },
    { Name: "Binary Code Hoodie", Type: "shirt", shortdesc: "01001000 01101001", SpritePath: "assets/cosmetics/shirts/binary_hoodie.png", ObjectCost: 900 },
    { Name: "Tuxedo Shirt", Type: "shirt", shortdesc: "Fancy formal wear", SpritePath: "assets/cosmetics/shirts/tuxedo.png", ObjectCost: 3000 },
    { Name: "Team Jersey", Type: "shirt", shortdesc: "Esports team jersey", SpritePath: "assets/cosmetics/shirts/jersey.png", ObjectCost: 1500 },

    // Pants (10)
    { Name: "Blue Jeans", Type: "pants", shortdesc: "Classic denim jeans", SpritePath: "assets/cosmetics/pants/jeans.png", ObjectCost: 0 },
    { Name: "Cargo Pants", Type: "pants", shortdesc: "Lots of pockets for gadgets", SpritePath: "assets/cosmetics/pants/cargo.png", ObjectCost: 500 },
    { Name: "Dress Slacks", Type: "pants", shortdesc: "Professional dress pants", SpritePath: "assets/cosmetics/pants/slacks.png", ObjectCost: 1200 },
    { Name: "Sweatpants", Type: "pants", shortdesc: "Maximum comfort", SpritePath: "assets/cosmetics/pants/sweatpants.png", ObjectCost: 300 },
    { Name: "Khakis", Type: "pants", shortdesc: "Business casual", SpritePath: "assets/cosmetics/pants/khakis.png", ObjectCost: 600 },
    { Name: "Ripped Jeans", Type: "pants", shortdesc: "Edgy distressed denim", SpritePath: "assets/cosmetics/pants/ripped_jeans.png", ObjectCost: 800 },
    { Name: "Track Pants", Type: "pants", shortdesc: "Athletic wear", SpritePath: "assets/cosmetics/pants/track_pants.png", ObjectCost: 450 },
    { Name: "Tuxedo Pants", Type: "pants", shortdesc: "Formal event ready", SpritePath: "assets/cosmetics/pants/tuxedo_pants.png", ObjectCost: 2000 },
    { Name: "Shorts", Type: "pants", shortdesc: "Casual summer shorts", SpritePath: "assets/cosmetics/pants/shorts.png", ObjectCost: 250 },
    { Name: "Leather Pants", Type: "pants", shortdesc: "Rockstar style", SpritePath: "assets/cosmetics/pants/leather.png", ObjectCost: 1800 },

    // Shoes (10)
    { Name: "Sneakers", Type: "shoes", shortdesc: "Comfortable everyday sneakers", SpritePath: "assets/cosmetics/shoes/sneakers.png", ObjectCost: 0 },
    { Name: "High Tops", Type: "shoes", shortdesc: "Classic high-top sneakers", SpritePath: "assets/cosmetics/shoes/high_tops.png", ObjectCost: 700 },
    { Name: "Dress Shoes", Type: "shoes", shortdesc: "Polished formal shoes", SpritePath: "assets/cosmetics/shoes/dress_shoes.png", ObjectCost: 1500 },
    { Name: "Boots", Type: "shoes", shortdesc: "Sturdy leather boots", SpritePath: "assets/cosmetics/shoes/boots.png", ObjectCost: 1000 },
    { Name: "Sandals", Type: "shoes", shortdesc: "Casual flip-flops", SpritePath: "assets/cosmetics/shoes/sandals.png", ObjectCost: 200 },
    { Name: "Running Shoes", Type: "shoes", shortdesc: "Athletic running shoes", SpritePath: "assets/cosmetics/shoes/running.png", ObjectCost: 900 },
    { Name: "Loafers", Type: "shoes", shortdesc: "Slip-on loafers", SpritePath: "assets/cosmetics/shoes/loafers.png", ObjectCost: 800 },
    { Name: "LED Sneakers", Type: "shoes", shortdesc: "Light-up RGB shoes", SpritePath: "assets/cosmetics/shoes/led_sneakers.png", ObjectCost: 2500 },
    { Name: "Slippers", Type: "shoes", shortdesc: "Cozy house slippers", SpritePath: "assets/cosmetics/shoes/slippers.png", ObjectCost: 300 },
    { Name: "Wingtips", Type: "shoes", shortdesc: "Classic wingtip oxfords", SpritePath: "assets/cosmetics/shoes/wingtips.png", ObjectCost: 1800 },

    // Accessories (10)
    { Name: "Glasses", Type: "accessory", shortdesc: "Stylish eyeglasses", SpritePath: "assets/cosmetics/accessories/glasses.png", ObjectCost: 0 },
    { Name: "Sunglasses", Type: "accessory", shortdesc: "Cool shades", SpritePath: "assets/cosmetics/accessories/sunglasses.png", ObjectCost: 500 },
    { Name: "Backpack", Type: "accessory", shortdesc: "Laptop backpack", SpritePath: "assets/cosmetics/accessories/backpack.png", ObjectCost: 800 },
    { Name: "Smartwatch", Type: "accessory", shortdesc: "High-tech wearable", SpritePath: "assets/cosmetics/accessories/smartwatch.png", ObjectCost: 2000 },
    { Name: "Scarf", Type: "accessory", shortdesc: "Warm winter scarf", SpritePath: "assets/cosmetics/accessories/scarf.png", ObjectCost: 400 },
    { Name: "Bow Tie", Type: "accessory", shortdesc: "Classy bow tie", SpritePath: "assets/cosmetics/accessories/bow_tie.png", ObjectCost: 600 },
    { Name: "Messenger Bag", Type: "accessory", shortdesc: "Professional messenger bag", SpritePath: "assets/cosmetics/accessories/messenger_bag.png", ObjectCost: 1200 },
    { Name: "Lanyard", Type: "accessory", shortdesc: "Neumont ID lanyard", SpritePath: "assets/cosmetics/accessories/lanyard.png", ObjectCost: 100 },
    { Name: "Wristband", Type: "accessory", shortdesc: "Silicon wristband", SpritePath: "assets/cosmetics/accessories/wristband.png", ObjectCost: 150 },
    { Name: "VR Headset", Type: "accessory", shortdesc: "Virtual reality headset", SpritePath: "assets/cosmetics/accessories/vr_headset.png", ObjectCost: 4500 },
  ];

  for (const cosmetic of cosmetics) {
    const id = await addDocument<Cosmetic>(COLLECTIONS.COSMETIC, cosmetic);
    createdIds.cosmetics.push(id);
    stats.cosmetics++;
  }

  console.log(`   ✅ Created ${stats.cosmetics} cosmetics`);
}

/**
 * Seed SkillTreeItems collection (20 items)
 */
async function seedSkillTreeItems() {
  const skills: Array<Omit<SkillTreeItem, "id">> = [
    // Technical Skills
    { Name: "JavaScript", Description: "Proficient in modern JavaScript ES6+ including async/await, promises, and functional programming patterns. Built multiple web applications using vanilla JS and frameworks.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "Python", Description: "Strong foundation in Python for data analysis, scripting, and backend development. Experience with Django and Flask frameworks for web applications.", Proficiency: "Intermediate", Source: "Neumont Course" },
    { Name: "Database Design", Description: "Skilled in relational database design, normalization, and SQL query optimization. Experience with PostgreSQL, MySQL, and NoSQL databases like MongoDB.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "React", Description: "Built several single-page applications using React with hooks, context API, and state management libraries like Redux. Familiar with component lifecycle and optimization.", Proficiency: "Intermediate", Source: "Self-Taught" },
    { Name: "Git Version Control", Description: "Daily use of Git for version control including branching strategies, merge conflict resolution, and collaborative workflows using GitHub and GitLab.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "Algorithms & Data Structures", Description: "Strong understanding of common algorithms (sorting, searching, graph traversal) and data structures (trees, hash tables, linked lists). Can analyze time/space complexity.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "Cloud Computing", Description: "Experience deploying applications to AWS and Azure. Familiar with cloud services like EC2, S3, Lambda functions, and containerization with Docker.", Proficiency: "Beginner", Source: "Previous Work" },
    { Name: "Cybersecurity Fundamentals", Description: "Understanding of common security vulnerabilities (SQL injection, XSS, CSRF) and best practices for secure coding. Completed security awareness training.", Proficiency: "Intermediate", Source: "Neumont Course" },
    { Name: "Machine Learning Basics", Description: "Introductory knowledge of ML concepts including supervised/unsupervised learning, neural networks, and common libraries like TensorFlow and scikit-learn.", Proficiency: "Beginner", Source: "Self-Taught" },
    { Name: "Mobile Development", Description: "Built cross-platform mobile apps using React Native. Understanding of mobile UI/UX patterns and platform-specific considerations for iOS and Android.", Proficiency: "Intermediate", Source: "Previous Work" },
    { Name: "API Development", Description: "Designed and implemented RESTful APIs using Node.js/Express and FastAPI. Experience with API documentation, versioning, and authentication strategies.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "TypeScript", Description: "Strong typing skills in TypeScript for large-scale applications. Experience with interfaces, generics, and advanced type features for better code quality.", Proficiency: "Intermediate", Source: "Self-Taught" },
    { Name: "DevOps Practices", Description: "Familiar with CI/CD pipelines, automated testing, and deployment workflows. Experience with Jenkins, GitHub Actions, and infrastructure as code.", Proficiency: "Beginner", Source: "Other" },
    { Name: "UI/UX Design", Description: "Understanding of design principles, user research, and prototyping tools like Figma. Can create wireframes and mockups for web and mobile applications.", Proficiency: "Intermediate", Source: "Self-Taught" },
    { Name: "Agile Methodologies", Description: "Participated in Scrum teams with sprint planning, daily standups, and retrospectives. Familiar with Jira, user stories, and iterative development.", Proficiency: "Advanced", Source: "Neumont Course" },

    // Soft Skills
    { Name: "Team Collaboration", Description: "Worked effectively in diverse teams on multiple group projects. Strong communication skills and ability to coordinate with team members to achieve common goals.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "Public Speaking", Description: "Delivered technical presentations to classmates and faculty. Comfortable presenting complex technical concepts to both technical and non-technical audiences.", Proficiency: "Intermediate", Source: "Neumont Course" },
    { Name: "Project Management", Description: "Led team projects from planning to delivery. Experience with task delegation, timeline management, and stakeholder communication using tools like Trello and Asana.", Proficiency: "Intermediate", Source: "Previous Work" },
    { Name: "Technical Writing", Description: "Created comprehensive documentation for code projects including README files, API documentation, and user guides. Clear and concise writing style.", Proficiency: "Advanced", Source: "Neumont Course" },
    { Name: "Problem Solving", Description: "Strong analytical and critical thinking skills. Able to break down complex problems into manageable components and develop creative solutions under pressure.", Proficiency: "Expert", Source: "Neumont Course" },
  ];

  for (const skill of skills) {
    const id = await addDocument<SkillTreeItem>(COLLECTIONS.SKILL_TREE_ITEMS, skill);
    createdIds.skills.push(id);
    stats.skills++;
  }

  console.log(`   ✅ Created ${stats.skills} skill tree items`);
}

/**
 * Seed Puzzle collection (5 puzzles)
 */
async function seedPuzzles() {
  const puzzles: Array<Omit<Puzzle, "id">> = [
    // Code puzzles - use real code snippets
    {
      Name: "Fix the Memory Leak",
      Topic: "JavaScript",
      Type: "Code",
      solution: `useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);`,
      Attempts: 3,
      Reward: 750,
      conditions: [
        `useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);`,
        "Add cleanup function to remove event listener",
        "Prevent memory leak on component unmount"
      ]
    },
    {
      Name: "Implement Binary Search",
      Topic: "Algorithms",
      Type: "Code",
      solution: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
      Attempts: 3,
      Reward: 800,
      conditions: [
        `function binarySearch(arr, target) {
  // TODO: Implement binary search
  // Must be O(log n) time complexity
}`,
        "Return index if found, -1 if not found",
        "Handle empty arrays and edge cases"
      ]
    },

    // Quiz puzzles - use Questions array format
    {
      Name: "CS Fundamentals Quiz",
      Topic: "Computer Science",
      Type: "Quiz",
      Threshold: 0.7,
      Reward: 400,
      Questions: [
        {
          SV: 10,
          type: "one-select",
          answer: "O(n log n) average case",
          other: [
            "O(n²) always",
            "O(n) best case",
            "O(log n) always"
          ]
        },
        {
          SV: 10,
          type: "one-select",
          answer: "Stack",
          other: [
            "Queue",
            "Heap",
            "Tree"
          ]
        },
        {
          SV: 10,
          type: "multiple-choice",
          answers: [
            "HyperText",
            "Transfer",
            "Protocol"
          ],
          other: [
            "Hyperlink",
            "Transmission",
            "Process"
          ]
        }
      ]
    },
    {
      Name: "Database Design Quiz",
      Topic: "Databases",
      Type: "Quiz",
      Threshold: 0.75,
      Reward: 500,
      Questions: [
        {
          SV: 15,
          type: "one-select",
          answer: "Organizing data to reduce redundancy",
          other: [
            "Making database faster",
            "Adding more tables",
            "Encrypting data"
          ]
        },
        {
          SV: 15,
          type: "multiple-choice",
          answers: [
            "References primary key",
            "In another table",
            "Maintains referential integrity"
          ],
          other: [
            "Stores passwords",
            "Encrypts data",
            "Speeds up queries"
          ]
        },
        {
          SV: 10,
          type: "one-select",
          answer: "Speed up data retrieval",
          other: [
            "Store more data",
            "Encrypt information",
            "Delete duplicates"
          ]
        }
      ]
    },
    {
      Name: "Web Security Challenge",
      Topic: "Cybersecurity",
      Type: "Quiz",
      Threshold: 0.8,
      Reward: 450,
      Questions: [
        {
          SV: 20,
          type: "multiple-choice",
          answers: [
            "Use parameterized queries",
            "Validate user input",
            "Use prepared statements"
          ],
          other: [
            "Use string concatenation",
            "Trust user input",
            "Disable error messages"
          ]
        },
        {
          SV: 15,
          type: "one-select",
          answer: "Cross-Site Scripting attack",
          other: [
            "Extra Secure System",
            "XML Security Standard",
            "Cross-Server Synchronization"
          ]
        },
        {
          SV: 15,
          type: "one-select",
          answer: "Hash with salt using bcrypt",
          other: [
            "Store in plain text",
            "Use MD5 hash",
            "Encrypt with AES only"
          ]
        }
      ]
    },
  ];

  for (const puzzle of puzzles) {
    const id = await addDocument<Puzzle>(COLLECTIONS.PUZZLE, puzzle);
    createdIds.puzzles.push(id);
    stats.puzzles++;
  }

  console.log(`   ✅ Created ${stats.puzzles} puzzles`);
}

/**
 * Seed Quest collection (15 quests in chains)
 */
async function seedQuests() {
  // We'll create quests in reverse order so we can reference Next quest IDs
  const questData: Array<{ quest: Omit<Quest, "id">; chainPosition: string }> = [];

  // 5-Quest Chain: Campus Orientation
  questData.push(
    { quest: { Title: "Campus Tour Complete!", smalldesc: "You've explored every corner of the Neumont campus. Welcome home!", Reward: { Points: 1500, Cosmetic: createdIds.cosmetics[5] }, Next: "" }, chainPosition: "orientation-5" },
    { quest: { Title: "Visit the Library", smalldesc: "Check out the learning resources available in the Neumont library", Reward: { Points: 600, Cosmetic: "" }, Next: "PLACEHOLDER_orientation-5" }, chainPosition: "orientation-4" },
    { quest: { Title: "Find the Computer Labs", smalldesc: "Locate the main computer labs where you'll spend lots of time coding", Reward: { Points: 500, Cosmetic: "" }, Next: "PLACEHOLDER_orientation-4" }, chainPosition: "orientation-3" },
    { quest: { Title: "Meet Your Advisor", smalldesc: "Introduce yourself to your academic advisor in their office", Reward: { Points: 300, Cosmetic: "" }, Next: "PLACEHOLDER_orientation-3" }, chainPosition: "orientation-2" },
    { quest: { Title: "Welcome to Neumont!", smalldesc: "Start your journey by checking in at the main office", Reward: { Points: 150, Cosmetic: "" }, Next: "PLACEHOLDER_orientation-2" }, chainPosition: "orientation-1" }
  );

  // 4-Quest Chain: Meet the Faculty
  questData.push(
    { quest: { Title: "Faculty Network Complete", smalldesc: "You've connected with key faculty members. They're here to help you succeed!", Reward: { Points: 1200, Cosmetic: createdIds.cosmetics[15] }, Next: "" }, chainPosition: "faculty-4" },
    { quest: { Title: "Attend Office Hours", smalldesc: "Visit a professor during their office hours to ask questions", Reward: { Points: 700, Cosmetic: "" }, Next: "PLACEHOLDER_faculty-4" }, chainPosition: "faculty-3" },
    { quest: { Title: "Meet the Department Chair", smalldesc: "Introduce yourself to the Computer Science department chair", Reward: { Points: 400, Cosmetic: "" }, Next: "PLACEHOLDER_faculty-3" }, chainPosition: "faculty-2" },
    { quest: { Title: "Introduce Yourself", smalldesc: "Say hello to three different professors in the CS department", Reward: { Points: 200, Cosmetic: "" }, Next: "PLACEHOLDER_faculty-2" }, chainPosition: "faculty-1" }
  );

  // 3-Quest Chain: Join a Club
  questData.push(
    { quest: { Title: "Club Leader", smalldesc: "You're now an active member of the Neumont community!", Reward: { Points: 1000, Cosmetic: createdIds.cosmetics[25] }, Next: "" }, chainPosition: "club-3" },
    { quest: { Title: "Attend a Club Meeting", smalldesc: "Participate in your first club meeting or event", Reward: { Points: 500, Cosmetic: "" }, Next: "PLACEHOLDER_club-3" }, chainPosition: "club-2" },
    { quest: { Title: "Explore Student Organizations", smalldesc: "Check out the different clubs and organizations available", Reward: { Points: 250, Cosmetic: "" }, Next: "PLACEHOLDER_club-2" }, chainPosition: "club-1" }
  );

  // 4 Standalone Quests
  questData.push(
    { quest: { Title: "Complete Your Profile", smalldesc: "Fill out your student profile with your skills and interests", Reward: { Points: 300, Cosmetic: createdIds.cosmetics[35] }, Next: "" }, chainPosition: "standalone-1" },
    { quest: { Title: "First Puzzle Solved", smalldesc: "Solve your first daily coding puzzle to earn points", Reward: { Points: 500, Cosmetic: createdIds.cosmetics[45] }, Next: "" }, chainPosition: "standalone-2" },
    { quest: { Title: "Customize Your Avatar", smalldesc: "Purchase and equip your first cosmetic item", Reward: { Points: 200, Cosmetic: "" }, Next: "" }, chainPosition: "standalone-3" },
    { quest: { Title: "Explore Neumont", smalldesc: "Take a tour of the Neumont campus and discover all the different areas", Reward: { Points: 150, Cosmetic: "" }, Next: "" }, chainPosition: "standalone-4" }
  );

  // Create quests and track IDs for chain linking
  const questIdMap: Record<string, string> = {};

  for (const { quest, chainPosition } of questData) {
    const id = await addDocument<Quest>(COLLECTIONS.QUEST, quest);
    questIdMap[chainPosition] = id;
    createdIds.quests.push(id);
    stats.quests++;
  }

  // Now update the Next references with actual IDs
  if (!isDryRun) {
    const { updateDoc, doc } = await import("firebase/firestore");

    // Update orientation chain
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["orientation-1"]), { Next: questIdMap["orientation-2"] });
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["orientation-2"]), { Next: questIdMap["orientation-3"] });
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["orientation-3"]), { Next: questIdMap["orientation-4"] });
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["orientation-4"]), { Next: questIdMap["orientation-5"] });

    // Update faculty chain
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["faculty-1"]), { Next: questIdMap["faculty-2"] });
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["faculty-2"]), { Next: questIdMap["faculty-3"] });
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["faculty-3"]), { Next: questIdMap["faculty-4"] });

    // Update club chain
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["club-1"]), { Next: questIdMap["club-2"] });
    await updateDoc(doc(db, COLLECTIONS.QUEST, questIdMap["club-2"]), { Next: questIdMap["club-3"] });
  }

  console.log(`   ✅ Created ${stats.quests} quests (3 chains + 4 standalone)`);
}

/**
 * Seed Dialogue collection (30 nodes forming 3 trees)
 */
async function seedDialogues() {
  // We'll create 3 dialogue trees, one for each NPC
  // Tree 1: Dr. Sarah Chen (Academic Advisor) - 10 nodes
  // Tree 2: Professor Mike Rodriguez (CS Professor) - 10 nodes
  // Tree 3: Dean Jennifer Walsh (Dean of Students) - 10 nodes

  const dialogueData: Array<{ dialogue: Omit<Dialogue, "id">; treeId: string }> = [];

  // Tree 1: Dr. Sarah Chen (Academic Advisor)
  dialogueData.push(
    { dialogue: { content: "Welcome! I'm Dr. Chen, your academic advisor. How can I help you today?", Paths: { "Tell me about courses": "PLACEHOLDER_chen-courses", "I need career advice": "PLACEHOLDER_chen-career", "Just saying hi": "PLACEHOLDER_chen-casual" }, TriggeredQuest: "" }, treeId: "chen-greeting" },
    { dialogue: { content: "Great question! We offer a wide range of CS courses. Are you interested in web development, data science, or cybersecurity?", Paths: { "Web development": "PLACEHOLDER_chen-web", "Data science": "PLACEHOLDER_chen-data", "Cybersecurity": "PLACEHOLDER_chen-security" }, TriggeredQuest: "" }, treeId: "chen-courses" },
    { dialogue: { content: "Web development is very popular! I recommend starting with our JavaScript and React courses. Would you like me to help you register?", Paths: { "Yes, please!": "PLACEHOLDER_chen-register", "I'll think about it": "PLACEHOLDER_chen-end" }, TriggeredQuest: createdIds.quests[0] }, treeId: "chen-web" },
    { dialogue: { content: "Data science is an exciting field! You'll need a strong foundation in Python and statistics. Let's plan your course path.", Paths: { "Sounds good": "PLACEHOLDER_chen-end", "What about prerequisites?": "PLACEHOLDER_chen-prereq" }, TriggeredQuest: "" }, treeId: "chen-data" },
    { dialogue: { content: "Cybersecurity is crucial in today's world. We have excellent courses on network security and ethical hacking.", Paths: { "Tell me more": "PLACEHOLDER_chen-end", "I'm interested!": "PLACEHOLDER_chen-register" }, TriggeredQuest: "" }, treeId: "chen-security" },
    { dialogue: { content: "Career planning is important! What year are you in, and what are your career goals?", Paths: { "I'm a freshman": "PLACEHOLDER_chen-freshman", "I'm looking for internships": "PLACEHOLDER_chen-internship" }, TriggeredQuest: "" }, treeId: "chen-career" },
    { dialogue: { content: "As a freshman, focus on building strong fundamentals. Join coding clubs and work on personal projects!", Paths: { "Thanks for the advice!": "PLACEHOLDER_chen-end" }, TriggeredQuest: createdIds.quests[1] }, treeId: "chen-freshman" },
    { dialogue: { content: "Internships are great! Check our career services portal and attend the upcoming career fair. I can help you prepare your resume.", Paths: { "That would be helpful": "PLACEHOLDER_chen-end" }, TriggeredQuest: "" }, treeId: "chen-internship" },
    { dialogue: { content: "Hello! It's always nice to see students. Feel free to stop by my office anytime you need help.", Paths: { "Will do, thanks!": "PLACEHOLDER_chen-end" }, TriggeredQuest: "" }, treeId: "chen-casual" },
    { dialogue: { content: "Great! Feel free to come back anytime you have questions. Good luck with your studies!", Paths: {}, TriggeredQuest: "" }, treeId: "chen-end" }
  );

  // Tree 2: Professor Mike Rodriguez (CS Professor)
  dialogueData.push(
    { dialogue: { content: "Hey there! I'm Professor Rodriguez. I teach algorithms and data structures. What brings you here?", Paths: { "I have a question about class": "PLACEHOLDER_rodriguez-class", "Tell me about your research": "PLACEHOLDER_rodriguez-research", "Just exploring": "PLACEHOLDER_rodriguez-explore" }, TriggeredQuest: "" }, treeId: "rodriguez-greeting" },
    { dialogue: { content: "Sure! Which topic are you struggling with? Binary trees, sorting algorithms, or graph theory?", Paths: { "Binary trees": "PLACEHOLDER_rodriguez-trees", "Sorting algorithms": "PLACEHOLDER_rodriguez-sorting", "Graph theory": "PLACEHOLDER_rodriguez-graphs" }, TriggeredQuest: "" }, treeId: "rodriguez-class" },
    { dialogue: { content: "Binary trees can be tricky! The key is understanding recursion. Have you tried visualizing the tree structure?", Paths: { "Not yet": "PLACEHOLDER_rodriguez-help", "Yes, still confused": "PLACEHOLDER_rodriguez-office" }, TriggeredQuest: "" }, treeId: "rodriguez-trees" },
    { dialogue: { content: "Sorting algorithms are fundamental! Start with bubble sort and merge sort. Understanding their time complexity is crucial.", Paths: { "Can you explain Big O?": "PLACEHOLDER_rodriguez-bigo", "I'll practice more": "PLACEHOLDER_rodriguez-end" }, TriggeredQuest: createdIds.quests[2] }, treeId: "rodriguez-sorting" },
    { dialogue: { content: "Graph theory is fascinating! We use it in everything from social networks to GPS navigation. Are you working on a specific problem?", Paths: { "Yes, shortest path": "PLACEHOLDER_rodriguez-dijkstra", "Just learning": "PLACEHOLDER_rodriguez-end" }, TriggeredQuest: "" }, treeId: "rodriguez-graphs" },
    { dialogue: { content: "I'm researching machine learning applications in code optimization. It's cutting-edge stuff! Interested in joining my research group?", Paths: { "Absolutely!": "PLACEHOLDER_rodriguez-join", "Maybe later": "PLACEHOLDER_rodriguez-end" }, TriggeredQuest: createdIds.quests[3] }, treeId: "rodriguez-research" },
    { dialogue: { content: "Excellent! I'll send you the details. We meet every Thursday evening. Looking forward to working with you!", Paths: { "Thanks, Professor!": "PLACEHOLDER_rodriguez-end" }, TriggeredQuest: "" }, treeId: "rodriguez-join" },
    { dialogue: { content: "No problem! Exploration is how we learn. Check out the computer labs and don't hesitate to ask questions.", Paths: { "Will do!": "PLACEHOLDER_rodriguez-end" }, TriggeredQuest: "" }, treeId: "rodriguez-explore" },
    { dialogue: { content: "Come to my office hours tomorrow at 2 PM. I'll walk you through it step by step.", Paths: { "See you then!": "PLACEHOLDER_rodriguez-end" }, TriggeredQuest: createdIds.quests[4] }, treeId: "rodriguez-office" },
    { dialogue: { content: "Keep up the good work! Remember, practice makes perfect. See you in class!", Paths: {}, TriggeredQuest: "" }, treeId: "rodriguez-end" }
  );

  // Tree 3: Dean Jennifer Walsh (Dean of Students)
  dialogueData.push(
    { dialogue: { content: "Dean Jennifer Walsh: Hello! I'm Dean Walsh. I oversee student life here at Neumont. How can I assist you today?", Paths: { "Tell me about student organizations": "PLACEHOLDER_walsh-orgs", "Where do I go first?": "PLACEHOLDER_walsh-campus-tour", "I have a concern": "PLACEHOLDER_walsh-concern", "Just introducing myself": "PLACEHOLDER_walsh-intro" }, TriggeredQuest: "" }, treeId: "walsh-greeting" },
    { dialogue: { content: "Dean Jennifer Walsh: We have amazing student organizations! Gaming club, hackathon team, robotics club, and more. Which interests you?", Paths: { "Gaming club": "PLACEHOLDER_walsh-gaming", "Hackathon team": "PLACEHOLDER_walsh-hackathon", "Tell me about all of them": "PLACEHOLDER_walsh-all" }, TriggeredQuest: "" }, treeId: "walsh-orgs" },
    { dialogue: { content: "Dean Jennifer Walsh: The gaming club is very active! They host tournaments and game nights every Friday. You should join them!", Paths: { "How do I join?": "PLACEHOLDER_walsh-join", "Sounds fun!": "PLACEHOLDER_walsh-end" }, TriggeredQuest: createdIds.quests[5] }, treeId: "walsh-gaming" },
    { dialogue: { content: "Dean Jennifer Walsh: Our hackathon team competes nationally! They're always looking for talented coders. Great for your resume!", Paths: { "I want to join!": "PLACEHOLDER_walsh-join", "I'm not sure I'm ready": "PLACEHOLDER_walsh-encourage" }, TriggeredQuest: "" }, treeId: "walsh-hackathon" },
    { dialogue: { content: "Dean Jennifer Walsh: Check the student portal for a full list of organizations. There's something for everyone! Attend the club fair next week.", Paths: { "I'll be there!": "PLACEHOLDER_walsh-end" }, TriggeredQuest: createdIds.quests[6] }, treeId: "walsh-all" },
    { dialogue: { content: "Dean Jennifer Walsh: I'm here to listen. What's on your mind? Remember, everything we discuss is confidential.", Paths: { "It's about academics": "PLACEHOLDER_walsh-academic", "It's personal": "PLACEHOLDER_walsh-personal" }, TriggeredQuest: "" }, treeId: "walsh-concern" },
    { dialogue: { content: "Dean Jennifer Walsh: Academic challenges are normal. Let me connect you with tutoring services and your advisor. We'll get you back on track!", Paths: { "Thank you": "PLACEHOLDER_walsh-end" }, TriggeredQuest: "" }, treeId: "walsh-academic" },
    { dialogue: { content: "Dean Jennifer Walsh: I appreciate you sharing. Let me refer you to our counseling services. They're excellent and completely confidential.", Paths: { "That helps": "PLACEHOLDER_walsh-end" }, TriggeredQuest: "" }, treeId: "walsh-personal" },
    { dialogue: { content: "Dean Jennifer Walsh: Wonderful! It's great to meet you. My door is always open if you need anything. Enjoy your time at Neumont!", Paths: { "Thank you, Dean Walsh!": "PLACEHOLDER_walsh-end" }, TriggeredQuest: "" }, treeId: "walsh-intro" },
    { dialogue: { content: "Dean Jennifer Walsh: Great question! Let me give you a quest to explore our beautiful campus. Visit each floor and get familiar with the building!", Paths: { "Thanks, I'll start exploring!": "PLACEHOLDER_walsh-end" }, TriggeredQuest: createdIds.quests[15] }, treeId: "walsh-campus-tour" },
    { dialogue: { content: "Dean Jennifer Walsh: Take care! Remember, we're all here to support your success. Don't hesitate to reach out anytime.", Paths: {}, TriggeredQuest: "" }, treeId: "walsh-end" }
  );

  // Create dialogues and track IDs for path linking
  const dialogueIdMap: Record<string, string> = {};

  for (const { dialogue, treeId } of dialogueData) {
    // Add the treeId to the dialogue document for stable lookups
    const dialogueWithTreeId = { ...dialogue, treeId };

    // Use treeId as the Firestore document ID for stable references
    const id = await addDocument<Dialogue>(COLLECTIONS.DIALOGUE, dialogueWithTreeId, treeId);
    dialogueIdMap[treeId] = id;
    createdIds.dialogues.push(id);
    stats.dialogues++;
  }

  // Update Paths with actual dialogue IDs
  if (!isDryRun) {
    const { updateDoc, doc } = await import("firebase/firestore");

    // Helper function to update paths
    const updatePaths = async (treeId: string, paths: Record<string, string>) => {
      const updatedPaths: Record<string, string> = {};
      for (const [key, placeholder] of Object.entries(paths)) {
        const targetId = placeholder.replace("PLACEHOLDER_", "");
        updatedPaths[key] = dialogueIdMap[targetId] || "";
      }
      await updateDoc(doc(db, COLLECTIONS.DIALOGUE, dialogueIdMap[treeId]), { Paths: updatedPaths });
    };

    // Update all dialogue paths (this is tedious but necessary for referential integrity)
    await updatePaths("chen-greeting", { "Tell me about courses": "PLACEHOLDER_chen-courses", "I need career advice": "PLACEHOLDER_chen-career", "Just saying hi": "PLACEHOLDER_chen-casual" });
    await updatePaths("chen-courses", { "Web development": "PLACEHOLDER_chen-web", "Data science": "PLACEHOLDER_chen-data", "Cybersecurity": "PLACEHOLDER_chen-security" });
    await updatePaths("chen-web", { "Yes, please!": "PLACEHOLDER_chen-register", "I'll think about it": "PLACEHOLDER_chen-end" });
    await updatePaths("chen-data", { "Sounds good": "PLACEHOLDER_chen-end", "What about prerequisites?": "PLACEHOLDER_chen-prereq" });
    await updatePaths("chen-security", { "Tell me more": "PLACEHOLDER_chen-end", "I'm interested!": "PLACEHOLDER_chen-register" });
    await updatePaths("chen-career", { "I'm a freshman": "PLACEHOLDER_chen-freshman", "I'm looking for internships": "PLACEHOLDER_chen-internship" });
    await updatePaths("chen-freshman", { "Thanks for the advice!": "PLACEHOLDER_chen-end" });
    await updatePaths("chen-internship", { "That would be helpful": "PLACEHOLDER_chen-end" });
    await updatePaths("chen-casual", { "Will do, thanks!": "PLACEHOLDER_chen-end" });

    await updatePaths("rodriguez-greeting", { "I have a question about class": "PLACEHOLDER_rodriguez-class", "Tell me about your research": "PLACEHOLDER_rodriguez-research", "Just exploring": "PLACEHOLDER_rodriguez-explore" });
    await updatePaths("rodriguez-class", { "Binary trees": "PLACEHOLDER_rodriguez-trees", "Sorting algorithms": "PLACEHOLDER_rodriguez-sorting", "Graph theory": "PLACEHOLDER_rodriguez-graphs" });
    await updatePaths("rodriguez-trees", { "Not yet": "PLACEHOLDER_rodriguez-help", "Yes, still confused": "PLACEHOLDER_rodriguez-office" });
    await updatePaths("rodriguez-sorting", { "Can you explain Big O?": "PLACEHOLDER_rodriguez-bigo", "I'll practice more": "PLACEHOLDER_rodriguez-end" });
    await updatePaths("rodriguez-graphs", { "Yes, shortest path": "PLACEHOLDER_rodriguez-dijkstra", "Just learning": "PLACEHOLDER_rodriguez-end" });
    await updatePaths("rodriguez-research", { "Absolutely!": "PLACEHOLDER_rodriguez-join", "Maybe later": "PLACEHOLDER_rodriguez-end" });
    await updatePaths("rodriguez-join", { "Thanks, Professor!": "PLACEHOLDER_rodriguez-end" });
    await updatePaths("rodriguez-explore", { "Will do!": "PLACEHOLDER_rodriguez-end" });
    await updatePaths("rodriguez-office", { "See you then!": "PLACEHOLDER_rodriguez-end" });

    await updatePaths("walsh-greeting", { "Tell me about student organizations": "PLACEHOLDER_walsh-orgs", "Where do I go first?": "PLACEHOLDER_walsh-campus-tour", "I have a concern": "PLACEHOLDER_walsh-concern", "Just introducing myself": "PLACEHOLDER_walsh-intro" });
    await updatePaths("walsh-orgs", { "Gaming club": "PLACEHOLDER_walsh-gaming", "Hackathon team": "PLACEHOLDER_walsh-hackathon", "Tell me about all of them": "PLACEHOLDER_walsh-all" });
    await updatePaths("walsh-gaming", { "How do I join?": "PLACEHOLDER_walsh-join", "Sounds fun!": "PLACEHOLDER_walsh-end" });
    await updatePaths("walsh-hackathon", { "I want to join!": "PLACEHOLDER_walsh-join", "I'm not sure I'm ready": "PLACEHOLDER_walsh-encourage" });
    await updatePaths("walsh-all", { "I'll be there!": "PLACEHOLDER_walsh-end" });
    await updatePaths("walsh-concern", { "It's about academics": "PLACEHOLDER_walsh-academic", "It's personal": "PLACEHOLDER_walsh-personal" });
    await updatePaths("walsh-academic", { "Thank you": "PLACEHOLDER_walsh-end" });
    await updatePaths("walsh-personal", { "That helps": "PLACEHOLDER_walsh-end" });
    await updatePaths("walsh-intro", { "Thank you, Dean Walsh!": "PLACEHOLDER_walsh-end" });
    await updatePaths("walsh-campus-tour", { "Thanks, I'll start exploring!": "PLACEHOLDER_walsh-end" });
  }

  // Store root dialogue IDs for NPC references
  createdIds.dialogues = [
    dialogueIdMap["chen-greeting"],
    dialogueIdMap["rodriguez-greeting"],
    dialogueIdMap["walsh-greeting"],
  ];

  console.log(`   ✅ Created ${stats.dialogues} dialogue nodes (3 trees)`);
}

/**
 * Seed NPC collection (3 NPCs)
 */
async function seedNPCs() {
  const npcs: Array<Omit<NPC, "id">> = [
    {
      Name: "Dr. Sarah Chen",
      Sprite: {
        hat: createdIds.cosmetics[1], // Neumont Beanie
        shirt: createdIds.cosmetics[11], // Neumont Hoodie
        pants: createdIds.cosmetics[24], // Khakis
        shoes: createdIds.cosmetics[32], // Dress Shoes
        accessory: createdIds.cosmetics[40], // Glasses
      },
      Placement: [5, 10],
      Behavior: "stationary",
      dialogueTreeId: "chen-greeting", // Stable dialogue tree identifier
    },
    {
      Name: "Professor Mike Rodriguez",
      Sprite: {
        hat: createdIds.cosmetics[0], // Classic Baseball Cap
        shirt: createdIds.cosmetics[16], // Flannel Shirt
        pants: createdIds.cosmetics[20], // Blue Jeans
        shoes: createdIds.cosmetics[30], // Sneakers
        accessory: createdIds.cosmetics[42], // Backpack
      },
      Placement: [15, 20],
      Behavior: "wander",
      dialogueTreeId: "rodriguez-greeting", // Stable dialogue tree identifier
    },
    {
      Name: "Dean Jennifer Walsh",
      Sprite: {
        hat: createdIds.cosmetics[3], // Top Hat
        shirt: createdIds.cosmetics[18], // Tuxedo Shirt
        pants: createdIds.cosmetics[27], // Tuxedo Pants
        shoes: createdIds.cosmetics[39], // Wingtips
        accessory: createdIds.cosmetics[45], // Bow Tie
      },
      Placement: [25, 8],
      Behavior: "wander",
      dialogueTreeId: "walsh-greeting", // Stable dialogue tree identifier
    },
  ];

  for (const npc of npcs) {
    const id = await addDocument<NPC>(COLLECTIONS.NPC, npc);
    createdIds.npcs.push(id);
    stats.npcs++;
  }

  console.log(`   ✅ Created ${stats.npcs} NPCs`);
}

/**
 * Seed Player collection (3 players)
 */
async function seedPlayers() {
  const players: Array<Omit<Player, "id">> = [
    {
      Username: "alex_codes",
      RealName: "Alex Thompson",
      Email: "athompson@student.neumont.edu",
      Wallet: "500",
      SkillTree: [
        createdIds.skills[0], // JavaScript
        createdIds.skills[3], // React
        createdIds.skills[15], // Team Collaboration
      ],
      OwnedCosmetics: {
        Hat: [createdIds.cosmetics[0], createdIds.cosmetics[1]],
        Shirt: [createdIds.cosmetics[10], createdIds.cosmetics[11]],
        Pants: [createdIds.cosmetics[20]],
        Shoes: [createdIds.cosmetics[30]],
        Accessory: [createdIds.cosmetics[40], createdIds.cosmetics[47]],
      },
      PuzzleRecord: [createdIds.puzzles[0], createdIds.puzzles[2]],
      CompletedQuests: [createdIds.quests[0]],
      ActiveQuests: [createdIds.quests[1]],
    },
    {
      Username: "sarah_dev",
      RealName: "Sarah Martinez",
      Email: "smartinez@student.neumont.edu",
      Wallet: "2500",
      SkillTree: [
        createdIds.skills[1], // Python
        createdIds.skills[2], // Database Design
        createdIds.skills[5], // Algorithms
        createdIds.skills[18], // Technical Writing
        createdIds.skills[19], // Problem Solving
      ],
      OwnedCosmetics: {
        Hat: [createdIds.cosmetics[1], createdIds.cosmetics[2], createdIds.cosmetics[4]],
        Shirt: [createdIds.cosmetics[10], createdIds.cosmetics[12], createdIds.cosmetics[15]],
        Pants: [createdIds.cosmetics[20], createdIds.cosmetics[22]],
        Shoes: [createdIds.cosmetics[30], createdIds.cosmetics[31]],
        Accessory: [createdIds.cosmetics[40], createdIds.cosmetics[41], createdIds.cosmetics[42]],
      },
      PuzzleRecord: [createdIds.puzzles[0], createdIds.puzzles[1], createdIds.puzzles[2], createdIds.puzzles[3]],
      CompletedQuests: [createdIds.quests[0], createdIds.quests[1], createdIds.quests[5]],
      ActiveQuests: [createdIds.quests[2], createdIds.quests[6]],
    },
    {
      Username: "mike_master",
      RealName: "Michael Chen",
      Email: "mchen@student.neumont.edu",
      Wallet: "10000",
      SkillTree: [
        createdIds.skills[0], // JavaScript
        createdIds.skills[2], // Database Design
        createdIds.skills[4], // Git
        createdIds.skills[10], // API Development
        createdIds.skills[14], // Agile
      ],
      OwnedCosmetics: {
        Hat: [createdIds.cosmetics[0], createdIds.cosmetics[1], createdIds.cosmetics[5], createdIds.cosmetics[8]],
        Shirt: [createdIds.cosmetics[10], createdIds.cosmetics[11], createdIds.cosmetics[13], createdIds.cosmetics[18]],
        Pants: [createdIds.cosmetics[20], createdIds.cosmetics[22], createdIds.cosmetics[27]],
        Shoes: [createdIds.cosmetics[30], createdIds.cosmetics[32], createdIds.cosmetics[37]],
        Accessory: [createdIds.cosmetics[40], createdIds.cosmetics[42], createdIds.cosmetics[43], createdIds.cosmetics[49]],
      },
      PuzzleRecord: [createdIds.puzzles[0], createdIds.puzzles[1], createdIds.puzzles[2], createdIds.puzzles[3], createdIds.puzzles[4]],
      CompletedQuests: [createdIds.quests[0], createdIds.quests[1], createdIds.quests[2], createdIds.quests[5], createdIds.quests[10]],
      ActiveQuests: [createdIds.quests[3]],
    },
  ];

  for (const player of players) {
    const id = await addDocument<Player>(COLLECTIONS.PLAYER, player);
    createdIds.players.push(id);
    stats.players++;
  }

  console.log(`   ✅ Created ${stats.players} players`);
}

/**
 * Seed PuzzleWeek collection with subcollections
 * Structure: PuzzleWeek/weeks/Jan20261/{dayDocuments}
 */
async function seedPuzzleWeeks() {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const puzzleDays: Array<Omit<PuzzleDay, "id">> = [
    {
      dow: daysOfWeek[0],
      puzzle: createdIds.puzzles[0],
      topScore: [10000, 8500, 7200],
      topTen: ["player_uid_1", "player_uid_2", "player_uid_3"]
    },
    {
      dow: daysOfWeek[1],
      puzzle: createdIds.puzzles[1],
      topScore: [9500, 7800, 6900],
      topTen: ["player_uid_4", "player_uid_5", "player_uid_6"]
    },
    {
      dow: daysOfWeek[2],
      puzzle: createdIds.puzzles[2],
      topScore: [11000, 9200, 8100],
      topTen: ["player_uid_7", "player_uid_8", "player_uid_9"]
    },
    {
      dow: daysOfWeek[3],
      puzzle: createdIds.puzzles[3],
      topScore: [8800, 7500, 6400],
      topTen: ["player_uid_10", "player_uid_11", "player_uid_12"]
    },
    {
      dow: daysOfWeek[4],
      puzzle: createdIds.puzzles[4],
      topScore: [12000, 10500, 9300],
      topTen: ["player_uid_13", "player_uid_14", "player_uid_15"]
    },
  ];

  // Structure: PuzzleWeek/weeks/Jan20261/{documents}
  // "weeks" is a parent document (empty container)
  // "Jan20261" is the subcollection name
  const parentDocId = "weeks";
  const weekId = "Jan20261";

  for (let i = 0; i < puzzleDays.length; i++) {
    await addSubcollectionDocument<PuzzleDay>(
      COLLECTIONS.PUZZLE_WEEK,
      parentDocId,
      weekId,
      puzzleDays[i]
    );
    stats.puzzleWeeks++;
  }

  console.log(`   ✅ Created ${stats.puzzleWeeks} puzzle week documents in ${weekId} subcollection`);
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log("\n🌱 Neumont Virtual Campus - Database Seeding System");
  console.log("=".repeat(60));

  // Confirm before proceeding
  const confirmed = await confirmSeeding();
  if (!confirmed) {
    console.log("❌ Seeding cancelled");
    return;
  }

  // Clear existing data if requested
  if (shouldClear && !isDryRun) {
    await clearExistingData();
  }

  const startTime = Date.now();

  try {
    // Seed in order to maintain referential integrity
    console.log("\n📦 Step 1: Seeding Cosmetics...");
    await seedCosmetics();

    console.log("\n📚 Step 2: Seeding Skill Tree Items...");
    await seedSkillTreeItems();

    console.log("\n🧩 Step 3: Seeding Puzzles...");
    await seedPuzzles();

    console.log("\n🎯 Step 4: Seeding Quests...");
    await seedQuests();

    console.log("\n💬 Step 5: Seeding Dialogues...");
    await seedDialogues();

    console.log("\n👤 Step 6: Seeding NPCs...");
    await seedNPCs();

    console.log("\n🎮 Step 7: Seeding Players...");
    await seedPlayers();

    console.log("\n📅 Step 8: Seeding Puzzle Weeks...");
    await seedPuzzleWeeks();

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Database seeding completed successfully!");
    console.log("=".repeat(60));
    console.log("\n📊 Summary Statistics:");
    console.log(`   • Cosmetics: ${stats.cosmetics}`);
    console.log(`   • Skill Tree Items: ${stats.skills}`);
    console.log(`   • Puzzles: ${stats.puzzles}`);
    console.log(`   • Quests: ${stats.quests}`);
    console.log(`   • Dialogues: ${stats.dialogues}`);
    console.log(`   • NPCs: ${stats.npcs}`);
    console.log(`   • Players: ${stats.players}`);
    console.log(`   • Puzzle Weeks: ${stats.puzzleWeeks}`);
    console.log(`\n⏱️  Time elapsed: ${duration}s`);

    if (isDryRun) {
      console.log("\n🔍 This was a DRY RUN - no data was written to the database");
    }
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  }
}

/**
 * Run seeding if executed directly
 */
if (import.meta.main) {
  seedDatabase()
    .then(() => {
      console.log("\n✅ Seeding process completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seeding process failed:", error);
      process.exit(1);
    });
}


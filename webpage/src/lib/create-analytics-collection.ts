/**
 * Script to create the Analytics collection in Firebase with sample data
 * This demonstrates the structure and helps set up indexes
 * 
 * Run with: bun run webpage/src/lib/create-analytics-collection.ts
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ANALYTICS_COLLECTION = 'Analytics';

/**
 * Sample analytics events to seed the collection
 */
const sampleEvents = [
  {
    eventType: 'session_start',
    playerId: 'sarah_dev',
    metadata: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      screenResolution: '1920x1080',
    },
  },
  {
    eventType: 'scene_enter',
    playerId: 'sarah_dev',
    metadata: {
      scene: 'MainScene',
      floor: 'ground',
    },
  },
  {
    eventType: 'npc_interaction',
    playerId: 'sarah_dev',
    metadata: {
      npcId: 'dean_walsh',
      npcName: 'Dean Walsh',
      dialogueTreeId: 'dean_welcome',
    },
  },
  {
    eventType: 'dialogue_start',
    playerId: 'sarah_dev',
    metadata: {
      npcId: 'dean_walsh',
      treeId: 'dean_welcome',
    },
  },
  {
    eventType: 'dialogue_end',
    playerId: 'sarah_dev',
    metadata: {
      npcId: 'dean_walsh',
      treeId: 'dean_welcome',
    },
  },
  {
    eventType: 'quest_start',
    playerId: 'sarah_dev',
    metadata: {
      questId: 'intro_quest',
      questData: {},
    },
  },
  {
    eventType: 'quiz_start',
    playerId: 'sarah_dev',
    metadata: {
      questionId: 'q_001',
      questionType: 'mcq',
      difficulty: 2,
      basePoints: 100,
      quizDate: '2026-03-01',
    },
  },
  {
    eventType: 'quiz_attempt',
    playerId: 'sarah_dev',
    metadata: {
      questionId: 'q_001',
      questionType: 'mcq',
      attemptNumber: 1,
      correct: false,
      elapsedMs: 15000,
      elapsedSeconds: '15.00',
    },
  },
  {
    eventType: 'quiz_attempt',
    playerId: 'sarah_dev',
    metadata: {
      questionId: 'q_001',
      questionType: 'mcq',
      attemptNumber: 2,
      correct: true,
      elapsedMs: 28000,
      elapsedSeconds: '28.00',
    },
  },
  {
    eventType: 'quiz_complete',
    playerId: 'sarah_dev',
    metadata: {
      questionId: 'q_001',
      pointsEarned: 80,
      attemptNumber: 2,
      elapsedMs: 28000,
      quizDate: '2026-03-01',
    },
  },
  {
    eventType: 'quest_complete',
    playerId: 'sarah_dev',
    metadata: {
      questId: 'intro_quest',
      questTitle: 'Welcome to Neumont',
      rewardPoints: 50,
      previousPoints: 100,
      newPoints: 150,
    },
  },
  {
    eventType: 'session_end',
    playerId: 'sarah_dev',
    metadata: {
      durationMs: 1800000,
      durationMinutes: 30,
    },
  },
];

/**
 * Create Analytics collection with sample data
 */
async function createAnalyticsCollection() {
  console.log('🚀 Creating Analytics collection...');
  console.log(`📊 Adding ${sampleEvents.length} sample events\n`);

  try {
    const analyticsRef = collection(db, ANALYTICS_COLLECTION);
    let successCount = 0;

    for (const event of sampleEvents) {
      const docRef = await addDoc(analyticsRef, {
        ...event,
        timestamp: serverTimestamp(),
      });
      
      successCount++;
      console.log(`✅ [${successCount}/${sampleEvents.length}] Added ${event.eventType} event (${docRef.id})`);
    }

    console.log(`\n🎉 Successfully created Analytics collection with ${successCount} events!`);
    console.log('\n📋 Next Steps:');
    console.log('1. Go to Firebase Console → Firestore Database');
    console.log('2. Navigate to the Analytics collection');
    console.log('3. Create composite indexes:');
    console.log('   - playerId (Ascending) + timestamp (Descending)');
    console.log('   - eventType (Ascending) + timestamp (Descending)');
    console.log('   - playerId (Ascending) + eventType (Ascending) + timestamp (Descending)');
    console.log('\n4. The admin portal analytics dashboard should now display real data!');
    
  } catch (error) {
    console.error('❌ Error creating Analytics collection:', error);
    throw error;
  }
}

// Run the script
createAnalyticsCollection()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


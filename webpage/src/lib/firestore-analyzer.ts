/**
 * Firestore Data Structure Analyzer
 * 
 * This script queries all existing Firestore collections to analyze
 * their structure, field types, and data patterns.
 */

import { collection, getDocs, query, limit, DocumentData } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";

/**
 * Analyze a single document's structure
 */
function analyzeDocument(doc: DocumentData): Record<string, string> {
  const structure: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(doc)) {
    if (value === null) {
      structure[key] = 'null';
    } else if (Array.isArray(value)) {
      structure[key] = `array (${value.length} items)`;
      if (value.length > 0) {
        structure[key] += ` - sample: ${typeof value[0]}`;
      }
    } else if (value instanceof Date || (value && typeof value === 'object' && 'toDate' in value)) {
      structure[key] = 'timestamp';
    } else if (typeof value === 'object') {
      structure[key] = `object - keys: ${Object.keys(value).join(', ')}`;
    } else {
      structure[key] = typeof value;
    }
  }
  
  return structure;
}

/**
 * Analyze a collection and return sample documents
 */
async function analyzeCollection(collectionName: string, sampleSize: number = 3) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing Collection: ${collectionName}`);
  console.log('='.repeat(60));
  
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, limit(sampleSize));
    const snapshot = await getDocs(q);
    
    console.log(`Total documents sampled: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('⚠️  Collection is empty or does not exist');
      return null;
    }
    
    const documents: any[] = [];
    const structures: Record<string, string>[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        ...data
      });
      structures.push(analyzeDocument(data));
    });
    
    // Print first document as example
    console.log('\n📄 Sample Document:');
    console.log(JSON.stringify(documents[0], null, 2));
    
    // Print field structure
    console.log('\n📋 Field Structure:');
    console.log(JSON.stringify(structures[0], null, 2));
    
    return {
      collectionName,
      documentCount: snapshot.size,
      sampleDocuments: documents,
      fieldStructures: structures
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing collection ${collectionName}:`, error);
    return null;
  }
}

/**
 * Analyze PuzzleWeek subcollection (PuzzleDay)
 */
async function analyzePuzzleWeekSubcollection() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing Subcollection: PuzzleWeek -> PuzzleDay`);
  console.log('='.repeat(60));
  
  try {
    // First get a PuzzleWeek document
    const puzzleWeekRef = collection(db, COLLECTIONS.PUZZLE_WEEK);
    const weekSnapshot = await getDocs(query(puzzleWeekRef, limit(1)));
    
    if (weekSnapshot.empty) {
      console.log('⚠️  No PuzzleWeek documents found');
      return null;
    }
    
    const weekDoc = weekSnapshot.docs[0];
    console.log(`Using PuzzleWeek document: ${weekDoc.id}`);
    
    // Get PuzzleDay subcollection
    const puzzleDayRef = collection(db, COLLECTIONS.PUZZLE_WEEK, weekDoc.id, COLLECTIONS.PUZZLE_DAY);
    const daySnapshot = await getDocs(query(puzzleDayRef, limit(3)));
    
    console.log(`Total PuzzleDay documents sampled: ${daySnapshot.size}`);
    
    if (daySnapshot.empty) {
      console.log('⚠️  No PuzzleDay documents found in this week');
      return null;
    }
    
    const documents: any[] = [];
    daySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('\n📄 Sample PuzzleDay Document:');
    console.log(JSON.stringify(documents[0], null, 2));
    
    return documents;
    
  } catch (error) {
    console.error('❌ Error analyzing PuzzleDay subcollection:', error);
    return null;
  }
}

/**
 * Main analysis function
 */
export async function analyzeAllCollections() {
  console.log('🔍 Starting Firestore Data Structure Analysis...\n');
  
  const results: Record<string, any> = {};
  
  // Analyze main collections
  for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
    if (collectionName === 'PuzzleDay') continue; // Skip, will analyze as subcollection
    
    const result = await analyzeCollection(collectionName);
    if (result) {
      results[collectionName] = result;
    }
  }
  
  // Analyze PuzzleDay subcollection
  const puzzleDayResult = await analyzePuzzleWeekSubcollection();
  if (puzzleDayResult) {
    results['PuzzleDay'] = puzzleDayResult;
  }
  
  console.log('\n✅ Analysis Complete!\n');
  
  return results;
}

// Run analysis if executed directly
if (import.meta.main) {
  analyzeAllCollections()
    .then(() => {
      console.log('Analysis finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}


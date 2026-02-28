import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';

async function checkQuizFormats() {
  console.log('\n📋 Checking Quiz Formats\n');
  console.log('='.repeat(60));
  
  // Get the correct format example
  console.log('\n✅ CORRECT Quiz Format (JmeMnmYxkYS8sXIdvlXh):');
  const correctDocRef = doc(db, COLLECTIONS.PUZZLE, 'JmeMnmYxkYS8sXIdvlXh');
  const correctSnap = await getDoc(correctDocRef);
  
  if (correctSnap.exists()) {
    console.log(JSON.stringify(correctSnap.data(), null, 2));
  }
  
  // Get all Quiz type puzzles
  console.log('\n\n❌ Current Quiz Puzzles from Seed:');
  const quizQuery = query(
    collection(db, COLLECTIONS.PUZZLE),
    where('Type', '==', 'Quiz')
  );
  
  const quizSnap = await getDocs(quizQuery);
  console.log(`\nFound ${quizSnap.size} Quiz puzzles:\n`);
  
  quizSnap.forEach((doc) => {
    console.log(`\nPuzzle ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log('-'.repeat(60));
  });
  
  // Get all Code type puzzles
  console.log('\n\n💻 Current Code Puzzles from Seed:');
  const codeQuery = query(
    collection(db, COLLECTIONS.PUZZLE),
    where('Type', '==', 'Code')
  );
  
  const codeSnap = await getDocs(codeQuery);
  console.log(`\nFound ${codeSnap.size} Code puzzles:\n`);
  
  codeSnap.forEach((doc) => {
    console.log(`\nPuzzle ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log('-'.repeat(60));
  });
}

if (import.meta.main) {
  checkQuizFormats()
    .then(() => {
      console.log('\n✅ Check complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}


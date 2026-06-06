#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const dbFile = 'exercise-analysis/exercise-database.json';
const db = JSON.parse(readFileSync(dbFile, 'utf8'));

const trainingFile = 'docs/data/training-drills.json';
const training = JSON.parse(readFileSync(trainingFile, 'utf8'));

console.log('🧠 Smart categorization using drill metadata...\n');

// Build video index -> drill mapping
const videoDrillMap = {};
training.drills.forEach((drill, idx) => {
  // Extract video name from drill order/index
  videoDrillMap[idx + 1] = drill;
});

let matched = 0;
let unmatched = 0;

// Process exercises
db.exercises.forEach(exercise => {
  const videoIndex = exercise.videoIndex;
  const drill = videoDrillMap[videoIndex];

  if (drill) {
    // Use drill's metadata for categorization
    exercise.category = drill.category || 'General';
    exercise.level = drill.level;
    exercise.levelName = drill.levelName;
    exercise.drillName = drill.name;
    exercise.drillGoal = drill.goal;
    exercise.drillFocus = drill.focus || [];
    exercise.tags = drill.hashtags || [];
    exercise.participant = drill.participant;
    exercise.status = 'matched';
    matched++;
  } else {
    exercise.status = 'unmatched';
    unmatched++;
  }
});

// Rebuild categories
db.categories = {};
db.exercises.forEach(ex => {
  const cat = ex.category || 'Uncategorized';
  db.categories[cat] = (db.categories[cat] || 0) + 1;
});

// Save
writeFileSync(dbFile, JSON.stringify(db, null, 2));

console.log('✅ Smart categorization complete!\n');
console.log('📊 Exercise breakdown:');
console.log(`   Matched with drill data: ${matched}`);
console.log(`   Unmatched: ${unmatched}`);
console.log(`\n📂 By category:`);
Object.entries(db.categories)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([cat, count]) => {
    console.log(`   ${cat.padEnd(20)}: ${count}`);
  });

if (Object.keys(db.categories).length > 10) {
  console.log(`   ... and ${Object.keys(db.categories).length - 10} more categories`);
}

console.log(`\n📈 By level:`);
const byLevel = {};
db.exercises.forEach(ex => {
  if (ex.levelName) {
    byLevel[ex.levelName] = (byLevel[ex.levelName] || 0) + 1;
  }
});
Object.entries(byLevel)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([level, count]) => {
    console.log(`   ${level}: ${count}`);
  });

// Create summary view
const summary = {
  totalExercises: db.exercises.length,
  categorized: matched,
  categories: db.categories,
  levels: byLevel,
  sampleExercises: db.exercises.slice(0, 5).map(e => ({
    id: e.id,
    drillName: e.drillName,
    category: e.category,
    duration: e.duration,
    level: e.levelName
  }))
};

writeFileSync('exercise-analysis/summary.json', JSON.stringify(summary, null, 2));

console.log('\n✅ Database updated and ready for use!');
console.log('📄 Files:');
console.log('   exercise-analysis/exercise-database.json - Full exercise catalog');
console.log('   exercise-analysis/summary.json - Quick summary');
console.log('   exercise-analysis/clips/ - All extracted video clips');

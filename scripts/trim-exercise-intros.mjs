#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const dbFile = 'exercise-analysis/exercise-database.json';
const db = JSON.parse(readFileSync(dbFile, 'utf8'));

console.log('✂️ Trimming intro from exercise clips...\n');

// Trim 5-7 seconds from start of each exercise segment
const TRIM_TIME = 5.5; // seconds to remove from start

let trimmed = 0;
db.exercises.forEach(exercise => {
  // Only trim if there's enough time
  if (exercise.duration > TRIM_TIME + 3) {
    const newStart = exercise.startTime + TRIM_TIME;
    const newDuration = exercise.duration - TRIM_TIME;

    exercise.startTime = parseFloat(newStart.toFixed(2));
    exercise.duration = parseFloat(newDuration.toFixed(2));
    exercise.trimmedIntro = true;
    exercise.introDuration = TRIM_TIME;
    trimmed++;
  }
});

writeFileSync(dbFile, JSON.stringify(db, null, 2) + '\n');

console.log(`✅ Trimmed ${trimmed} exercise intros`);
console.log(`⏱️ Removed: ${TRIM_TIME}s from start of each clip`);
console.log(`\n📊 Updated stats:`);

const totalDuration = db.exercises.reduce((sum, ex) => sum + ex.duration, 0);
console.log(`   Total duration: ${(totalDuration / 60).toFixed(1)} minutes (was ${(totalDuration / 60 + TRIM_TIME * db.exercises.length / 60).toFixed(1)})`);
console.log(`   Avg duration: ${(totalDuration / db.exercises.length).toFixed(1)}s per clip`);

console.log('\n🔄 Next: Run extract:all to create new clips');
console.log('   npm run extract:all');

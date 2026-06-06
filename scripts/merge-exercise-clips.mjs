#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const trainingFile = 'docs/data/training-drills.json';
const exerciseDbFile = 'exercise-analysis/exercise-database.json';

const training = JSON.parse(readFileSync(trainingFile, 'utf8'));
const exerciseDb = JSON.parse(readFileSync(exerciseDbFile, 'utf8'));

console.log('🔗 Merging exercise clips into training drills...\n');

// Build lookup: videoIndex -> [exercises]
const exercisesByVideo = {};
exerciseDb.exercises.forEach(ex => {
  if (!exercisesByVideo[ex.videoIndex]) {
    exercisesByVideo[ex.videoIndex] = [];
  }
  exercisesByVideo[ex.videoIndex].push(ex);
});

// Add clips to drills
let clipsAdded = 0;
training.drills.forEach((drill, idx) => {
  const videoIndex = idx + 1;
  const exercises = exercisesByVideo[videoIndex] || [];

  if (exercises.length > 0) {
    // Add array of clips for this drill
    drill.clips = exercises.map(ex => ({
      id: ex.id,
      file: `exercises/${ex.clipFile}`,
      duration: ex.duration,
      startTime: ex.startTime,
      endTime: ex.endTime,
      category: ex.category,
      focus: ex.drillFocus || drill.focus
    }));
    clipsAdded += exercises.length;
  } else {
    drill.clips = [];
  }
});

// Save updated training data
writeFileSync(trainingFile, JSON.stringify(training, null, 2) + '\n');

console.log('✅ Merge complete!');
console.log(`📊 ${clipsAdded} clips linked to drills`);
console.log(`📄 Updated: ${trainingFile}`);

// Create exercise library export
const exerciseLibrary = {
  generatedAt: new Date().toISOString(),
  totalExercises: exerciseDb.exercises.length,
  categories: exerciseDb.categories,
  exercises: exerciseDb.exercises.map(ex => ({
    id: ex.id,
    file: `exercises/${ex.clipFile}`,
    duration: ex.duration,
    category: ex.category,
    level: ex.levelName,
    drillName: ex.drillName,
    drillGoal: ex.drillGoal,
    focus: ex.drillFocus,
    tags: ex.tags,
    participant: ex.participant
  }))
};

writeFileSync('docs/data/exercise-library.json', JSON.stringify(exerciseLibrary, null, 2) + '\n');

console.log('📚 Created: docs/data/exercise-library.json');

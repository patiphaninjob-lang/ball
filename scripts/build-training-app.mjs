import fs from 'fs';
import path from 'path';

// Read classified exercises
const classified = JSON.parse(fs.readFileSync('./data/exercises-classified.json', 'utf-8'));
const gifManifest = JSON.parse(fs.readFileSync('./data/gifs/manifest.json', 'utf-8'));

// Create map of GIF files from manifest
const gifMap = {};
gifManifest.forEach(item => {
  const videoBasename = path.basename(item.sourceVideo);
  gifMap[videoBasename] = item.gif;
});

// Map video filenames to their GIF paths
const videoToGif = gifMap;

// Build training drills data structure
const levels = [
  { id: 1, name: 'Level 1', title: 'Reset & Mobility', description: 'Rehabilitation control' },
  { id: 2, name: 'Level 2', title: 'Body Control', description: 'Core basics' },
  { id: 3, name: 'Level 3', title: 'Strength Base', description: 'Football basics' },
  { id: 4, name: 'Level 4', title: 'Speed & Agility', description: 'Braking control' },
  { id: 5, name: 'Level 5', title: 'Power Transfer', description: 'Complex field actions' }
];

const categories = new Set();
const categoryCounts = {};

const exercises = classified.exercises
  .map(ex => {
    // Try to find matching GIF
    let gifPath = null;

    // Look for exact match in GIF map
    for (const [videoFile, gifFile] of Object.entries(gifMap)) {
      if (videoFile.includes(ex.videoId) || ex.videoId.includes(videoFile.split('.')[0])) {
        gifPath = gifFile;
        break;
      }
    }

    // If no GIF found, skip this exercise
    if (!gifPath) return null;

    if (!ex) return null;

    categories.add(ex.category);
    categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;

    const levelInfo = levels.find(l => l.id === ex.level);

    return {
      id: ex.videoId,
      order: ex.order,
      name: ex.title,
      caption: ex.description,
      goal: generateGoal(ex),
      level: ex.level,
      levelName: levelInfo?.name || `Level ${ex.level}`,
      levelTitle: levelInfo?.title || 'Unknown',
      category: ex.category,
      participant: ex.soloOrPartner,
      intensity: getIntensity(ex.level, ex.type),
      focus: ex.tags.slice(0, 5),
      hashtags: ex.tags,
      minutes: getDuration(ex.level),
      sets: ex.sets || getDefaultSets(ex.level),
      tiktokUrl: ex.url,
      thumbnailUrl: ex.thumbnailUrl,
      gif: gifPath,
      hasGif: true,
      type: ex.type
    };
  })
  .filter(Boolean) // Remove null entries
  .sort((a, b) => a.level - b.level);

const categoryList = Array.from(categories)
  .map(cat => ({ name: cat, count: categoryCounts[cat] }))
  .sort((a, b) => b.count - a.count);

// Count by level
const levelCounts = {};
levels.forEach(l => {
  levelCounts[l.id] = exercises.filter(e => e.level === l.id).length;
});

const levelsWithCounts = levels.map(l => ({
  ...l,
  count: levelCounts[l.id] || 0
}));

// Build the final app data structure
const trainingDrills = {
  timestamp: new Date().toISOString(),
  total: exercises.length,
  exercises,
  drills: exercises, // Alias for backwards compatibility
  levels: levelsWithCounts,
  categories: categoryList,
  programs: buildPrograms(exercises)
};

// Save to app data folder
fs.writeFileSync('./docs/data/training-drills.json', JSON.stringify(trainingDrills, null, 2));
console.log(`\n✅ Generated training-drills.json`);
console.log(`   Total exercises: ${exercises.length}`);
console.log(`   By level:`);
levels.forEach(l => {
  const count = levelCounts[l.id] || 0;
  if (count > 0) {
    console.log(`     Level ${l.id}: ${count} drills`);
  }
});

// Helper functions
function generateGoal(exercise) {
  const goals = {
    1: 'Recovery & mobility',
    2: 'Core control & coordination',
    3: 'Strength foundation',
    4: 'Speed & agility',
    5: 'Power & sport transfer'
  };
  return goals[exercise.level] || 'Training drill';
}

function getIntensity(level, type) {
  const intensities = {
    1: 'Recovery',
    2: 'Moderate',
    3: 'Moderate-High',
    4: 'High',
    5: 'Max'
  };
  return intensities[level] || 'Moderate';
}

function getDuration(level) {
  const durations = {
    1: 20,
    2: 25,
    3: 30,
    4: 35,
    5: 40
  };
  return durations[level] || 30;
}

function getDefaultSets(level) {
  const sets = {
    1: '3 sets × 12-15 reps / 20-30s hold',
    2: '3 sets × 10-12 reps / 60s',
    3: '4 sets × 6-10 reps / 90s',
    4: '5 sets × 5-8 reps / 120s',
    5: '5 sets × 3-5 reps / 150s'
  };
  return sets[level] || '3 sets';
}

function buildPrograms(exercises) {
  // Sunday-focused training programs
  return [
    {
      id: 'base',
      name: 'Base / Recovery',
      description: 'Light recovery session',
      day: 'Sunday',
      minutes: 90,
      drills: exercises
        .filter(e => e.level <= 2)
        .slice(0, 8)
    },
    {
      id: 'speed',
      name: 'Speed / Agility',
      description: 'Game-speed movements',
      day: 'Sunday',
      minutes: 120,
      drills: exercises
        .filter(e => e.level === 4 || e.level === 3)
        .slice(0, 10)
    },
    {
      id: 'power',
      name: 'Power / Field Transfer',
      description: 'Explosive & game situations',
      day: 'Sunday',
      minutes: 120,
      drills: exercises
        .filter(e => e.level === 5 || e.level === 4)
        .slice(0, 10)
    },
    {
      id: 'complete',
      name: 'Complete 3-Hour Session',
      description: 'Full progression',
      day: 'Sunday',
      minutes: 180,
      drills: exercises.slice(0, 25)
    }
  ];
}

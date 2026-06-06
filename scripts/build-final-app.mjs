import fs from 'fs';
import path from 'path';

// Read data
const gifManifest = JSON.parse(fs.readFileSync('./data/gifs/manifest.json', 'utf-8'));
const classified = JSON.parse(fs.readFileSync('./data/exercises-classified.json', 'utf-8'));

// Build exercise map from classified data
const exerciseByOrder = {};
classified.exercises.forEach(ex => {
  exerciseByOrder[ex.order] = ex;
});

const levels = [
  { id: 1, name: 'Level 1', title: 'Reset & Mobility', description: 'Rehabilitation control' },
  { id: 2, name: 'Level 2', title: 'Body Control', description: 'Core basics' },
  { id: 3, name: 'Level 3', title: 'Strength Base', description: 'Football basics' },
  { id: 4, name: 'Level 4', title: 'Speed & Agility', description: 'Braking control' },
  { id: 5, name: 'Level 5', title: 'Power Transfer', description: 'Complex field actions' }
];

// Build exercises from GIF manifest + classified data
const exercises = gifManifest.map((gifEntry, idx) => {
  const videoBasename = path.basename(gifEntry.sourceVideo);
  const videoNameOnly = path.basename(gifEntry.sourceVideo, '.mp4');

  // Find matching exercise from classified data
  // Try to match by order or find the closest match
  const exerciseData = classified.exercises.find(ex => {
    const nameMatch = videoBasename.includes(videoNameOnly);
    return nameMatch;
  }) || {};

  const level = exerciseData.level || 3;
  const levelInfo = levels.find(l => l.id === level);

  return {
    id: `gif-${idx + 1}`, // Use sequential ID for GIFs
    order: idx + 1,
    name: exerciseData.title || videoNameOnly,
    caption: exerciseData.description || 'Training drill from @powerpump45',
    goal: generateGoal(level),
    level,
    levelName: levelInfo?.name || `Level ${level}`,
    levelTitle: levelInfo?.title || 'Unknown',
    category: exerciseData.category || 'Mixed',
    participant: exerciseData.soloOrPartner || 'Solo',
    intensity: getIntensity(level),
    focus: exerciseData.tags?.slice(0, 5) || [],
    hashtags: exerciseData.tags || [],
    minutes: getDuration(level),
    sets: getDefaultSets(level),
    tiktokUrl: exerciseData.url || `#`,
    thumbnailUrl: exerciseData.thumbnailUrl || '',
    gif: gifEntry.gif, // Use GIF path from manifest
    hasGif: true,
    type: exerciseData.type || 'Power'
  };
}).sort((a, b) => a.level - b.level);

const categories = new Set(exercises.map(e => e.category));
const categoryList = Array.from(categories)
  .map(cat => ({
    name: cat,
    count: exercises.filter(e => e.category === cat).length
  }))
  .sort((a, b) => b.count - a.count);

const levelCounts = {};
levels.forEach(l => {
  levelCounts[l.id] = exercises.filter(e => e.level === l.id).length;
});

const levelsWithCounts = levels.map(l => ({
  ...l,
  count: levelCounts[l.id] || 0
}));

const trainingDrills = {
  timestamp: new Date().toISOString(),
  total: exercises.length,
  exercises,
  drills: exercises,
  levels: levelsWithCounts,
  categories: categoryList,
  programs: buildPrograms(exercises)
};

fs.writeFileSync('./docs/data/training-drills.json', JSON.stringify(trainingDrills, null, 2));

console.log(`\n✅ Generated training-drills.json with ${exercises.length} exercises`);
console.log(`\n   By level:`);
levels.forEach(l => {
  const count = levelCounts[l.id] || 0;
  if (count > 0) {
    console.log(`     ${l.name}: ${count} drills`);
  }
});

console.log(`\n   By category:`);
categoryList.slice(0, 5).forEach(cat => {
  console.log(`     ${cat.name}: ${cat.count}`);
});

// Helpers
function generateGoal(level) {
  const goals = {
    1: 'Recovery & mobility',
    2: 'Core control & coordination',
    3: 'Strength foundation',
    4: 'Speed & agility',
    5: 'Power & sport transfer'
  };
  return goals[level] || 'Training drill';
}

function getIntensity(level) {
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

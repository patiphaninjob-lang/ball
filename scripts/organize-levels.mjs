import fs from 'fs';
import path from 'path';

const dataFile = './docs/data/exercise-library.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Define progression categories
const levelMap = {
  // Level 1: Recovery & Mobility (Rehab foundation)
  1: {
    categories: ['Mobility', 'Rehab'],
    keywords: ['mobility', 'warm', 'rehab', 'recovery', 'stretch', 'warm-up', 'control', 'pain-free']
  },
  // Level 2: Core & Body Control (Stability foundation)
  2: {
    categories: ['Core'],
    keywords: ['core', 'stability', 'balance', 'control', 'foundation', 'basic']
  },
  // Level 3: Strength & Skill (Strength base)
  3: {
    categories: ['Strength', 'Football Skill'],
    keywords: ['strength', 'football', 'skill', 'basic', 'foundation']
  },
  // Level 4: Agility & Speed (Directional change)
  4: {
    categories: ['Agility', 'Deceleration'],
    keywords: ['agility', 'speed', 'deceleration', 'direction', 'change']
  },
  // Level 5: Power & Complex (Advanced)
  5: {
    categories: ['Power'],
    keywords: ['power', 'explosive', 'complex', 'advanced', 'burst']
  }
};

// Reassign levels based on category and progression logic
const reassigned = data.exercises.map(ex => {
  const category = ex.category;
  let newLevel = ex.level; // Keep default if no match

  // Find appropriate level by category
  for (const [level, config] of Object.entries(levelMap)) {
    if (config.categories.includes(category)) {
      newLevel = parseInt(level);
      break;
    }
  }

  // Special handling for General category based on keywords
  if (category === 'General') {
    const description = `${ex.drillName} ${ex.drillGoal} ${(ex.focus || []).join(' ')}`.toLowerCase();
    
    // Check keywords for better level assignment
    for (const [level, config] of Object.entries(levelMap)) {
      if (config.keywords.some(kw => description.includes(kw))) {
        newLevel = parseInt(level);
        break;
      }
    }
    
    // If still General and no match, assign based on current level to preserve distribution
    // Level 2 is largest, so General exercises likely fit there
    if (newLevel === ex.level) {
      newLevel = 2;
    }
  }

  return {
    ...ex,
    level: newLevel
  };
});

// Count new distribution
const newCounts = {};
reassigned.forEach(ex => {
  newCounts[ex.level] = (newCounts[ex.level] || 0) + 1;
});

// Show comparison
console.log('=== LEVEL REORGANIZATION ===\n');
console.log('OLD DISTRIBUTION:');
for (let i = 1; i <= 5; i++) {
  const count = data.exercises.filter(e => e.level === i).length;
  console.log(`  Level ${i}: ${count} exercises`);
}

console.log('\nNEW DISTRIBUTION:');
for (let i = 1; i <= 5; i++) {
  const count = newCounts[i] || 0;
  console.log(`  Level ${i}: ${count} exercises`);
}

console.log('\n=== CATEGORY → LEVEL MAPPING ===');
const categoryToLevel = {};
reassigned.forEach(ex => {
  if (!categoryToLevel[ex.category]) categoryToLevel[ex.category] = {};
  categoryToLevel[ex.category][ex.level] = (categoryToLevel[ex.category][ex.level] || 0) + 1;
});

Object.entries(categoryToLevel).forEach(([cat, levels]) => {
  console.log(`\n${cat}:`);
  Object.entries(levels).sort().forEach(([level, count]) => {
    console.log(`  → Level ${level}: ${count}`);
  });
});

// Save reorganized data
data.exercises = reassigned;
data.generatedAt = new Date().toISOString();
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

console.log('\n✅ exercise-library.json updated with new level assignments');

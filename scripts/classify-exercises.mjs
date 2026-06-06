import fs from 'fs';
import path from 'path';

// Read the TikTok videos JSON
const videosPath = './data/powerpump45-videos.json';
const videos = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));

// Classification rules based on keywords in titles (priority order)
const levelKeywords = {
  1: [
    'rehabilitation', 'rehab', 'aclinjury', 'acl injury', 'recovery',
    'ยืด', 'passivestretching', 'passive stretching', 'stretching',
    'flexibility', 'ยืดหย่อน', 'ฟื้นฟู', 'mobilit', 'เจ็บ'
  ],
  2: [
    'anti-rotation', 'antirotation', 'hand-eye', 'handeyecoordination',
    'coordination', 'body control', 'core', 'core control',
    'ควบคุม', 'แกนกลาง', 'ประสาน', 'ควบคุมแกนกลาง', 'cla'
  ],
  3: [
    'landmine', 'strength base', 'base', 'football basics', 'strongman',
    'ฟุตบอล', 'พื้นฐาน', 'แข็งแกร่ง', 'ยก', 'ความมั่นคง'
  ],
  4: [
    'deceleration', 'sprint', 'acceleration', 'speed', 'agility',
    'braking', 'breaking', 'direction change',
    'รวดเร็ว', 'ความเร็ว', 'เปลี่ยนทิศทาง', 'ชะลอ', 'หยุด', 'เบรก',
    'เร็ว', 'ว่องไว', 'agile'
  ],
  5: [
    'power', 'explosive', 'transfer', 'field actions', 'power training',
    'ระเบิด', 'พลัง', 'ยิง', 'jump', 'shooting', 'medicine ball',
    'complex', 'game-speed', 'impact'
  ]
};

const categoryKeywords = {
  'Upper Body': ['chest', 'back', 'shoulder', 'arm', 'press', 'pull', 'throw',
    'ไหล่', 'แขน', 'หลัง', 'ทรวง'],
  'Lower Body': ['leg', 'hip', 'quads', 'hamstring', 'glute', 'calf', 'squat',
    'lunge', 'step', 'jump', 'kick', 'ขา', 'สะโพก', 'เข่า', 'ข้อเท้า'],
  'Core': ['core', 'abs', 'abdominal', 'rotation', 'anti-rotation', 'crunch',
    'plank', 'sit-up', 'trunk', 'แกนกลาง', 'กล้ามส่วนท้อง'],
  'Full Body': ['landmine', 'carry', 'deadlift', 'clean', 'snatch', 'complex',
    'circuit', 'functional', 'whole body']
};

const exerciseTypeKeywords = {
  'Strength': ['strength', 'heavy', 'landmine', 'strongman', 'lift', 'press',
    'pull', 'deadlift', 'แข็ง', 'ยก'],
  'Power': ['explosive', 'power', 'jump', 'bound', 'throw', 'plyometric',
    'ระเบิด', 'พลัง', 'กระโดด'],
  'Speed/Agility': ['speed', 'agility', 'sprint', 'acceleration', 'direction',
    'change', 'deceleration', 'braking', 'เร็ว', 'ว่องไว'],
  'Mobility': ['mobility', 'flexibility', 'stretching', 'stretch', 'range',
    'ยืด', 'ยืดหย่อน'],
  'Coordination': ['coordination', 'hand-eye', 'balance', 'footwork', 'ประสาน'],
  'Stability': ['stability', 'control', 'isometric', 'hold', 'anti-',
    'ควบคุม', 'มั่นคง']
};

// Classify exercise (check title, description, and tags)
function classifyLevel(exercise) {
  const titleLower = exercise.title.toLowerCase();
  const descLower = exercise.description.toLowerCase();
  const tagText = exercise.tags?.join(' ').toLowerCase() || '';
  const fullText = titleLower + ' ' + descLower + ' ' + tagText;

  // Check levels in reverse order (1 to 5) to catch lower levels first
  for (let level = 1; level <= 5; level++) {
    const keywords = levelKeywords[level];
    if (keywords.some(kw => fullText.includes(kw))) {
      return level;
    }
  }
  // Default to level 3 if no match
  return 3;
}

function classifyCategory(title) {
  const titleLower = title.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => titleLower.includes(kw))) {
      return category;
    }
  }
  return 'Mixed';
}

function classifyExerciseType(title) {
  const titleLower = title.toLowerCase();

  for (const [type, keywords] of Object.entries(exerciseTypeKeywords)) {
    if (keywords.some(kw => titleLower.includes(kw))) {
      return type;
    }
  }
  return 'Conditioning';
}

function extractExerciseName(title) {
  // Get first 50 characters or until first period
  const match = title.match(/^([^.!?]+)/);
  return match ? match[1].trim() : title.substring(0, 50);
}

// Extract tags from title
function extractTags(title) {
  const tags = [];
  const hashtagMatch = title.match(/#(\w+)/g);
  if (hashtagMatch) {
    tags.push(...hashtagMatch.map(t => t.substring(1)));
  }
  return tags;
}

// Classify all exercises
const classified = videos.map((video, index) => {
  const tags = extractTags(video.title);
  const exerciseObj = {
    title: extractExerciseName(video.title),
    description: video.title,
    tags: tags
  };

  return {
    id: video.id,
    order: index + 1,
    title: exerciseObj.title,
    description: exerciseObj.description,
    level: classifyLevel(exerciseObj),
    category: classifyCategory(video.title),
    type: classifyExerciseType(video.title),
    soloOrPartner: video.title.toLowerCase().includes('2') ||
                    video.title.toLowerCase().includes('คน') ? 'Partner' : 'Solo',
    url: video.url,
    videoId: video.id,
    thumbnailUrl: video.thumbnailUrl,
    tags: tags
  };
});

// Group by level
const byLevel = {};
for (let i = 1; i <= 5; i++) {
  byLevel[i] = classified.filter(ex => ex.level === i);
}

// Output results
console.log('\n=== EXERCISE CLASSIFICATION RESULTS ===\n');
console.log(`Total exercises: ${classified.length}\n`);

for (let level = 1; level <= 5; level++) {
  console.log(`Level ${level}: ${byLevel[level].length} exercises`);
}

console.log('\n=== BREAKDOWN BY CATEGORY ===\n');
const byCategory = {};
classified.forEach(ex => {
  if (!byCategory[ex.category]) byCategory[ex.category] = [];
  byCategory[ex.category].push(ex);
});

for (const [category, exercises] of Object.entries(byCategory)) {
  console.log(`${category}: ${exercises.length} exercises`);
}

console.log('\n=== BREAKDOWN BY EXERCISE TYPE ===\n');
const byType = {};
classified.forEach(ex => {
  if (!byType[ex.type]) byType[ex.type] = [];
  byType[ex.type].push(ex);
});

for (const [type, exercises] of Object.entries(byType)) {
  console.log(`${type}: ${exercises.length} exercises`);
}

// Save classified data
const output = {
  total: classified.length,
  timestamp: new Date().toISOString(),
  exercises: classified,
  summary: {
    byLevel,
    byCategory,
    byType
  }
};

fs.writeFileSync('./data/exercises-classified.json', JSON.stringify(output, null, 2));
console.log('\n✅ Saved to data/exercises-classified.json');

// Save training-drills.json for the app
const trainingDrills = {
  exercises: classified.map(ex => ({
    id: ex.videoId,
    order: ex.order,
    name: ex.title,
    description: ex.description,
    level: ex.level,
    category: ex.category,
    type: ex.type,
    soloOrPartner: ex.soloOrPartner,
    videoUrl: ex.url,
    thumbnailUrl: ex.thumbnailUrl,
    tags: ex.tags,
    instructions: generateInstructions(ex),
    sets: generateSets(ex.level),
    restPeriod: generateRestPeriod(ex.type),
    gifPath: `data/gifs/${ex.videoId}.gif`
  }))
};

fs.writeFileSync('./docs/data/training-drills.json', JSON.stringify(trainingDrills, null, 2));
console.log('✅ Saved to docs/data/training-drills.json');

// Helper functions
function generateInstructions(exercise) {
  const typeInstructions = {
    'Strength': `Perform with controlled tempo. Focus on proper form. Use heavy weight with 6-10 reps.`,
    'Power': `Execute with maximal velocity and quality. Stop when speed decreases. Full recovery between sets.`,
    'Speed/Agility': `Perform at game speed. Focus on technique and direction changes. High intensity, controlled rest.`,
    'Mobility': `Perform with full range of motion. Hold stretches for 20-30 seconds. Breathe deeply.`,
    'Coordination': `Focus on precision and timing. Quality over speed initially. Progress to game speed.`,
    'Stability': `Hold positions with proper alignment. Maintain tension throughout. Control breathing.`,
    'Conditioning': `Maintain steady intensity. Complete all reps with quality. Short rest periods.`
  };

  return typeInstructions[exercise.type] || 'Perform with focus on proper form and breathing.';
}

function generateSets(level) {
  const setSchemes = {
    1: { sets: 3, reps: '12-15', rest: '60s' },
    2: { sets: 3, reps: '10-12', rest: '75s' },
    3: { sets: 4, reps: '6-10', rest: '90s' },
    4: { sets: 5, reps: '5-8', rest: '120s' },
    5: { sets: 5, reps: '3-5', rest: '150s' }
  };

  return setSchemes[level] || { sets: 3, reps: '8-10', rest: '60s' };
}

function generateRestPeriod(type) {
  const restPeriods = {
    'Strength': '2-3 minutes',
    'Power': '2-3 minutes',
    'Speed/Agility': '60-90 seconds',
    'Mobility': '20-30 seconds (hold)',
    'Coordination': '60 seconds',
    'Stability': '45-60 seconds',
    'Conditioning': '30-45 seconds'
  };

  return restPeriods[type] || '60 seconds';
}

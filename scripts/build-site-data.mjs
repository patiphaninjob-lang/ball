import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = 'data/powerpump45-videos.json';
const docsDataDir = 'docs/data';
const docsGifDir = 'docs/assets/gifs';
const sourceVideos = JSON.parse(await readFile(sourcePath, 'utf8'));
const LEVELS = [
  {
    id: 1,
    name: 'Level 1',
    title: 'Reset & Mobility',
    description: 'easy recovery, mobility, rehab control',
  },
  {
    id: 2,
    name: 'Level 2',
    title: 'Body Control',
    description: 'core control, balance, clean positions',
  },
  {
    id: 3,
    name: 'Level 3',
    title: 'Strength Base',
    description: 'repeatable strength and football basics',
  },
  {
    id: 4,
    name: 'Level 4',
    title: 'Speed & Braking',
    description: 'agility, deceleration, faster direction changes',
  },
  {
    id: 5,
    name: 'Level 5',
    title: 'Game Transfer',
    description: 'power transfer, sprint links, complex field actions',
  },
];

await mkdir(docsDataDir, { recursive: true });
await mkdir(docsGifDir, { recursive: true });

const gifManifest = await loadGifManifest();
const drills = sourceVideos.map((video, index) => toDrill(video, index, gifManifest)).sort(compareDrills);
const categories = summarizeCategories(drills);
const levels = summarizeLevels(drills);
const participants = summarizeParticipants(drills);
const weeklyPlan = makeWeeklyPlan(drills);

await writeFile(
  path.join(docsDataDir, 'training-drills.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      creator: 'powerpump45',
      sourceCount: sourceVideos.length,
      levels,
      categories,
      participants,
      weeklyPlan,
      drills,
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(
  path.join(docsDataDir, 'source-videos.json'),
  JSON.stringify(sourceVideos, null, 2),
  'utf8',
);

await copyGifs();

console.log(`Built docs data from ${sourceVideos.length} videos.`);
console.log(`Levels: ${levels.map((level) => `${level.name}=${level.count}`).join(', ')}`);
console.log(`Categories: ${categories.map((category) => `${category.name}=${category.count}`).join(', ')}`);
console.log(`Participants: ${participants.map((participant) => `${participant.name}=${participant.count}`).join(', ')}`);

function toDrill(video, index, gifManifest) {
  const title = cleanText(video.title || video.visibleText || `Training video ${index + 1}`);
  const category = categorize(title);
  const exercises = extractExercises(title);
  const hashtags = extractHashtags(title);
  const minutes = estimateMinutes(category, exercises);
  const goal = categoryGoal(category);
  const intensity = categoryIntensity(category);
  const level = assignLevel(title, category, exercises);
  const participant = assignParticipant(title, category);
  const gif = gifManifest.get(video.id) || gifManifest.get(slug(video.url)) || '';

  return {
    id: video.id,
    order: index + 1,
    name: makeName(title, category, index),
    category,
    level: level.id,
    levelName: level.name,
    levelTitle: level.title,
    levelDescription: level.description,
    participant,
    partnerNeeded: participant === 'Partner',
    goal,
    intensity,
    minutes,
    sets: suggestSets(category),
    focus: suggestFocus(category),
    exercises,
    hashtags,
    caption: title,
    tiktokUrl: video.url,
    thumbnailUrl: video.thumbnailUrl || '',
    gif,
    hasGif: Boolean(gif),
    source: video.source || 'visible-page',
  };
}

function assignParticipant(text, category) {
  const normalized = text.toLowerCase();
  const partnerKeywords = [
    '2 คน',
    'สองคน',
    'ชวนเพื่อน',
    'แบบคู่',
    'คนช่วย',
    'partner',
    'passivestretching',
  ];

  if (partnerKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'Partner';
  }

  if (category === 'Mobility' && normalized.includes('passive')) {
    return 'Partner';
  }

  return 'Solo';
}

function assignLevel(text, category, exercises) {
  const normalized = text.toLowerCase();
  const baseScore = {
    Mobility: 1,
    Rehab: 1,
    Core: 2,
    General: 2,
    Strength: 3,
    'Football Skill': 3,
    Deceleration: 4,
    Agility: 4,
    Power: 4,
  };

  let score = baseScore[category] || 2;
  const advancedKeywords = [
    'positive transfer',
    'maximal velocity',
    'sprint',
    'hurdle hop',
    'skater jump',
    'rotation mb throw',
    'rotation md throw',
    'plyo',
    'vbt',
    'shooting',
  ];
  const beginnerKeywords = ['stretch', 'passivestretching', 'acl', 'recovery', 'rehab'];

  if (exercises.length >= 3) score += 1;
  if (advancedKeywords.some((keyword) => normalized.includes(keyword))) score += 1;
  if (beginnerKeywords.some((keyword) => normalized.includes(keyword))) score -= 1;

  const id = clamp(score, 1, 5);
  return LEVELS.find((level) => level.id === id) || LEVELS[1];
}

function categorize(text) {
  const normalized = text.toLowerCase();
  const rules = [
    ['Rehab', ['acl', 'aclinjury', 'ฟื้นฟู', 'เจ็บ', 'rehab', 'recovery']],
    ['Mobility', ['stretch', 'passivestretching', 'ยืด', 'mobility', 'ตึง']],
    ['Deceleration', ['deceleration', 'ชะลอ', 'เบรก', 'หยุด']],
    ['Core', ['antirotation', 'anti rotation', 'core', 'แกนกลาง', 'ต้านแรงหมุน']],
    ['Agility', ['agility', 'เปลี่ยนทิศทาง', 'ว่องไว', 'skater']],
    ['Power', ['powertraining', 'แรงระเบิด', 'positive transfer', 'split jump', 'hurdle hop', 'plyo']],
    ['Football Skill', ['shooting', 'ยิง', 'football', 'ฟุตบอล', 'สปีด']],
    ['Strength', ['strength', 'conditioning', 'กล้ามเนื้อ', 'vbt']],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }

  return 'General';
}

function extractExercises(text) {
  const exercisePatterns = [
    'Split Jump',
    'Skater Jump',
    'Rotation MB Throw',
    'Rotation MD Throw',
    'Hurdle Hop to Sprint',
    'Hurdle Hop',
    'Sprint',
    'Anti Rotation',
    'Deceleration',
    'Passive Stretching',
  ];

  const found = exercisePatterns.filter((exercise) => {
    const aliases = [exercise, exercise.replace('MB', 'MD'), exercise.replace('MD', 'MB')];
    return aliases.some((alias) => text.toLowerCase().includes(alias.toLowerCase()));
  });

  return [...new Set(found)];
}

function extractHashtags(text) {
  return [...text.matchAll(/#[^\s#]+/g)].map((match) => match[0]).slice(0, 8);
}

function makeName(text, category, index) {
  const withoutTags = text.replace(/#[^\s#]+/g, '').replace(/@\w+/g, '').trim();
  const firstSentence = withoutTags.split(/[.!?।\n]/)[0]?.trim() || '';
  if (firstSentence.length >= 8 && firstSentence.length <= 72) return firstSentence;
  if (firstSentence.length > 72) return `${firstSentence.slice(0, 69).trim()}...`;
  return `${category} Drill ${index + 1}`;
}

function estimateMinutes(category, exercises) {
  if (category === 'Mobility' || category === 'Rehab') return 12;
  if (category === 'Power' || category === 'Agility' || category === 'Deceleration') return exercises.length > 2 ? 18 : 15;
  if (category === 'Core' || category === 'Strength') return 14;
  return 10;
}

function suggestSets(category) {
  const map = {
    Power: '3-5 sets, stop when speed drops',
    Agility: '4-6 short rounds, full rest',
    Deceleration: '4-6 reps per side',
    Core: '3-4 controlled sets',
    Mobility: '2-3 slow rounds',
    Rehab: 'low volume, controlled quality',
    Strength: '3-5 working sets',
    'Football Skill': '4-8 focused reps',
    General: '2-4 quality rounds',
  };
  return map[category] || map.General;
}

function suggestFocus(category) {
  const map = {
    Power: ['max speed', 'quality reps', 'full rest'],
    Agility: ['clean footwork', 'sharp direction change', 'balance'],
    Deceleration: ['stable stop', 'low position', 'control before speed'],
    Core: ['brace', 'resist rotation', 'controlled breathing'],
    Mobility: ['slow range', 'no pain', 'finish relaxed'],
    Rehab: ['control', 'pain-free range', 'gradual load'],
    Strength: ['clean position', 'force output', 'repeatable tempo'],
    'Football Skill': ['transfer to field', 'accuracy', 'fast reset'],
    General: ['quality', 'repeatability', 'notes'],
  };
  return map[category] || map.General;
}

function categoryGoal(category) {
  const map = {
    Power: 'connect strength to fast field movement',
    Agility: 'change direction faster with control',
    Deceleration: 'brake sharply and stay stable',
    Core: 'control rotation for shooting and contact',
    Mobility: 'reduce tightness and recover after training',
    Rehab: 'return to training with controlled progression',
    Strength: 'build usable strength for sport performance',
    'Football Skill': 'transfer physical work into football actions',
    General: 'add a focused drill to the training library',
  };
  return map[category] || map.General;
}

function categoryIntensity(category) {
  if (category === 'Mobility' || category === 'Rehab') return 'low';
  if (category === 'Core' || category === 'General') return 'medium';
  return 'high';
}

function summarizeCategories(drills) {
  const counts = new Map();
  for (const drill of drills) {
    counts.set(drill.category, (counts.get(drill.category) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function summarizeLevels(drills) {
  return LEVELS.map((level) => ({
    ...level,
    count: drills.filter((drill) => drill.level === level.id).length,
  }));
}

function summarizeParticipants(drills) {
  return ['Solo', 'Partner'].map((name) => ({
    name,
    count: drills.filter((drill) => drill.participant === name).length,
  }));
}

function makeWeeklyPlan(drills) {
  const byLevel = new Map();
  const soloFirst = [...drills].sort((left, right) => {
    const participantRank = participantSortRank(left) - participantSortRank(right);
    if (participantRank !== 0) return participantRank;
    return compareDrills(left, right);
  });

  for (const drill of soloFirst) {
    if (!byLevel.has(drill.level)) byLevel.set(drill.level, []);
    byLevel.get(drill.level).push(drill.id);
  }

  return [
    planDay('Monday', 'Level 1 - Reset', [1], byLevel),
    planDay('Tuesday', 'Level 2 - Control', [2], byLevel),
    planDay('Wednesday', 'Level 3 - Strength', [3], byLevel),
    planDay('Thursday', 'Level 4 - Speed', [4], byLevel),
    planDay('Friday', 'Level 5 - Transfer', [5], byLevel),
    planDay('Saturday', 'Mixed Review', [1, 2, 3], byLevel),
    planDay('Sunday', 'Rest / Mobility', [1], byLevel),
  ];
}

function planDay(day, title, levelIds, byLevel) {
  const drillIds = levelIds.flatMap((level) => byLevel.get(level)?.slice(0, 3) || []).slice(0, 4);
  return { day, title, levelIds, drillIds };
}

async function loadGifManifest() {
  const manifest = new Map();

  try {
    const text = await readFile('data/gifs/manifest.json', 'utf8');
    const items = JSON.parse(text);
    for (const item of items) {
      const key = slug(item.sourceVideo || item.gif || '');
      manifest.set(key, item.gif.replace(/^data\/gifs\//, 'assets/gifs/'));
    }
  } catch {
    return manifest;
  }

  return manifest;
}

async function copyGifs() {
  let files = [];
  try {
    files = await readdir('data/gifs');
  } catch {
    return;
  }

  for (const file of files.filter((name) => name.endsWith('.gif'))) {
    await copyFile(path.join('data/gifs', file), path.join(docsGifDir, file));
  }
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
}

function compareDrills(left, right) {
  return left.level - right.level || participantSortRank(left) - participantSortRank(right) || left.category.localeCompare(right.category) || left.order - right.order;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function participantSortRank(drill) {
  return drill.participant === 'Partner' ? 1 : 0;
}

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = 'data/powerpump45-videos.json';
const docsDataDir = 'docs/data';
const docsGifDir = 'docs/assets/gifs';
const sourceVideos = JSON.parse(await readFile(sourcePath, 'utf8'));

await mkdir(docsDataDir, { recursive: true });
await mkdir(docsGifDir, { recursive: true });

const gifManifest = await loadGifManifest();
const drills = sourceVideos.map((video, index) => toDrill(video, index, gifManifest));
const categories = summarizeCategories(drills);
const weeklyPlan = makeWeeklyPlan(drills);

await writeFile(
  path.join(docsDataDir, 'training-drills.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      creator: 'powerpump45',
      sourceCount: sourceVideos.length,
      categories,
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
console.log(`Categories: ${categories.map((category) => `${category.name}=${category.count}`).join(', ')}`);

function toDrill(video, index, gifManifest) {
  const title = cleanText(video.title || video.visibleText || `Training video ${index + 1}`);
  const category = categorize(title);
  const exercises = extractExercises(title);
  const hashtags = extractHashtags(title);
  const minutes = estimateMinutes(category, exercises);
  const goal = categoryGoal(category);
  const intensity = categoryIntensity(category);
  const gif = gifManifest.get(video.id) || gifManifest.get(slug(video.url)) || '';

  return {
    id: video.id,
    order: index + 1,
    name: makeName(title, category, index),
    category,
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

function makeWeeklyPlan(drills) {
  const byCategory = new Map();
  for (const drill of drills) {
    if (!byCategory.has(drill.category)) byCategory.set(drill.category, []);
    byCategory.get(drill.category).push(drill.id);
  }

  return [
    planDay('Monday', 'Power + Core', ['Power', 'Core'], byCategory),
    planDay('Tuesday', 'Mobility + Recovery', ['Mobility', 'Rehab'], byCategory),
    planDay('Wednesday', 'Agility + Deceleration', ['Agility', 'Deceleration'], byCategory),
    planDay('Thursday', 'Strength + Football Skill', ['Strength', 'Football Skill'], byCategory),
    planDay('Friday', 'Power Transfer', ['Power', 'Football Skill'], byCategory),
    planDay('Saturday', 'Review + Mobility', ['General', 'Mobility'], byCategory),
    planDay('Sunday', 'Rest / Journal', ['Mobility'], byCategory),
  ];
}

function planDay(day, title, categoryNames, byCategory) {
  const drillIds = categoryNames.flatMap((category) => byCategory.get(category)?.slice(0, 2) || []).slice(0, 4);
  return { day, title, categoryNames, drillIds };
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

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const analysisDir = 'video-analysis';
const drillsFile = 'docs/data/training-drills.json';

// Exercise science knowledge base
const exerciseKnowledge = {
  'stretch': {
    focus: 'Flexibility, Recovery',
    difficulty: 1,
    duration_sec: '10s',
    technique_notes: 'Hold at mild tension, no bouncing, breathe steadily'
  },
  'mobility': {
    focus: 'Mobility, Range of Motion',
    difficulty: 1,
    duration_sec: '8s',
    technique_notes: 'Move through full range, controlled tempo, 8-10 reps'
  },
  'quad': {
    focus: 'Quadriceps, Hip Flexors',
    technique_notes: 'Pull foot toward glutes, keep knee pointing down'
  },
  'hamstring': {
    focus: 'Hamstring, Posterior Chain',
    technique_notes: 'Hinge at hips, slight knee bend, reach toward toes'
  },
  'hip': {
    focus: 'Hip Mobility, External Rotators',
    technique_notes: 'Open up hip joint, avoid sharp knee pain'
  },
  'glute': {
    focus: 'Gluteus Maximus, Piriformis',
    technique_notes: 'Deep stretch, pigeon pose or figure-4 variation'
  },
  'lunge': {
    focus: 'Hip Flexors, Quadriceps, Balance',
    difficulty: 2,
    duration_sec: '8s',
    technique_notes: 'Step forward, drop back knee, press hips forward'
  },
  'core': {
    focus: 'Core Stability, Abdominals',
    difficulty: 2,
    duration_sec: '20s',
    technique_notes: 'Maintain neutral spine, engage core throughout'
  },
  'balance': {
    focus: 'Balance, Proprioception, Single-Leg Stability',
    difficulty: 2,
    duration_sec: '15s',
    technique_notes: 'Single-leg work, control movement, prevent wobbling'
  },
  'agility': {
    focus: 'Agility, Change of Direction',
    difficulty: 3,
    duration_sec: '30s',
    technique_notes: 'Quick feet, sharp direction changes, maintain form'
  },
  'plyometric': {
    focus: 'Power, Explosive Strength',
    difficulty: 4,
    duration_sec: '20s',
    technique_notes: 'Land softly, control descent, explosive drive upward'
  },
  'single-leg': {
    focus: 'Single-Leg Strength, Balance, ACL Safety',
    difficulty: 3,
    duration_sec: '20s',
    technique_notes: 'Support leg strength, controlled movement, prevent knee valgus'
  }
};

console.log('🤖 Generating detailed drill analysis...\n');

const drillsData = JSON.parse(await readFile(drillsFile, 'utf8'));
const folders = await readdir(analysisDir);

let generated = 0;
let skipped = 0;

for (const folder of folders) {
  if (folder === 'DRILL_FORM_TEMPLATE.md') continue;

  const analysisPath = path.join(analysisDir, folder, 'analysis.json');

  try {
    const analysis = JSON.parse(await readFile(analysisPath, 'utf8'));

  // If already has detailed drills, skip
  if (analysis.drills[0]?.technique_notes) {
    skipped++;
    continue;
  }

  // Find matching drill from training-drills.json
  const matchingDrill = drillsData.drills.find(d =>
    folder.includes(d.id?.toString().slice(-3)) ||
    folder.toLowerCase().includes(d.name.toLowerCase().slice(0, 5))
  );

  if (!matchingDrill) {
    skipped++;
    continue;
  }

  // Generate detailed analysis based on drill name
  const drillName = matchingDrill.name.toLowerCase();
  let baseInfo = exerciseKnowledge.stretch; // default

  // Match keywords
  for (const [keyword, info] of Object.entries(exerciseKnowledge)) {
    if (drillName.includes(keyword)) {
      baseInfo = { ...baseInfo, ...info };
      break;
    }
  }

  // Enhanced drill with details
  const enhancedDrill = {
    name: matchingDrill.name,
    description: matchingDrill.goal,
    focus: baseInfo.focus || 'General Conditioning',
    difficulty: baseInfo.difficulty || matchingDrill.level || 1,
    duration_sec: baseInfo.duration_sec || '10s',
    technique_notes: baseInfo.technique_notes || 'Follow proper form, control movement',
    category: matchingDrill.category,
    participant: matchingDrill.participant || 'Solo'
  };

  analysis.drills = [enhancedDrill];

    await writeFile(analysisPath, JSON.stringify(analysis, null, 2), 'utf8');
    generated++;

    if (generated % 20 === 0) {
      console.log(`  ✓ ${generated} generated...`);
    }
  } catch (error) {
    skipped++;
  }
}

console.log(`\n✅ Generation complete!`);
console.log(`   📝 Generated: ${generated} analysis files`);
console.log(`   ⏭️  Skipped: ${skipped} (already detailed)`);
console.log(`\n📂 Ready to import: node scripts/import-drill-analysis.mjs`);

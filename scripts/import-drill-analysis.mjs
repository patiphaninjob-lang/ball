import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const analysisDir = 'video-analysis';
const drillsFile = 'docs/data/training-drills.json';

console.log('📥 Importing drill analysis...\n');

// Read all analysis.json files
const folders = await readdir(analysisDir);
const analysisFiles = folders.filter(f => f !== 'DRILL_FORM_TEMPLATE.md');

let imported = 0;
let skipped = 0;
const updates = [];

for (const folder of analysisFiles) {
  const analysisPath = path.join(analysisDir, folder, 'analysis.json');

  try {
    const content = await readFile(analysisPath, 'utf8');
    const analysis = JSON.parse(content);

    if (!analysis.drills || analysis.drills.length === 0) {
      skipped++;
      continue;
    }

    updates.push({
      folder,
      drills: analysis.drills
    });

    imported++;
    if (imported % 10 === 0) {
      console.log(`  ✓ ${imported} analyzed...`);
    }
  } catch (error) {
    // Skip if file not found or invalid JSON
    skipped++;
  }
}

if (updates.length === 0) {
  console.log('❌ No analysis.json files found with drill data.');
  console.log('   Fill in video-analysis/*/analysis.json first!\n');
  process.exit(1);
}

// Read current drills
const drillsData = JSON.parse(await readFile(drillsFile, 'utf8'));

// Map folders to drills by index
let drillIndex = 0;
const originalCount = drillsData.drills.length;

for (const { folder, drills } of updates) {
  if (drillIndex >= drillsData.drills.length) break;

  const firstDrill = drills[0];
  const currentDrill = drillsData.drills[drillIndex];

  // Update first drill from this analysis
  if (firstDrill.name) currentDrill.name = firstDrill.name;
  if (firstDrill.description) currentDrill.goal = firstDrill.description;
  if (firstDrill.focus) currentDrill.focus = firstDrill.focus;
  if (firstDrill.difficulty) currentDrill.level = firstDrill.difficulty;
  if (firstDrill.technique_notes) currentDrill.cues = firstDrill.technique_notes;

  // If there are more drills in this video, insert them
  if (drills.length > 1) {
    const newDrills = drills.slice(1).map((drill, idx) => ({
      id: Math.random().toString(36).substring(7),
      order: currentDrill.order + idx + 1,
      name: drill.name || `${folder} - Drill ${idx + 2}`,
      category: currentDrill.category,
      level: drill.difficulty || currentDrill.level,
      goal: drill.description || currentDrill.goal,
      intensity: currentDrill.intensity,
      minutes: parseInt(drill.duration_sec) || 5,
      sets: 1,
      focus: drill.focus || currentDrill.focus,
      gif: currentDrill.gif,
      hasGif: currentDrill.hasGif,
      cues: drill.technique_notes || '',
      participant: 'Solo'
    }));

    // Insert after current drill
    drillsData.drills.splice(drillIndex + 1, 0, ...newDrills);
  }

  drillIndex++;
}

// Save updated drills
await writeFile(drillsFile, JSON.stringify(drillsData, null, 2), 'utf8');

console.log(`\n✅ Import complete!`);
console.log(`   📊 Imported: ${imported} videos`);
console.log(`   ⏭️  Skipped: ${skipped} (empty/invalid)`);
console.log(`   📈 Drills before: ${originalCount}`);
console.log(`   📈 Drills after: ${drillsData.drills.length}`);
console.log(`\n   Updated: ${drillsFile}`);

#!/usr/bin/env node
import { execSync } from 'child_process';
import { readdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import path from 'path';

const clipsDir = 'exercise-analysis/clips';
const gifsDir = 'exercise-analysis/gifs';
const mpFiles = readdirSync(clipsDir).filter(f => f.endsWith('.mp4')).sort();

console.log(`🎬 Converting ${mpFiles.length} MP4 clips to GIF...\n`);

let converted = 0;
let errors = 0;

mpFiles.forEach((file, idx) => {
  const inputPath = path.join(clipsDir, file);
  const gifName = file.replace('.mp4', '.gif');
  const outputPath = path.join(gifsDir, gifName);

  try {
    // FFmpeg to GIF: 10fps, scale down to 320px width
    const cmd = `ffmpeg -i "${inputPath}" -vf "fps=10,scale=320:-1:flags=lanczos" -loop 0 "${outputPath}" -y 2>&1`;
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });

    converted++;

    if ((idx + 1) % 30 === 0) {
      console.log(`   [${idx + 1}/${mpFiles.length}] ✅ Converted ${gifName}`);
    }
  } catch (e) {
    errors++;
    console.log(`   ❌ ${gifName}: ${e.message.split('\n')[0]}`);
  }
});

console.log(`\n✅ Conversion complete!`);
console.log(`📊 Statistics:`);
console.log(`   Converted: ${converted}`);
console.log(`   Errors: ${errors}`);
console.log(`\n📁 GIFs saved to: ${gifsDir}/`);
console.log(`📊 Total GIFs: ${readdirSync(gifsDir).filter(f => f.endsWith('.gif')).length}`);

// Update file references
console.log('\n🔄 Updating file references...');
const dbFile = 'exercise-analysis/exercise-database.json';
const db = JSON.parse(readFileSync(dbFile, 'utf8'));

db.exercises.forEach(ex => {
  if (ex.clipFile) {
    ex.clipFile = ex.clipFile.replace('.mp4', '.gif');
  }
});

writeFileSync(dbFile, JSON.stringify(db, null, 2) + '\n');
console.log('✅ Database updated with GIF references');

console.log('\n📋 Next steps:');
console.log('   1. npm run smart:categorize');
console.log('   2. npm run merge:clips');
console.log('   3. Copy gifs to docs/exercises/');

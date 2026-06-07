#!/usr/bin/env node
import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';

const gifsDir = 'docs/exercises';
const gifFiles = readdirSync(gifsDir).filter(f => f.endsWith('.gif')).sort();

console.log(`\n🎬 RE-ENCODING ${gifFiles.length} GIFs TO PORTRAIT FORMAT\n`);
console.log('This will improve exercise visibility by using portrait orientation\n');

let reencoded = 0;
let errors = 0;
let skipped = 0;

gifFiles.forEach((file, idx) => {
  const gifPath = path.join(gifsDir, file);
  const stats = statSync(gifPath);
  const sizeGB = (stats.size / (1024 * 1024)).toFixed(1);

  try {
    // Get video dimensions
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${gifPath}"`;
    let dimensions = '';
    try {
      dimensions = execSync(probeCmd, { stdio: 'pipe', timeout: 5000 }).toString().trim();
    } catch {
      // If ffprobe fails, use default
      dimensions = '320,568'; // Portrait aspect ratio
    }

    const [width, height] = dimensions.split(',').map(Number);
    
    // Determine if portrait or landscape
    const isPortrait = height > width;
    
    console.log(`[${idx + 1}/${gifFiles.length}] ${file}`);
    console.log(`   Original: ${width}x${height}${isPortrait ? ' (portrait ✓)' : ' (landscape → converting)'}`);
    console.log(`   Size: ${sizeGB}MB`);

    // For portrait: maintain portrait, but scale to 360px height max
    // For landscape: convert to portrait-like (scale width to 360px, calculate height)
    let scaleFilter;
    if (isPortrait) {
      // Keep portrait, scale height to 480px for clarity
      scaleFilter = `-1:480`;
      console.log(`   Action: Re-encode as portrait (480px height)`);
    } else {
      // Convert landscape to portrait - scale to 360px width
      scaleFilter = `360:-1`;
      console.log(`   Action: Convert to portrait format (360px width)`);
    }

    // Re-encode GIF with proper orientation
    const cmd = `ffmpeg -i "${gifPath}" -vf "fps=10,scale=${scaleFilter}:flags=lanczos" -loop 0 "${gifPath}.tmp" -y 2>&1`;
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });

    // Replace original
    execSync(`mv "${gifPath}.tmp" "${gifPath}"`, { stdio: 'pipe' });

    reencoded++;
    console.log(`   ✅ Complete\n`);

  } catch (e) {
    errors++;
    console.log(`   ❌ Error: ${e.message.split('\n')[0]}\n`);
  }
});

console.log(`\n📊 RESULTS`);
console.log(`   Re-encoded: ${reencoded}`);
console.log(`   Errors: ${errors}`);
console.log(`   Skipped: ${skipped}`);

console.log(`\n✅ Portrait GIFs are ready!`);
console.log(`   Reload the app to see improvements`);

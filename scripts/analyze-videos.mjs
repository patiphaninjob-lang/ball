import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const inputDir = 'videos';
const outputDir = 'video-analysis';
const framesPerVideo = 6; // Extract 6 frames per video
const interval = 3; // Every 3 seconds

await mkdir(outputDir, { recursive: true });

const files = (await readdir(inputDir))
  .filter((file) => /\.(mp4|mov|m4v|webm)$/i.test(file))
  .sort(); // All videos

console.log(`Analyzing ${files.length} videos...\n`);

let skipped = 0;

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const baseName = path.basename(file, path.extname(file));
  const videoDir = path.join(outputDir, baseName);

  try {
    await mkdir(videoDir, { recursive: true });

    console.log(`📹 ${file}`);

    // Extract frames at intervals
    const frameOutputPattern = path.join(videoDir, 'frame-%03d.png');

    await runFfmpeg([
      '-i', inputPath,
      '-vf', `fps=1/${interval}`,
      '-vframes', String(framesPerVideo),
      frameOutputPattern
    ]);
  } catch (error) {
    skipped++;
    console.log(`⏭️  Skipped: ${file} (not a video file)`);
    continue;
  }

  // Create analysis form
  const form = {
    filename: file,
    folder: videoDir,
    frames: Array.from({ length: framesPerVideo }, (_, i) => `frame-${String(i+1).padStart(3, '0')}.png`),
    drills: [
      {
        name: '',
        description: '',
        focus: '',
        difficulty: 1,
        duration_sec: `${interval}s`
      }
    ]
  };

  await writeFile(
    path.join(videoDir, 'analysis.json'),
    JSON.stringify(form, null, 2),
    'utf8'
  );

  console.log(`  ✅ Frames extracted → ${videoDir}/`);
  console.log(`  📋 Form: ${videoDir}/analysis.json\n`);
}

console.log(`\n✅ Analysis complete! Check: ${outputDir}/`);
console.log(`📊 Processed: ${files.length - skipped}/${files.length} videos`);
console.log('📝 Edit analysis.json for each video with drill details.');

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
    });
  });
}

#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const analysisFile = 'exercise-analysis/video-segments.json';
const analysis = JSON.parse(readFileSync(analysisFile, 'utf8'));

const clipsDir = 'exercise-analysis/clips';
const dbFile = 'exercise-analysis/exercise-database.json';

mkdirSync(clipsDir, { recursive: true });

console.log('🎬 Batch extracting ALL exercises from 164 videos...\n');

const exerciseDatabase = {
  generatedAt: new Date().toISOString(),
  totalVideosAnalyzed: analysis.length,
  totalClipsExtracted: 0,
  exercises: [],
  categories: {}
};

let clipCount = 0;
let successCount = 0;
let errorCount = 0;

analysis.forEach((video, videoIdx) => {
  if (!video.duration || isNaN(video.duration)) {
    // Skip corrupted videos
    return;
  }

  const exercises = video.possibleSegments.filter(seg => seg.type.startsWith('exercise'));

  exercises.forEach((segment, segIdx) => {
    clipCount++;
    const clipName = `${videoIdx + 1}-${segIdx + 1}`;
    const inputPath = path.join('../Video', video.video);
    const outputPath = path.join(clipsDir, `${clipName}.mp4`);

    try {
      // Extract segment using ffmpeg (fast copy, no re-encoding)
      const cmd = `ffmpeg -i "${inputPath}" -ss ${segment.start} -to ${segment.end} -c copy -y "${outputPath}" 2>&1`;
      execSync(cmd, {
        stdio: 'pipe',
        timeout: 30000
      });

      successCount++;

      const exerciseEntry = {
        id: clipName,
        sourceVideo: video.video,
        clipFile: path.basename(outputPath),
        videoIndex: videoIdx + 1,
        exerciseIndex: segIdx + 1,
        startTime: segment.start,
        endTime: segment.end,
        duration: parseFloat((segment.end - segment.start).toFixed(2)),
        confidence: segment.confidence,
        category: 'uncategorized',
        tags: [],
        status: 'extracted',
        notes: ''
      };

      exerciseDatabase.exercises.push(exerciseEntry);

      if (clipCount % 20 === 0) {
        console.log(`   [${clipCount}] ✅ ${clipName} (${exercises.length} from ${video.video})`);
      }
    } catch (e) {
      errorCount++;
      console.log(`   ❌ ${clipName}: ${e.message.split('\n')[0]}`);
    }
  });
});

// Build category stats
exerciseDatabase.exercises.forEach(ex => {
  if (!exerciseDatabase.categories[ex.category]) {
    exerciseDatabase.categories[ex.category] = 0;
  }
  exerciseDatabase.categories[ex.category]++;
});

exerciseDatabase.totalClipsExtracted = successCount;

// Save database
writeFileSync(dbFile, JSON.stringify(exerciseDatabase, null, 2));

console.log(`\n✅ Batch extraction complete!`);
console.log(`📊 Statistics:`);
console.log(`   Total clips processed: ${clipCount}`);
console.log(`   Successfully extracted: ${successCount}`);
console.log(`   Errors: ${errorCount}`);
console.log(`\n📁 Clips saved to: ${clipsDir}/`);
console.log(`📄 Database saved to: ${dbFile}`);
console.log(`\n🏷️ Next step: Categorize exercises by type`);
console.log(`   Run: npm run categorize:exercises`);

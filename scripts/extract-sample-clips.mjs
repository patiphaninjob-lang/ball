#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const analysisFile = 'exercise-analysis/video-segments.json';
const analysis = JSON.parse(readFileSync(analysisFile, 'utf8'));

const samplesDir = 'exercise-analysis/samples';
mkdirSync(samplesDir, { recursive: true });

console.log('🎬 Extracting sample clips from first 5 videos...\n');

const samplesToExtract = analysis.slice(0, 5).filter(v => v.duration && !isNaN(v.duration));

const clips = [];

samplesToExtract.forEach((video, videoIdx) => {
  console.log(`\n📹 ${videoIdx + 1}/5 ${video.video}`);

  // Find exercise segments only (skip intro/outro)
  const exercises = video.possibleSegments.filter(seg => seg.type.startsWith('exercise'));

  exercises.forEach((segment, segIdx) => {
    const clipName = `${videoIdx + 1}-${segIdx + 1}`;
    const inputPath = path.join('../Video', video.video);
    const outputPath = path.join(samplesDir, `${clipName}.mp4`);

    try {
      // Extract segment using ffmpeg
      const cmd = `ffmpeg -i "${inputPath}" -ss ${segment.start} -to ${segment.end} -c copy -y "${outputPath}" 2>&1`;
      execSync(cmd, { stdio: 'pipe' });

      const clipInfo = {
        video: video.video,
        clipName,
        videoIndex: videoIdx + 1,
        exerciseIndex: segIdx + 1,
        outputFile: path.basename(outputPath),
        startTime: segment.start,
        endTime: segment.end,
        duration: parseFloat((segment.end - segment.start).toFixed(2)),
        confidence: segment.confidence,
        status: 'pending_review'
      };

      clips.push(clipInfo);
      console.log(`   ✅ ${clipName}: ${clipInfo.duration}s`);
    } catch (e) {
      console.log(`   ❌ ${clipName}: extraction failed`);
    }
  });
});

// Save clip manifest
const manifest = {
  generatedAt: new Date().toISOString(),
  totalSamples: clips.length,
  samplesDir,
  clips,
  instructions: {
    review: 'Watch each clip and verify it shows only the exercise (no talking/intro)',
    categorize: 'Classify each as: Mobility | Power | Strength | Balance | Agility | Flexibility | Rehab',
    feedback: 'Mark as ✅ correct, ❌ bad, or 🔄 needs_retrim'
  }
};

writeFileSync(
  path.join(samplesDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`\n✅ Sample extraction complete!`);
console.log(`📁 Clips saved to: ${samplesDir}/`);
console.log(`📊 Total samples: ${clips.length}`);
console.log(`\n📋 Review them and update manifest.json with your feedback:`);
console.log(`   - Set status to: ✅/❌/🔄 for each clip`);
console.log(`   - Add exercise_type: (Mobility, Power, Strength, etc.)`);
console.log(`   - Add any notes about timing adjustments needed`);

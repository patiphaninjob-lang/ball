#!/usr/bin/env node
import { execSync } from 'child_process';
import { readdirSync, writeFileSync, statSync } from 'fs';
import path from 'path';

const videoDir = '../Video';
const outputDir = 'exercise-analysis';
const videos = readdirSync(videoDir).filter(f => f.endsWith('.mp4')).sort();

console.log(`📹 Analyzing ${videos.length} videos for exercise segments...\n`);

const analysis = videos.map((filename, idx) => {
  const filePath = path.join(videoDir, filename);

  // Get duration
  let duration = 0;
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8' }
    );
    duration = parseFloat(output.trim());
  } catch (e) {
    console.log(`⚠️  ${idx + 1}/${videos.length} ${filename} - Error getting duration`);
    return null;
  }

  // Detect scene cuts using scdet filter
  let sceneFrames = [];
  try {
    const sceneOutput = execSync(
      `ffmpeg -i "${filePath}" -vf "scdet=s=13:t=10" -f null - 2>&1`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );

    // Parse scene detection output: "frame=XXX" and "Parsed_scdet"
    const frameMatches = sceneOutput.match(/frame=\s*(\d+)/g);
    const sceneMatches = sceneOutput.match(/Parsed_scdet[^\n]*score=([0-9.]+)/g);

    if (sceneMatches) {
      sceneMatches.forEach(match => {
        const score = parseFloat(match.match(/score=([0-9.]+)/)[1]);
        if (score > 0.1) sceneFrames.push(score);
      });
    }
  } catch (e) {
    // Scene detection sometimes fails, continue with duration-based analysis
  }

  // Estimate segments based on duration
  const segments = estimateSegments(duration, sceneFrames);

  console.log(`✅ ${idx + 1}/${videos.length} ${filename.padEnd(40)} ${duration.toFixed(1)}s → ${segments.length} segments`);

  return {
    video: filename,
    duration: parseFloat(duration.toFixed(2)),
    fileSize: `${(statSync(filePath).size / 1024 / 1024).toFixed(1)}MB`,
    detectedScenes: sceneFrames.length,
    possibleSegments: segments,
    analyzed: new Date().toISOString(),
  };
}).filter(Boolean);

// Write analysis
writeFileSync(
  path.join(outputDir, 'video-segments.json'),
  JSON.stringify(analysis, null, 2)
);

console.log(`\n✅ Analysis complete!`);
console.log(`📊 Saved to: ${outputDir}/video-segments.json`);
console.log(`\n📈 Summary:`);
console.log(`   Total videos: ${analysis.length}`);
console.log(`   Total duration: ${(analysis.reduce((sum, v) => sum + v.duration, 0) / 60).toFixed(1)} minutes`);
console.log(`   Avg segments per video: ${(analysis.reduce((sum, v) => sum + v.possibleSegments.length, 0) / analysis.length).toFixed(1)}`);

function estimateSegments(duration, sceneFrames) {
  const segments = [];

  // Very short videos (< 2s) = skip
  if (duration < 2) {
    return [{ start: 0, end: duration, type: 'skip_too_short', confidence: 0 }];
  }

  // Short videos (2-5s) = likely 1 exercise
  if (duration < 5) {
    return [
      { start: 0, end: duration, type: 'exercise', confidence: 0.7 }
    ];
  }

  // Medium videos (5-30s) = intro + exercise + outro
  if (duration < 30) {
    const intro = Math.min(2, duration * 0.1); // 10% or 2s max
    const outro = Math.min(2, duration * 0.1);
    const exerciseEnd = duration - outro;

    if (intro > 0.5) {
      segments.push({ start: 0, end: intro, type: 'intro', confidence: 0.6 });
    }
    segments.push({ start: intro, end: exerciseEnd, type: 'exercise', confidence: 0.8 });
    if (outro > 0.5) {
      segments.push({ start: exerciseEnd, end: duration, type: 'outro', confidence: 0.6 });
    }
    return segments;
  }

  // Longer videos (30-120s) = intro + multiple exercises + outro
  const intro = Math.min(3, duration * 0.08);
  const outro = Math.min(3, duration * 0.08);
  const exerciseDuration = duration - intro - outro;

  // Estimate 3-5 exercises per minute
  const estimatedExercises = Math.max(2, Math.ceil(exerciseDuration / 12));
  const exerciseLength = exerciseDuration / estimatedExercises;

  if (intro > 0.5) {
    segments.push({ start: 0, end: intro, type: 'intro', confidence: 0.5 });
  }

  for (let i = 0; i < estimatedExercises; i++) {
    const start = intro + (i * exerciseLength);
    const end = Math.min(intro + ((i + 1) * exerciseLength), duration - outro);
    segments.push({
      start: parseFloat(start.toFixed(2)),
      end: parseFloat(end.toFixed(2)),
      type: `exercise_${i + 1}`,
      confidence: 0.6,
      duration: parseFloat((end - start).toFixed(2))
    });
  }

  if (outro > 0.5) {
    segments.push({ start: duration - outro, end: duration, type: 'outro', confidence: 0.5 });
  }

  return segments;
}

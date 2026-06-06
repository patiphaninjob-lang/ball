import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const inputDir = args.input || 'Video';
const outputDir = args.output || 'docs/data/gifs';
const start = Number(args.start || 0);
const duration = Number(args.duration || args.seconds || 4);
const fps = Number(args.fps || 8);
const width = Number(args.width || 240);

if (!ffmpegPath) {
  throw new Error('ffmpeg-static did not provide an ffmpeg binary.');
}

await mkdir(inputDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

const files = (await readdir(inputDir))
  .filter((file) => /\.(mp4|mov|m4v|webm|mkv)$/i.test(file))
  .sort((left, right) => left.localeCompare(right));

if (files.length === 0) {
  console.log(`No video files found in ${inputDir}. Add .mp4/.mov/.webm files and run again.`);
  process.exit(0);
}

const manifest = [];

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const baseName = path.basename(file, path.extname(file));
  const gifPath = path.join(outputDir, `${baseName}.gif`);

  console.log(`Creating animated GIF: ${file}`);

  try {
    // Simple FFmpeg GIF conversion without palettegen
    await runFfmpeg([
      '-y',
      '-ss',
      String(start),
      '-t',
      String(duration),
      '-i',
      inputPath,
      '-vf',
      `scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse,fps=${fps}`,
      gifPath,
    ]);

    manifest.push({
      sourceVideo: normalizePath(inputPath),
      gif: normalizePath(gifPath),
      start,
      duration,
      fps,
      width,
    });
  } catch (error) {
    console.warn(`  ⚠️  Skipped: ${error.message.split('\n')[0]}`);
  }
}

const manifestPath = path.join(outputDir, 'manifest.json');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('');
console.log(`Done. Created ${manifest.length} animated GIF files.`);
console.log(`Manifest: ${manifestPath}`);

function runFfmpeg(ffmpegArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ffmpegArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
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

function normalizePath(value) {
  return value.replaceAll(path.sep, '/');
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) continue;

    const [key, inlineValue] = arg.slice(2).split('=');
    const nextValue = rawArgs[index + 1];
    const value = inlineValue ?? (nextValue && !nextValue.startsWith('--') ? nextValue : 'true');
    parsed[key] = value;

    if (inlineValue === undefined && nextValue && !nextValue.startsWith('--')) {
      index += 1;
    }
  }

  return parsed;
}

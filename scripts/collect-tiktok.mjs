import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const profileUrl = args.url || 'https://www.tiktok.com/@powerpump45';
const maxScrolls = Number(args.scrolls || 40);
const waitMs = Number(args.wait || 1500);
const outDir = args.out || 'data';
const browserProfileDir = args.browserProfile || '.browser-profile';
const shouldEnrich = args.enrich !== 'false';

if (!profileUrl.startsWith('https://www.tiktok.com/@')) {
  throw new Error('Use a TikTok profile URL such as https://www.tiktok.com/@powerpump45');
}

await mkdir(outDir, { recursive: true });

const slug = profileUrl
  .replace(/^https:\/\/www\.tiktok\.com\//, '')
  .replace(/[^\w-]+/g, '-')
  .replace(/^-|-$/g, '');

const jsonPath = path.join(outDir, `${slug}-videos.json`);
const csvPath = path.join(outDir, `${slug}-videos.csv`);

const context = await chromium.launchPersistentContext(browserProfileDir, {
  headless: false,
  viewport: { width: 1280, height: 900 },
});

try {
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('TikTok collector is open.');
  console.log('- Log in manually if TikTok asks.');
  console.log('- Solve any verification manually.');
  console.log('- The script only reads visible video links from the page.');
  console.log('');
  console.log('Collection starts in 15 seconds...');
  await page.waitForTimeout(15000);

  const seen = new Map();

  for (let index = 0; index <= maxScrolls; index += 1) {
    const videos = await collectVisibleVideos(page);
    for (const video of videos) {
      if (!seen.has(video.id)) {
        seen.set(video.id, {
          id: video.id,
          url: video.url,
          visibleText: normalizeWhitespace(video.visibleText),
          title: '',
          authorName: '',
          thumbnailUrl: '',
          embedHtml: '',
          source: 'visible-page',
        });
      }
    }

    console.log(`Scroll ${index}/${maxScrolls}: found ${seen.size} videos`);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.4));
    await page.waitForTimeout(waitMs);
  }

  const records = [...seen.values()];

  if (shouldEnrich) {
    for (const record of records) {
      const enriched = await getOembed(record.url);
      if (enriched) {
        record.title = enriched.title || '';
        record.authorName = enriched.author_name || '';
        record.thumbnailUrl = enriched.thumbnail_url || '';
        record.embedHtml = enriched.html || '';
        record.source = `${record.source}+oembed`;
      }
    }
  }

  await writeFile(jsonPath, JSON.stringify(records, null, 2), 'utf8');
  await writeFile(csvPath, `\uFEFF${toCsv(records)}`, 'utf8');

  console.log('');
  console.log(`Saved ${records.length} videos`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV:  ${csvPath}`);
  console.log('');
} finally {
  await context.close();
}

async function collectVisibleVideos(page) {
  return page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a[href*="/video/"]')];

    return anchors
      .map((anchor) => {
        const href = anchor.href.split('?')[0];
        const match = href.match(/\/@([^/]+)\/video\/(\d+)/);
        if (!match) return null;

        const cardText = findCardText(anchor);
        return {
          id: match[2],
          url: `https://www.tiktok.com/@${match[1]}/video/${match[2]}`,
          visibleText: cardText || anchor.getAttribute('aria-label') || anchor.textContent || '',
        };
      })
      .filter(Boolean);

    function findCardText(anchor) {
      let node = anchor;
      for (let depth = 0; depth < 5 && node; depth += 1) {
        const text = node.textContent?.trim();
        if (text) return text;
        node = node.parentElement;
      }
      return '';
    }
  });
}

async function getOembed(videoUrl) {
  const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toCsv(records) {
  const headers = [
    'id',
    'url',
    'title',
    'authorName',
    'thumbnailUrl',
    'visibleText',
    'source',
  ];

  const rows = records.map((record) => headers.map((header) => csvCell(record[header])));
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function csvCell(value) {
  const text = String(value || '');
  return `"${text.replace(/"/g, '""')}"`;
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

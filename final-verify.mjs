import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = '/tmp/verify-gifs';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function verify() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  const screenshotPath = (name) => path.join(screenshotDir, `${name}.png`);

  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

  try {
    console.log('Opening app at http://localhost:4173...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take screenshot of home page
    await page.screenshot({ path: screenshotPath('01-home'), fullPage: true });
    console.log('✅ Screenshot 1: Home page with drill cards');

    // Count visible elements
    const drillCards = await page.locator('.drill-card').count();
    const images = await page.locator('.drill-card img').count();
    console.log(`📊 Drill cards: ${drillCards}, GIF images: ${images}`);

    // Check first GIF
    const firstGif = await page.locator('.drill-card img').first();
    const src = await firstGif.getAttribute('src');
    const alt = await firstGif.getAttribute('alt');
    console.log(`\n📸 First GIF:`);
    console.log(`  src: ${src}`);
    console.log(`  alt: ${alt}`);

    // Take close-up of first card
    await page.locator('.drill-card').first().screenshot({ path: screenshotPath('02-first-card') });
    console.log('✅ Screenshot 2: First drill card close-up');

    // Scroll down to load more
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1500);

    // Switch to library view
    await page.click('button[data-view="library"]');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: screenshotPath('03-library'), fullPage: true });
    console.log('✅ Screenshot 3: Library view');

    // Count all visible GIFs in library
    const libraryImages = await page.locator('.drill-grid img').count();
    console.log(`📊 Library images visible: ${libraryImages}`);

    console.log(`\n✅ Verification complete!`);
    console.log(`\nScreenshots saved to: ${screenshotDir}`);
    console.log('Check if images show movement/animation');

    // Keep browser open for 5 seconds so you can see it
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

verify();

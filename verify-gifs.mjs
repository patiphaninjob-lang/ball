import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotDir = '/tmp/verify-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function verify() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening app at http://localhost:4173...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: path.join(screenshotDir, '1-home.png'), fullPage: true });
    console.log('✅ Screenshot 1: Home page');

    // Check if GIFs are loaded
    const gifImages = await page.locator('.media img').count();
    console.log(`📊 Found ${gifImages} GIF images on page`);

    // Click on a drill card to see if GIF loads
    await page.click('.drill-card img');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: path.join(screenshotDir, '2-clicked.png'), fullPage: true });
    console.log('✅ Screenshot 2: After clicking a drill');

    // Check library view for more GIFs
    await page.click('button[data-view="library"]');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(screenshotDir, '3-library.png'), fullPage: true });
    console.log('✅ Screenshot 3: Library view with all drills');

    // Get GIF element details
    const firstGif = await page.locator('.media img').first();
    const src = await firstGif.getAttribute('src');
    const alt = await firstGif.getAttribute('alt');
    console.log(`\n📸 First GIF details:`);
    console.log(`  src: ${src}`);
    console.log(`  alt: ${alt}`);

    // Check if GIF element exists and has dimensions
    const box = await firstGif.boundingBox();
    console.log(`  dimensions: ${box?.width}x${box?.height}`);

    console.log('\n✅ Verification complete');
    console.log(`Screenshots saved to: ${screenshotDir}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

verify();

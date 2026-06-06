import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Opening app...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check page content
    const html = await page.content();
    console.log('Page loaded. Checking for elements...\n');

    // Check for images
    const images = await page.locator('img').count();
    console.log(`Total <img> tags: ${images}`);

    // Check for drill cards
    const cards = await page.locator('.drill-card').count();
    console.log(`Drill cards: ${cards}`);

    // Check for media divs
    const media = await page.locator('.media').count();
    console.log(`Media containers: ${media}`);

    // Check for errors in console
    page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

    // Get first image source
    const firstImg = await page.locator('img').first();
    const src = await firstImg.getAttribute('src').catch(() => 'N/A');
    console.log(`\nFirst image src: ${src}`);

    // Check data-training-drills.json
    const drillsData = await page.evaluate(() => {
      return window.__drillsData || 'Not found';
    });
    console.log(`\nDrills data loaded in window: ${typeof drillsData === 'object' ? 'YES' : 'NO'}`);

    // Check for any errors
    const errorCount = await page.locator('.is-broken').count();
    console.log(`Broken images: ${errorCount}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debug();

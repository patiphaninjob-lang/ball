import { chromium } from 'playwright';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  // Capture console messages
  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    if (msg.type() === 'error') errors.push(msg.text());
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture page crashes
  page.on('error', err => {
    console.error('Page error:', err);
    errors.push(err.toString());
  });

  try {
    console.log('Loading http://localhost:4173...\n');
    const response = await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    console.log(`\nPage response status: ${response.status()}`);
    await page.waitForTimeout(2000);

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check if HTML loaded
    const hasMainTag = await page.locator('main').count();
    console.log(`Main element found: ${hasMainTag > 0 ? 'YES' : 'NO'}`);

    // Check if app.js executed
    const stateData = await page.evaluate(() => {
      return {
        stateExists: typeof window.state !== 'undefined',
        dataLoaded: typeof window.state?.data !== 'undefined',
        viewsLoaded: typeof window.render !== 'undefined'
      };
    });
    console.log(`\nApp state:`, stateData);

    // Get innerHTML to see what was rendered
    const bodyContent = await page.locator('body').innerHTML();
    const contentLength = bodyContent.length;
    const hasDrillCards = bodyContent.includes('drill-card');
    console.log(`\nBody content length: ${contentLength} chars`);
    console.log(`Contains "drill-card": ${hasDrillCards ? 'YES' : 'NO'}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors captured:`);
      errors.forEach(e => console.log(`  - ${e}`));
    }

  } catch (error) {
    console.error('\nNavigation error:', error.message);
  } finally {
    await browser.close();
  }
}

debug();

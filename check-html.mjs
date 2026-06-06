import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect all console output
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Get actual HTML
    const html = await page.content();
    const hasToday = html.includes('id="todayView"');
    const hasLibrary = html.includes('id="libraryView"');
    const hasTemplate = html.includes('id="drillCardTemplate"');

    console.log(`\n✓ Has #todayView: ${hasToday}`);
    console.log(`✓ Has #libraryView: ${hasLibrary}`);
    console.log(`✓ Has #drillCardTemplate: ${hasTemplate}`);

    // Check for script errors by looking at what app.js actually did
    const hasErrors = await page.evaluate(() => {
      return {
        stateCreated: typeof state !== 'undefined',
        mainExecuting: typeof main === 'function',
        loadJsonFunction: typeof loadJson === 'function'
      };
    });

    console.log(`\nApp functions:`);
    console.log(` - state created: ${hasErrors.stateCreated}`);
    console.log(` - main function exists: ${hasErrors.mainExecuting}`);
    console.log(` - loadJson function exists: ${hasErrors.loadJsonFunction}`);

    // Try to see body structure
    const bodyHTML = await page.locator('body').innerHTML();
    console.log(`\nBody HTML length: ${bodyHTML.length}`);
    console.log(`Body contains "drill": ${bodyHTML.includes('drill')}`);
    console.log(`Body contains "เลือก": ${bodyHTML.includes('เลือก')}`);

    console.log(`\nAll console messages (${consoleMessages.length}):`);
    consoleMessages.forEach(msg => console.log(`  ${msg}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

check();

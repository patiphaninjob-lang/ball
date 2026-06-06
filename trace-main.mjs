import { chromium } from 'playwright';

async function trace() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Intercept fetch calls
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('training-drills')) {
      console.log(`🔍 Fetch: ${url}`);
    }
    route.continue();
  });

  // Try to call main manually
  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('Calling main() manually...');
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('data/training-drills.json');
        console.log(`Fetch response status: ${response.status}`);

        if (!response.ok) {
          console.error(`Fetch failed: ${response.statusText}`);
          return { error: response.statusText, status: response.status };
        }

        const data = await response.json();
        console.log(`Data loaded:`,{
          hasdrills: !!data.drills,
          drillsCount: data.drills?.length,
          haslevels: !!data.levels,
          hascategories: !!data.categories
        });

        return {
          success: true,
          drillsCount: data.drills?.length,
          hasLevels: !!data.levels,
          hasCategories: !!data.categories
        };

      } catch (error) {
        console.error('Fetch error:', error.message);
        return { error: error.message };
      }
    });

    console.log('\nFetch result:', result);

    // Now manually call main
    console.log('\nManually calling main()...');
    await page.evaluate(async () => {
      await main();
      console.log('main() completed');
    });

    // Check if render happened
    const cardCount = await page.locator('.drill-card').count();
    console.log(`\nDrill cards rendered: ${cardCount}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

trace();

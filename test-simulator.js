const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Navigate to the simulator
  console.log('🚀 Navigating to http://localhost:3000/sim...');
  await page.goto('http://localhost:3000/sim');

  // Wait for the page to load
  console.log('⏳ Waiting for page to load...');
  await page.waitForTimeout(3000);

  // Try to interact with play concept selector
  console.log('🔄 Testing play concept interaction...');
  try {
    const playSelector = await page.$('[data-testid="play-selector"]');
    if (playSelector) {
      await playSelector.click();
      console.log('✅ Play selector clicked');
      await page.waitForTimeout(1000);
    } else {
      console.log('❌ Play selector not found');
    }
  } catch (error) {
    console.log(`❌ Error clicking play selector: ${error.message}`);
  }

  // Try to interact with coverage selector
  console.log('🔄 Testing coverage interaction...');
  try {
    const coverageSelector = await page.$('[data-testid="coverage-selector"]');
    if (coverageSelector) {
      await coverageSelector.click();
      console.log('✅ Coverage selector clicked');
      await page.waitForTimeout(1000);
    } else {
      console.log('❌ Coverage selector not found');
    }
  } catch (error) {
    console.log(`❌ Error clicking coverage selector: ${error.message}`);
  }

  // Wait a bit more to see any delayed logs
  await page.waitForTimeout(5000);

  console.log('🏁 Test completed. Keeping browser open for inspection...');

  // Keep the browser open for manual inspection
  // Comment out the next line if you want to close automatically
  // await browser.close();
})();
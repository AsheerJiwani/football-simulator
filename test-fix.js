const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();

  // Log all console messages, especially looking for our engine initialization logs
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Log any page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  console.log('🚀 Testing simulator with hydration fix...');
  await page.goto('http://localhost:3000/sim', { waitUntil: 'networkidle' });

  console.log('⏳ Waiting 8 seconds for initialization...');
  await page.waitForTimeout(8000);

  // Check if we now see our engine logs
  const hasLoadingText = await page.evaluate(() => {
    return document.body.textContent.includes('Loading simulator...');
  });

  console.log(`📊 Still showing loading state: ${hasLoadingText}`);

  // Look for any data-testid elements (should appear when components mount)
  const testIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));
  });

  console.log(`🔍 Found data-testid elements: ${testIds.length > 0 ? testIds.join(', ') : 'None'}`);

  // Try clicking on a selector to see if it works
  try {
    const selects = await page.$$('select');
    if (selects.length > 0) {
      console.log(`✅ Found ${selects.length} select elements - components are rendering!`);
      await selects[0].click();
      await page.waitForTimeout(1000);
    } else {
      console.log('❌ No select elements found');
    }
  } catch (error) {
    console.log(`⚠️ Select interaction failed: ${error.message}`);
  }

  console.log('🏁 Test completed - check console logs above for engine initialization messages');

  // Keep browser open for inspection
  await new Promise(() => {});
})();
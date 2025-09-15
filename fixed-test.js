const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();

  // Log all console messages with better formatting
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Log page errors with stack traces
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  // Log network failures
  page.on('requestfailed', request => {
    console.log(`[NETWORK FAILED] ${request.url()}`);
    console.log(`Error: ${request.failure()?.errorText}`);
  });

  // Navigate and wait longer
  console.log('🚀 Navigating to simulator...');
  try {
    await page.goto('http://localhost:3000/sim', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ Navigation completed');
  } catch (error) {
    console.log(`❌ Navigation failed: ${error.message}`);
  }

  // Wait for page to load completely
  console.log('⏳ Waiting for page to load...');
  await page.waitForTimeout(5000);

  // Check what's actually rendered in the DOM
  const pageContent = await page.evaluate(() => {
    return {
      title: document.title,
      hasLoadingText: document.body.textContent.includes('Loading simulator...'),
      bodyClasses: document.body.className,
      scripts: Array.from(document.querySelectorAll('script')).length,
      hasTopPanel: !!document.querySelector('.bg-gray-900'),
      hasFieldCanvas: !!document.querySelector('.bg-gradient-to-br'),
      clientOnlyElements: document.querySelectorAll('[data-client-only]').length,
      allDataTestIds: Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'))
    };
  });

  console.log('📊 Page analysis:', pageContent);

  // Check specific for engine initialization logs after waiting more
  console.log('⏳ Waiting longer for potential initialization...');
  await page.waitForTimeout(8000);

  // Try to manually trigger any pending effects by scrolling/clicking
  console.log('🔄 Trying to trigger React effects...');
  try {
    await page.mouse.click(300, 300);
    await page.waitForTimeout(2000);

    // Try clicking on any visible elements
    const clickableElements = await page.$$('button, select');
    if (clickableElements.length > 0) {
      console.log(`Found ${clickableElements.length} clickable elements, trying first one...`);
      await clickableElements[0].click();
      await page.waitForTimeout(2000);
    }
  } catch (error) {
    console.log(`Click interaction failed: ${error.message}`);
  }

  console.log('🏁 Test completed. Check browser for visual inspection.');

  // Keep the browser open
  await new Promise(() => {});
})();
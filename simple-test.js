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
  await page.waitForTimeout(10000);

  // Check what's actually rendered in the DOM
  const pageContent = await page.evaluate(() => {
    return {
      title: document.title,
      hasClientOnly: !!document.querySelector('[data-client-only]'),
      hasLoadingText: !!document.querySelector('text="Loading simulator..."') || document.body.textContent.includes('Loading simulator...'),
      bodyClasses: document.body.className,
      scripts: Array.from(document.querySelectorAll('script')).length,
      consoleErrors: window.console.error.toString()
    };
  });

  console.log('📊 Page analysis:', pageContent);

  // Try to force client-side hydration by interacting with the page
  console.log('🔄 Triggering potential hydration...');
  await page.mouse.move(300, 300);
  await page.mouse.click(300, 300);
  await page.waitForTimeout(3000);

  console.log('🏁 Test completed. Browser will stay open for manual inspection.');
})();
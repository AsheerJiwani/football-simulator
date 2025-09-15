const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true // Open dev tools automatically
  });
  const page = await browser.newPage();

  // Collect all console messages
  const logs = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const logEntry = `[${type.toUpperCase()}] ${text}`;
    console.log(logEntry);
    logs.push(logEntry);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const errorEntry = `[PAGE ERROR] ${error.message}`;
    console.log(errorEntry);
    logs.push(errorEntry);
  });

  // Capture network failures
  page.on('requestfailed', request => {
    const failEntry = `[NETWORK FAILED] ${request.url()} - ${request.failure()?.errorText}`;
    console.log(failEntry);
    logs.push(failEntry);
  });

  console.log('🚀 Navigating to simulator...');
  await page.goto('http://localhost:3000/sim', { waitUntil: 'networkidle' });

  console.log('⏳ Waiting for page to fully load...');
  await page.waitForTimeout(5000);

  console.log('🔍 Checking for engine initialization logs...');

  // Look for specific elements that should be rendered
  const elements = await page.$$('[data-testid]');
  console.log(`Found ${elements.length} elements with data-testid`);

  // Check if the loading state is still showing
  const loadingText = await page.$('text="Loading simulator..."');
  if (loadingText) {
    console.log('⚠️ Page is still in loading state');
  } else {
    console.log('✅ Loading state has completed');
  }

  console.log('\n📊 All collected logs:');
  logs.forEach(log => console.log(log));

  console.log('\n🏁 Keeping browser open for manual inspection...');
})();
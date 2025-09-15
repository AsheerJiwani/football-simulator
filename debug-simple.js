const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();

  // Log console messages
  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Log page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  console.log('🚀 Testing debug page...');
  await page.goto('http://localhost:3000/debug', { waitUntil: 'networkidle' });

  console.log('⏳ Waiting 5 seconds...');
  await page.waitForTimeout(5000);

  // Check if it mounted
  const content = await page.textContent('body');
  console.log('📄 Page content includes:', content?.includes('React hydration is working'));

  console.log('🚀 Now testing main sim page...');
  await page.goto('http://localhost:3000/sim', { waitUntil: 'networkidle' });

  console.log('⏳ Waiting 5 seconds...');
  await page.waitForTimeout(5000);

  console.log('🏁 Comparison complete. Check console logs above.');

  // Keep browser open
  await new Promise(() => {});
})();
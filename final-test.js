const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();

  // Log console messages, focusing on engine initialization
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();

    // Only log our important messages and errors
    if (text.includes('🚀') || text.includes('✅') || text.includes('📊') ||
        text.includes('🏈') || text.includes('🛡️') || text.includes('⏱️') ||
        text.includes('🔍') || text.includes('❌') || type === 'error') {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });

  console.log('🚀 Final test: Checking if simulator is working...');
  await page.goto('http://localhost:3000/sim', { waitUntil: 'networkidle' });

  // Wait for initialization
  console.log('⏳ Waiting for initialization...');
  await page.waitForTimeout(5000);

  // Check page state
  const pageState = await page.evaluate(() => {
    const body = document.body;
    const hasLoadingText = body.textContent.includes('Loading simulator...');
    const hasTopPanel = !!document.querySelector('.bg-gray-900');
    const hasFieldCanvas = !!document.querySelector('.bg-gradient-to-br');
    const selectElements = document.querySelectorAll('select').length;
    const dataTestIds = Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));

    return {
      hasLoadingText,
      hasTopPanel,
      hasFieldCanvas,
      selectElements,
      dataTestIds,
      title: document.title,
      bodyTextLength: body.textContent.length
    };
  });

  console.log('📊 Page State:', pageState);

  // Try interacting with a dropdown to see if it works
  if (pageState.selectElements > 0) {
    console.log('🔄 Testing dropdown interaction...');
    try {
      await page.selectOption('select:nth-of-type(1)', 'mesh');
      console.log('✅ Dropdown interaction successful!');
    } catch (error) {
      console.log(`⚠️ Dropdown interaction failed: ${error.message}`);
    }
  }

  // Take a screenshot for analysis
  await page.screenshot({ path: 'simulator-state.png' });
  console.log('📷 Screenshot saved as simulator-state.png');

  console.log('🏁 Final test completed! The simulator should be working now.');

  // Keep browser open for manual verification
  await new Promise(() => {});
})();
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();

  // Detailed network logging
  page.on('request', request => {
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
  });

  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400) {
      console.log(`[RESPONSE ERROR] ${status} ${url}`);
    } else {
      console.log(`[RESPONSE OK] ${status} ${url}`);
    }
  });

  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()}`);
    console.log(`[FAILURE REASON] ${request.failure()?.errorText}`);
  });

  // Console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`[CONSOLE ERROR] ${text}`);
    } else {
      console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
    }
  });

  // Page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    if (error.stack) {
      console.log(`[STACK] ${error.stack}`);
    }
  });

  console.log('🚀 Navigating with detailed network logging...');

  try {
    await page.goto('http://localhost:3000/sim', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ Navigation completed');

    // Wait and see what happens
    console.log('⏳ Monitoring for 10 seconds...');
    await page.waitForTimeout(10000);

    // Check if React has actually hydrated
    const hydrationCheck = await page.evaluate(() => {
      // Check if React is present and has hydrated
      const reactPresent = !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
      const hasReactRoots = document.querySelector('[data-reactroot]') ||
                           document.querySelector('#__next') ||
                           document.querySelectorAll('[data-react-checksum]').length > 0;

      return {
        reactPresent,
        hasReactRoots,
        documentReadyState: document.readyState,
        scriptCount: document.querySelectorAll('script').length,
        bodyText: document.body.textContent.includes('Loading simulator...')
      };
    });

    console.log('🔍 Hydration check:', hydrationCheck);

  } catch (error) {
    console.log(`❌ Navigation/execution failed: ${error.message}`);
  }

  console.log('🏁 Network debugging complete. Browser stays open.');

  // Keep browser open
  await new Promise(() => {});
})();
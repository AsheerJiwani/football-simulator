const { chromium } = require('playwright');
const fs = require('fs');

async function testUISimple() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const issues = [];

  console.log('🚀 Starting Simple UI Test...\n');

  try {
    // Navigate to the simulator
    console.log('1. Navigating to simulator...');
    await page.goto('http://localhost:3002/sim', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait longer for React to render

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/initial.png', fullPage: true });

    // Check for any elements on the page
    console.log('\n2. Checking page elements...');

    // Check for SVG (field)
    const svg = await page.locator('svg').first();
    const svgExists = await svg.count() > 0;
    console.log(`   - SVG field exists: ${svgExists}`);

    if (!svgExists) {
      issues.push('SVG field not found');
    }

    // Check for circles (players) - only count those with data-player-type="player"
    const allCircles = await page.locator('circle').count();
    const playerCircles = await page.locator('circle[data-player-type="player"]').count();
    console.log(`   - Total circles: ${allCircles}`);
    console.log(`   - Player circles: ${playerCircles}`);

    if (playerCircles === 0) {
      issues.push('No player circles found on field');
    } else if (playerCircles !== 14) {
      issues.push(`Expected 14 players, found ${playerCircles}`);
    }

    // Check for offensive players (blue) - only count player circles
    const bluePlayers = await page.locator('circle[data-team="offense"]').count();
    console.log(`   - Blue (offensive) players: ${bluePlayers}`);

    if (bluePlayers === 0) {
      issues.push('No offensive players (blue) found');
    } else if (bluePlayers !== 7) {
      issues.push(`Expected 7 offensive players, found ${bluePlayers}`);
    }

    // Check for defensive players (red) - only count player circles
    const redPlayers = await page.locator('circle[data-team="defense"]').count();
    console.log(`   - Red (defensive) players: ${redPlayers}`);

    if (redPlayers === 0) {
      issues.push('No defensive players (red) found');
    } else if (redPlayers !== 7) {
      issues.push(`Expected 7 defenders, found ${redPlayers}`);
    }

    // Check for control buttons
    console.log('\n3. Checking control elements...');

    const snapButton = await page.locator('button:has-text("Snap")').count();
    console.log(`   - Snap button exists: ${snapButton > 0}`);

    if (snapButton === 0) {
      issues.push('Snap button not found');
    }

    const resetButton = await page.locator('button:has-text("Reset")').count();
    console.log(`   - Reset button exists: ${resetButton > 0}`);

    if (resetButton === 0) {
      issues.push('Reset button not found');
    }

    // Check for dropdowns/selects
    const selects = await page.locator('select').count();
    console.log(`   - Select dropdowns: ${selects}`);

    if (selects === 0) {
      issues.push('No dropdown selects found');
    }

    // Try to get page HTML structure
    console.log('\n4. Checking page structure...');
    const bodyHTML = await page.locator('body').innerHTML();

    // Check if it's still loading
    if (bodyHTML.includes('Loading') || bodyHTML.includes('loading')) {
      issues.push('Page may still be loading');
    }

    // Check for error messages
    if (bodyHTML.includes('Error') || bodyHTML.includes('error')) {
      console.log('   ⚠️ Found error text in page');
      issues.push('Error text found in page');
    }

    // Test a play change
    console.log('\n5. Testing play concept change...');
    const playSelect = await page.locator('select').first();
    if (await playSelect.count() > 0) {
      const options = await playSelect.locator('option').allTextContents();
      console.log(`   - Available play options: ${options.join(', ')}`);

      // Try to change to a different play
      await playSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      const playersAfter = await page.locator('circle[data-player-type="player"]').count();
      console.log(`   - Players after change: ${playersAfter}`);

      await page.screenshot({ path: 'screenshots/after-play-change.png', fullPage: true });
    }

    // Test coverage change
    console.log('\n6. Testing coverage change...');
    const coverageSelect = await page.locator('select').nth(1);
    if (await coverageSelect.count() > 0) {
      const options = await coverageSelect.locator('option').allTextContents();
      console.log(`   - Available coverage options: ${options.join(', ')}`);

      // Try to change coverage
      await coverageSelect.selectOption({ index: 2 });
      await page.waitForTimeout(2000);

      const redPlayersAfter = await page.locator('circle[data-team="defense"]').count();
      console.log(`   - Defenders after change: ${redPlayersAfter}`);

      await page.screenshot({ path: 'screenshots/after-coverage-change.png', fullPage: true });
    }

    // Test snap
    console.log('\n7. Testing snap functionality...');
    const snap = await page.locator('button:has-text("Snap")').first();
    if (await snap.count() > 0) {
      await snap.click();
      await page.waitForTimeout(3000);

      const playersMoving = await page.locator('circle[data-player-type="player"]').count();
      console.log(`   - Players after snap: ${playersMoving}`);

      await page.screenshot({ path: 'screenshots/after-snap.png', fullPage: true });

      // Check if players moved
      const firstPlayerPosition = await page.locator('circle').first().getAttribute('cx');
      console.log(`   - First player X position: ${firstPlayerPosition}`);
    }

  } catch (error) {
    console.error('Error during testing:', error);
    issues.push(`Test error: ${error.message}`);
  }

  // Generate simple report
  console.log('\n📊 Test Summary');
  console.log('================');

  if (issues.length === 0) {
    console.log('✅ No issues found!');
  } else {
    console.log(`⚠️ Found ${issues.length} issues:\n`);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  // Save issues to file
  const report = `# UI Rendering Issues Report
Generated: ${new Date().toISOString()}

## Issues Found (${issues.length})

${issues.length === 0 ? 'No issues detected.' : issues.map(issue => `- ${issue}`).join('\n')}

## Screenshots
- initial.png - Initial page load
- after-play-change.png - After changing play concept
- after-coverage-change.png - After changing coverage
- after-snap.png - After clicking snap

## Recommendations

${issues.length > 0 ? `
1. Check that the simulator component is properly mounting
2. Verify that the game engine is initializing correctly
3. Check browser console for JavaScript errors
4. Ensure data is loading properly from DataLoader
5. Verify that SVG rendering is working correctly
` : 'UI appears to be rendering correctly.'}
`;

  fs.writeFileSync('UI_ISSUES_REPORT.md', report);
  console.log('\n📄 Report saved to UI_ISSUES_REPORT.md');

  // Keep browser open
  console.log('\n🔍 Browser will remain open for inspection.');
  console.log('Check the DevTools console for any errors.');
  console.log('Press Ctrl+C to close.\n');

  await new Promise(() => {});
}

testUISimple().catch(console.error);
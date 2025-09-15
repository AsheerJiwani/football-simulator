const { chromium } = require('playwright');
const fs = require('fs');

async function testUIRendering() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  console.log('🚀 Starting UI Rendering Tests...\n');

  try {
    // Navigate to the simulator
    console.log('1. Navigating to simulator...');
    await page.goto('http://localhost:3000/sim');
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });
    testResults.tests.push({
      test: 'Initial Load',
      status: 'success',
      screenshot: '01-initial-load.png'
    });

    // Test 1: Change Play Concepts
    console.log('\n2. Testing Play Concept Changes...');
    const playConcepts = ['slant-flat', 'smash', 'flood', 'four-verts', 'mesh'];

    for (const concept of playConcepts) {
      console.log(`   - Testing ${concept}...`);

      // Click play concept dropdown
      const playDropdown = await page.locator('select').first();
      if (playDropdown) {
        await playDropdown.selectOption(concept);
        await page.waitForTimeout(1000);

        // Count offensive players
        const offensePlayers = await page.locator('[data-testid*="offense"]').count();

        // Take screenshot
        await page.screenshot({
          path: `screenshots/play-${concept}.png`,
          fullPage: true
        });

        testResults.tests.push({
          test: `Play Concept: ${concept}`,
          offensePlayers: offensePlayers,
          screenshot: `play-${concept}.png`,
          status: offensePlayers > 0 ? 'success' : 'warning'
        });

        console.log(`     ✓ ${concept}: ${offensePlayers} offensive players rendered`);
      }
    }

    // Test 2: Change Coverages
    console.log('\n3. Testing Coverage Changes...');
    const coverages = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4', 'cover-6', 'tampa-2', 'quarters'];

    for (const coverage of coverages) {
      console.log(`   - Testing ${coverage}...`);

      // Look for coverage selector
      const coverageDropdown = await page.locator('select').nth(1);
      if (coverageDropdown) {
        await coverageDropdown.selectOption(coverage);
        await page.waitForTimeout(1000);

        // Count defensive players
        const defensePlayers = await page.locator('[data-testid*="defense"]').count();

        // Take screenshot
        await page.screenshot({
          path: `screenshots/coverage-${coverage}.png`,
          fullPage: true
        });

        testResults.tests.push({
          test: `Coverage: ${coverage}`,
          defensePlayers: defensePlayers,
          screenshot: `coverage-${coverage}.png`,
          status: defensePlayers === 7 ? 'success' : 'error',
          issue: defensePlayers !== 7 ? `Expected 7 defenders, found ${defensePlayers}` : null
        });

        console.log(`     ${defensePlayers === 7 ? '✓' : '✗'} ${coverage}: ${defensePlayers} defensive players (expected 7)`);
      }
    }

    // Test 3: Test Motion
    console.log('\n4. Testing Motion...');

    // Try to click motion button
    const motionButton = await page.locator('button:has-text("Motion")').first();
    if (motionButton) {
      await motionButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'screenshots/motion-active.png',
        fullPage: true
      });

      testResults.tests.push({
        test: 'Motion',
        status: 'tested',
        screenshot: 'motion-active.png'
      });

      console.log('   ✓ Motion tested');
    }

    // Test 4: Test Snap
    console.log('\n5. Testing Snap...');

    const snapButton = await page.locator('button:has-text("Snap")').first();
    if (snapButton) {
      await snapButton.click();
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: 'screenshots/post-snap.png',
        fullPage: true
      });

      testResults.tests.push({
        test: 'Snap',
        status: 'tested',
        screenshot: 'post-snap.png'
      });

      console.log('   ✓ Snap tested');
    }

    // Test 5: Test Reset
    console.log('\n6. Testing Reset...');

    const resetButton = await page.locator('button:has-text("Reset")').first();
    if (resetButton) {
      await resetButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'screenshots/after-reset.png',
        fullPage: true
      });

      testResults.tests.push({
        test: 'Reset',
        status: 'tested',
        screenshot: 'after-reset.png'
      });

      console.log('   ✓ Reset tested');
    }

    // Test 6: Personnel Changes
    console.log('\n7. Testing Personnel Changes...');
    const personnelOptions = ['11', '12', '10', '21'];

    for (const personnel of personnelOptions) {
      console.log(`   - Testing ${personnel} personnel...`);

      // Look for personnel selector
      const personnelButton = await page.locator(`button:has-text("${personnel}")`).first();
      if (personnelButton) {
        await personnelButton.click();
        await page.waitForTimeout(1000);

        const totalPlayers = await page.locator('circle').count();

        await page.screenshot({
          path: `screenshots/personnel-${personnel}.png`,
          fullPage: true
        });

        testResults.tests.push({
          test: `Personnel: ${personnel}`,
          totalPlayers: totalPlayers,
          screenshot: `personnel-${personnel}.png`,
          status: totalPlayers === 14 ? 'success' : 'warning'
        });

        console.log(`     ✓ ${personnel}: ${totalPlayers} total players`);
      }
    }

  } catch (error) {
    console.error('Error during testing:', error);
    testResults.error = error.message;
  }

  // Generate report
  console.log('\n📊 Generating Test Report...');

  const report = `# UI Rendering Test Report
Generated: ${testResults.timestamp}

## Test Summary
Total Tests: ${testResults.tests.length}
Successful: ${testResults.tests.filter(t => t.status === 'success').length}
Warnings: ${testResults.tests.filter(t => t.status === 'warning').length}
Errors: ${testResults.tests.filter(t => t.status === 'error').length}

## Detailed Results

${testResults.tests.map(test => {
  let result = `### ${test.test}
- Status: ${test.status}
- Screenshot: ${test.screenshot}`;

  if (test.offensePlayers !== undefined) {
    result += `\n- Offensive Players: ${test.offensePlayers}`;
  }
  if (test.defensePlayers !== undefined) {
    result += `\n- Defensive Players: ${test.defensePlayers}`;
  }
  if (test.totalPlayers !== undefined) {
    result += `\n- Total Players: ${test.totalPlayers}`;
  }
  if (test.issue) {
    result += `\n- ⚠️ Issue: ${test.issue}`;
  }

  return result;
}).join('\n\n')}

## Issues Found

${testResults.tests
  .filter(t => t.issue)
  .map(t => `- **${t.test}**: ${t.issue}`)
  .join('\n') || 'No critical issues found.'}
`;

  fs.writeFileSync('UI_RENDERING_TEST_REPORT.md', report);
  console.log('✅ Report saved to UI_RENDERING_TEST_REPORT.md');

  // Keep browser open for manual inspection
  console.log('\n🔍 Browser will remain open for manual inspection.');
  console.log('Press Ctrl+C to close when done.\n');

  // Wait indefinitely
  await new Promise(() => {});
}

// Run the test
testUIRendering().catch(console.error);
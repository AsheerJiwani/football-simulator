const { chromium } = require('playwright');
const fs = require('fs');

async function validateUIFunctionality() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    issues: []
  };

  console.log('🚀 Starting Comprehensive UI Validation Tests...\n');

  try {
    // Navigate to the simulator
    console.log('1. Navigating to simulator...');
    await page.goto('http://localhost:3002/sim', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait for React to render

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/validation-initial.png', fullPage: true });

    // ==========================
    // Test 1: Initial Player Rendering
    // ==========================
    console.log('\n2. Testing Initial Player Rendering...');

    const allCircles = await page.locator('circle').count();
    const playerCircles = await page.locator('circle[data-player-type="player"]').count();
    const offensePlayers = await page.locator('circle[data-team="offense"]').count();
    const defensePlayers = await page.locator('circle[data-team="defense"]').count();

    console.log(`   - Total circles: ${allCircles}`);
    console.log(`   - Player circles: ${playerCircles}`);
    console.log(`   - Offensive players (blue): ${offensePlayers}`);
    console.log(`   - Defensive players (red): ${defensePlayers}`);

    testResults.tests.push({
      name: 'Initial Player Rendering',
      passed: playerCircles === 14 && offensePlayers === 7 && defensePlayers === 7,
      details: {
        totalCircles: allCircles,
        playerCircles,
        offensePlayers,
        defensePlayers
      }
    });

    // ==========================
    // Test 2: Play Concept Changes
    // ==========================
    console.log('\n3. Testing Play Concept Changes...');

    const playSelect = await page.locator('select').first();
    const initialPlayers = await page.locator('circle[data-team="offense"]').all();
    const initialPositions = await Promise.all(
      initialPlayers.map(async (p) => ({
        x: await p.getAttribute('cx'),
        y: await p.getAttribute('cy')
      }))
    );

    // Change play concept
    await playSelect.selectOption({ index: 2 }); // Select third option
    await page.waitForTimeout(2000);

    const afterPlayChangePlayers = await page.locator('circle[data-team="offense"]').all();
    const afterPositions = await Promise.all(
      afterPlayChangePlayers.map(async (p) => ({
        x: await p.getAttribute('cx'),
        y: await p.getAttribute('cy')
      }))
    );

    // Check if positions changed
    let positionsChanged = false;
    for (let i = 0; i < Math.min(initialPositions.length, afterPositions.length); i++) {
      if (initialPositions[i].x !== afterPositions[i].x ||
          initialPositions[i].y !== afterPositions[i].y) {
        positionsChanged = true;
        break;
      }
    }

    console.log(`   - Offensive formation updated: ${positionsChanged ? 'YES' : 'NO'}`);

    await page.screenshot({ path: 'screenshots/validation-play-change.png', fullPage: true });

    testResults.tests.push({
      name: 'Play Concept Changes Update Formation',
      passed: positionsChanged,
      details: {
        formationChanged: positionsChanged,
        playerCount: afterPlayChangePlayers.length
      }
    });

    // ==========================
    // Test 3: Coverage Changes
    // ==========================
    console.log('\n4. Testing Coverage Changes...');

    const coverageSelect = await page.locator('select').nth(1);
    const initialDefenders = await page.locator('circle[data-team="defense"]').all();
    const initialDefPositions = await Promise.all(
      initialDefenders.map(async (p) => ({
        x: await p.getAttribute('cx'),
        y: await p.getAttribute('cy')
      }))
    );

    // Change coverage
    await coverageSelect.selectOption('cover-3');
    await page.waitForTimeout(2000);

    const afterCoverageDefenders = await page.locator('circle[data-team="defense"]').all();
    const afterDefPositions = await Promise.all(
      afterCoverageDefenders.map(async (p) => ({
        x: await p.getAttribute('cx'),
        y: await p.getAttribute('cy')
      }))
    );

    // Check if defensive positions changed
    let defPositionsChanged = false;
    for (let i = 0; i < Math.min(initialDefPositions.length, afterDefPositions.length); i++) {
      if (initialDefPositions[i].x !== afterDefPositions[i].x ||
          initialDefPositions[i].y !== afterDefPositions[i].y) {
        defPositionsChanged = true;
        break;
      }
    }

    console.log(`   - Defensive alignment updated: ${defPositionsChanged ? 'YES' : 'NO'}`);
    console.log(`   - Defender count: ${afterCoverageDefenders.length}`);

    await page.screenshot({ path: 'screenshots/validation-coverage-change.png', fullPage: true });

    testResults.tests.push({
      name: 'Coverage Changes Update Defensive Alignment',
      passed: defPositionsChanged && afterCoverageDefenders.length === 7,
      details: {
        alignmentChanged: defPositionsChanged,
        defenderCount: afterCoverageDefenders.length
      }
    });

    // ==========================
    // Test 4: Snap and Player Movement
    // ==========================
    console.log('\n5. Testing Snap and Player Movement...');

    // Get pre-snap positions
    const preSnapPlayers = await page.locator('circle[data-player-type="player"]').all();
    const preSnapPositions = await Promise.all(
      preSnapPlayers.map(async (p) => ({
        x: await p.getAttribute('cx'),
        y: await p.getAttribute('cy')
      }))
    );

    // Click snap button
    const snapButton = await page.locator('button:has-text("Snap")').first();
    await snapButton.click();

    // Wait for movement
    await page.waitForTimeout(2000);

    // Get post-snap positions
    const postSnapPlayers = await page.locator('circle[data-player-type="player"]').all();
    const postSnapPositions = await Promise.all(
      postSnapPlayers.map(async (p) => ({
        x: await p.getAttribute('cx'),
        y: await p.getAttribute('cy')
      }))
    );

    // Calculate movement
    let playersMoving = 0;
    let totalMovement = 0;
    for (let i = 0; i < Math.min(preSnapPositions.length, postSnapPositions.length); i++) {
      const dx = parseFloat(postSnapPositions[i].x) - parseFloat(preSnapPositions[i].x);
      const dy = parseFloat(postSnapPositions[i].y) - parseFloat(preSnapPositions[i].y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 5) { // Moved more than 5 pixels
        playersMoving++;
        totalMovement += distance;
      }
    }

    console.log(`   - Players moving after snap: ${playersMoving}/${postSnapPlayers.length}`);
    console.log(`   - Average movement: ${(totalMovement / postSnapPlayers.length).toFixed(2)} pixels`);

    await page.screenshot({ path: 'screenshots/validation-post-snap.png', fullPage: true });

    testResults.tests.push({
      name: 'Player Movement After Snap',
      passed: playersMoving > 10, // At least 10 players should move
      details: {
        playersMoving,
        totalPlayers: postSnapPlayers.length,
        averageMovement: totalMovement / postSnapPlayers.length
      }
    });

    // ==========================
    // Test 5: Motion Functionality
    // ==========================
    console.log('\n6. Testing Motion Functionality...');

    // Reset first
    const resetButton = await page.locator('button:has-text("Reset")').first();
    await resetButton.click();
    await page.waitForTimeout(1000);

    // Try to find motion button
    const motionButtons = await page.locator('button:has-text("Motion")').count();
    if (motionButtons > 0) {
      const motionButton = await page.locator('button:has-text("Motion")').first();

      // Get pre-motion position of a receiver
      const preMotionOffense = await page.locator('circle[data-team="offense"]').first();
      const preMotionX = await preMotionOffense.getAttribute('cx');

      await motionButton.click();
      await page.waitForTimeout(3000); // Wait for motion to complete

      const postMotionX = await preMotionOffense.getAttribute('cx');
      const motionOccurred = preMotionX !== postMotionX;

      console.log(`   - Motion detected: ${motionOccurred ? 'YES' : 'NO'}`);

      testResults.tests.push({
        name: 'Motion Functionality',
        passed: motionOccurred,
        details: {
          motionDetected: motionOccurred,
          preMotionX,
          postMotionX
        }
      });
    } else {
      console.log(`   - Motion button not found`);
      testResults.tests.push({
        name: 'Motion Functionality',
        passed: false,
        details: {
          error: 'Motion button not found'
        }
      });
    }

    // ==========================
    // Test 6: NFL Positioning Validation
    // ==========================
    console.log('\n7. Validating NFL-Realistic Positioning...');

    // Reset to get clean state
    await resetButton.click();
    await page.waitForTimeout(1000);

    // Get all player positions
    const allPlayers = await page.locator('circle[data-player-type="player"]').all();
    const positions = await Promise.all(
      allPlayers.map(async (p) => {
        const team = await p.getAttribute('data-team');
        return {
          team,
          x: parseFloat(await p.getAttribute('cx')),
          y: parseFloat(await p.getAttribute('cy'))
        };
      })
    );

    // Validate positioning
    const offensePositions = positions.filter(p => p.team === 'offense');
    const defensePositions = positions.filter(p => p.team === 'defense');

    // Check that defense is on correct side of ball
    const avgOffenseY = offensePositions.reduce((sum, p) => sum + p.y, 0) / offensePositions.length;
    const avgDefenseY = defensePositions.reduce((sum, p) => sum + p.y, 0) / defensePositions.length;

    // In vertical field, defense should be above offense (lower Y value)
    const correctSides = avgDefenseY < avgOffenseY;

    console.log(`   - Teams on correct sides: ${correctSides ? 'YES' : 'NO'}`);
    console.log(`   - Avg offense Y: ${avgOffenseY.toFixed(2)}`);
    console.log(`   - Avg defense Y: ${avgDefenseY.toFixed(2)}`);

    testResults.tests.push({
      name: 'NFL-Realistic Positioning',
      passed: correctSides,
      details: {
        correctSides,
        avgOffenseY,
        avgDefenseY
      }
    });

  } catch (error) {
    console.error('Error during testing:', error);
    testResults.issues.push({
      type: 'error',
      message: error.message,
      stack: error.stack
    });
  }

  // Generate comprehensive report
  console.log('\n\n📊 TEST RESULTS SUMMARY');
  console.log('========================');

  const passed = testResults.tests.filter(t => t.passed).length;
  const failed = testResults.tests.filter(t => !t.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Pass Rate: ${((passed / testResults.tests.length) * 100).toFixed(1)}%\n`);

  console.log('Individual Test Results:');
  testResults.tests.forEach((test, i) => {
    console.log(`${i + 1}. ${test.name}: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!test.passed && test.details) {
      console.log(`   Details: ${JSON.stringify(test.details, null, 2)}`);
    }
  });

  // Save detailed report
  const report = `# UI Validation Test Report
Generated: ${testResults.timestamp}

## Summary
- **Total Tests**: ${testResults.tests.length}
- **Passed**: ${passed}
- **Failed**: ${failed}
- **Pass Rate**: ${((passed / testResults.tests.length) * 100).toFixed(1)}%

## Test Results

${testResults.tests.map((test, i) => `
### ${i + 1}. ${test.name}
- **Status**: ${test.passed ? '✅ PASS' : '❌ FAIL'}
- **Details**:
\`\`\`json
${JSON.stringify(test.details, null, 2)}
\`\`\`
`).join('\n')}

## Issues Found
${testResults.issues.length > 0 ? testResults.issues.map(issue =>
  `- **${issue.type}**: ${issue.message}`
).join('\n') : 'No critical issues detected.'}

## Recommendations
${failed > 0 ? `
1. Fix player movement after snap - ensure tick() is updating positions
2. Verify engine-UI state synchronization
3. Check that formation changes trigger proper re-renders
4. Ensure defensive alignment responds to coverage changes
5. Validate motion functionality implementation
` : 'All tests passing - UI functioning as expected.'}
`;

  fs.writeFileSync('UI_VALIDATION_REPORT.md', report);
  console.log('\n✅ Report saved to UI_VALIDATION_REPORT.md');

  // Keep browser open for inspection
  console.log('\n🔍 Browser will remain open for manual inspection.');
  console.log('Press Ctrl+C to close.\n');

  await new Promise(() => {});
}

// Run the test
validateUIFunctionality().catch(console.error);
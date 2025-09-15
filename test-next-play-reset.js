const { chromium } = require('playwright-core');

(async () => {
  console.log('🏈 Testing Next Play/Reset Integration...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3004/sim');

  // Wait for initial load
  await page.waitForTimeout(3000);

  // Helper to get game state info
  const getGameInfo = async () => {
    return await page.evaluate(() => {
      // Try to find down and distance display
      const downText = document.querySelector('[data-testid="down-distance"]')?.textContent ||
                       Array.from(document.querySelectorAll('*')).find(el =>
                         el.textContent?.includes('1st') || el.textContent?.includes('2nd'))?.textContent ||
                       'Not found';

      // Get line of scrimmage from ball position
      const ball = document.querySelector('circle[fill="brown"], circle[fill="#8B4513"]');
      const ballY = ball ? parseFloat(ball.getAttribute('cy')) : 0;

      return {
        downDistance: downText,
        ballPosition: ballY,
        playerCount: document.querySelectorAll('circle[data-player-type="player"]').length
      };
    });
  };

  // Test 1: Initial state
  console.log('1️⃣ Initial State:');
  let gameInfo = await getGameInfo();
  console.log(`   Down/Distance: ${gameInfo.downDistance}`);
  console.log(`   Ball Position: ${gameInfo.ballPosition}`);
  console.log(`   Player Count: ${gameInfo.playerCount}`);

  // Test 2: Snap and complete a pass
  console.log('\n2️⃣ Snap and throw:');
  const snapButton = await page.locator('button:has-text("Snap")').first();
  await snapButton.click();
  await page.waitForTimeout(1000);

  // Try to throw to a receiver
  const throwButtons = await page.locator('button:has-text("WR"), button:has-text("TE"), button:has-text("RB")').all();
  if (throwButtons.length > 0) {
    await throwButtons[0].click();
    console.log('   Threw to receiver');
    await page.waitForTimeout(2000);
  }

  // Test 3: Next Play
  console.log('\n3️⃣ Testing Next Play:');
  const nextPlayButton = await page.locator('button:has-text("Next Play")').first();
  if (await nextPlayButton.isVisible()) {
    await nextPlayButton.click();
    await page.waitForTimeout(1000);

    gameInfo = await getGameInfo();
    console.log(`   Down/Distance: ${gameInfo.downDistance}`);
    console.log(`   Ball Position: ${gameInfo.ballPosition}`);
    console.log(`   Players reset: ${gameInfo.playerCount === 14}`);
  } else {
    console.log('   Next Play button not found');
  }

  // Test 4: Reset functionality
  console.log('\n4️⃣ Testing Reset:');

  // Snap again
  await snapButton.click();
  await page.waitForTimeout(1000);

  // Reset
  const resetButton = await page.locator('button:has-text("Reset")').first();
  if (await resetButton.isVisible()) {
    await resetButton.click();
    await page.waitForTimeout(1000);

    gameInfo = await getGameInfo();
    console.log(`   Down/Distance after reset: ${gameInfo.downDistance}`);
    console.log(`   Ball Position after reset: ${gameInfo.ballPosition}`);
    console.log(`   Players in pre-snap: ${gameInfo.playerCount === 14}`);
  } else {
    console.log('   Reset button not found');
  }

  // Test 5: Motion functionality
  console.log('\n5️⃣ Testing Motion:');
  const motionButton = await page.locator('button:has-text("Motion")').first();
  if (await motionButton.isVisible()) {
    // Get initial WR position
    const getReceiverPosition = async () => {
      return await page.evaluate(() => {
        const receiver = document.querySelector('circle[data-player-type="player"][data-team="offense"]');
        return receiver ? parseFloat(receiver.getAttribute('cx')) : 0;
      });
    };

    const initialPos = await getReceiverPosition();
    await motionButton.click();
    await page.waitForTimeout(2000);
    const afterMotionPos = await getReceiverPosition();

    console.log(`   Motion detected: ${Math.abs(afterMotionPos - initialPos) > 5}`);
    console.log(`   Position change: ${Math.abs(afterMotionPos - initialPos).toFixed(2)} pixels`);
  } else {
    console.log('   Motion button not found');
  }

  // Test 6: Coverage changes
  console.log('\n6️⃣ Testing Coverage Changes:');
  const getDefenseAlignment = async () => {
    return await page.evaluate(() => {
      const defenders = document.querySelectorAll('circle[data-team="defense"]');
      return Array.from(defenders).map(d => ({
        x: parseFloat(d.getAttribute('cx')),
        y: parseFloat(d.getAttribute('cy'))
      }));
    });
  };

  const initialDefense = await getDefenseAlignment();

  // Change coverage
  const coverageSelect = await page.locator('select').nth(1);
  await coverageSelect.selectOption({ index: 2 }); // Select different coverage
  await page.waitForTimeout(1000);

  const afterCoverageDefense = await getDefenseAlignment();
  const defenseMoved = initialDefense.some((pos, i) =>
    afterCoverageDefense[i] &&
    (Math.abs(pos.x - afterCoverageDefense[i].x) > 1 ||
     Math.abs(pos.y - afterCoverageDefense[i].y) > 1)
  );

  console.log(`   Defense realigned: ${defenseMoved}`);

  console.log('\n✅ Tests complete! Browser will stay open for inspection.');

})().catch(console.error);
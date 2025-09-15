const { chromium } = require('playwright-core');

(async () => {
  console.log('🔍 Testing Coverage and Formation Changes...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sim');

  // Wait for initial load
  await page.waitForTimeout(3000);

  // Count initial players
  const initialPlayers = await page.locator('circle[data-player-type="player"]').count();
  console.log(`Initial player count: ${initialPlayers}`);

  // Get initial defensive positions
  const getDefensePositions = async () => {
    return await page.evaluate(() => {
      const defenseCircles = document.querySelectorAll('circle[data-team="defense"]');
      return Array.from(defenseCircles).map(c => ({
        x: parseFloat(c.getAttribute('cx')),
        y: parseFloat(c.getAttribute('cy'))
      }));
    });
  };

  const initialDefensePos = await getDefensePositions();
  console.log('Initial defense positions:', initialDefensePos.slice(0, 3));

  // Change coverage from Cover 1 to Cover 3
  console.log('\n📋 Changing coverage to Cover 3...');
  const coverageSelect = await page.locator('select').nth(1); // Second select is coverage
  await coverageSelect.selectOption({ label: 'Cover 3' });
  await page.waitForTimeout(1000);

  const afterCoveragePos = await getDefensePositions();
  console.log('After coverage change:', afterCoveragePos.slice(0, 3));

  // Check if positions changed
  const coverageChanged = JSON.stringify(initialDefensePos) !== JSON.stringify(afterCoveragePos);
  console.log('Coverage change updated positions?', coverageChanged);

  // Change formation/concept
  console.log('\n📋 Changing play concept to Smash...');
  const conceptSelect = await page.locator('select').first();
  await conceptSelect.selectOption({ label: 'Smash' });
  await page.waitForTimeout(1000);

  // Get offensive positions
  const getOffensePositions = async () => {
    return await page.evaluate(() => {
      const offenseCircles = document.querySelectorAll('circle[data-team="offense"]');
      return Array.from(offenseCircles).map(c => ({
        x: parseFloat(c.getAttribute('cx')),
        y: parseFloat(c.getAttribute('cy'))
      }));
    });
  };

  const offensePos = await getOffensePositions();
  console.log('Offense positions after concept change:', offensePos.slice(0, 3));

  // Test snap and movement
  console.log('\n🏈 Testing snap...');
  const snapButton = await page.locator('button:has-text("Snap")').first();
  await snapButton.click();
  await page.waitForTimeout(2000);

  const postSnapOffense = await getOffensePositions();
  console.log('Offense positions after snap:', postSnapOffense.slice(0, 3));

  const playersMoving = postSnapOffense.some((pos, i) =>
    offensePos[i] && (Math.abs(pos.x - offensePos[i].x) > 1 || Math.abs(pos.y - offensePos[i].y) > 1)
  );
  console.log('Players moving after snap?', playersMoving);

  console.log('\n✅ Test complete! Browser will stay open for inspection.');

})().catch(console.error);
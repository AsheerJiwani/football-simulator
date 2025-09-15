// Simple script to open browser and capture console logs
const puppeteer = require('puppeteer');

async function testPositionBug() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();

    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      console.log('BROWSER:', text);
    });

    // Navigate to simulator
    console.log('Opening http://localhost:3004/sim...');
    await page.goto('http://localhost:3004/sim', { waitUntil: 'networkidle0' });

    // Wait a few seconds for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get player positions from the UI
    const playerPositions = await page.evaluate(() => {
      // Access the Zustand store directly
      const gameStore = window.__gameStore || {};
      if (gameStore.getState) {
        const state = gameStore.getState();
        return state.gameState?.players?.map(p => ({
          id: p.id,
          team: p.team,
          position: p.position,
          playerType: p.playerType
        })) || [];
      }
      return [];
    });

    console.log('Player positions from UI:', JSON.stringify(playerPositions, null, 2));
    console.log('Done - check logs above');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testPositionBug();
// Debug script to test engine initialization
const { FootballEngine } = require('./src/engine/Engine.ts');
const { DataLoader } = require('./src/lib/dataLoader.ts');

console.log('=== Debug Engine Test ===');

// Create engine instance
const engine = new FootballEngine();
console.log('Engine created');

// Load concept and coverage
const concept = DataLoader.getConcept('slant-flat');
const coverage = DataLoader.getCoverage('cover-1');

console.log('Concept loaded:', !!concept);
console.log('Coverage loaded:', !!coverage);

if (concept) {
  console.log('Setting play concept...');
  engine.setPlayConcept(concept);

  if (coverage) {
    console.log('Setting coverage...');
    engine.setCoverage(coverage);
  }

  // Get final game state
  const gameState = engine.getGameState();
  console.log('Final game state players:', gameState.players.length);
  console.log('Player positions:', gameState.players.map(p => ({
    id: p.id,
    team: p.team,
    position: p.position,
    playerType: p.playerType
  })));
}
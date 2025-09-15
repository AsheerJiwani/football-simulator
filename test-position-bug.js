const { FootballEngine } = require('./dist/engine/Engine');
const { DataLoader } = require('./dist/lib/dataLoader');

console.log('🔍 Testing position initialization bug...\n');

// Create engine
const engine = new FootballEngine();

// Load concept and coverage
const concept = DataLoader.getConcept('slant-flat');
const coverage = DataLoader.getCoverage('cover-1');

console.log('📋 Concept loaded:', concept?.name);
console.log('📋 Has formation?', !!concept?.formation);
console.log('📋 Has positions?', !!concept?.formation?.positions);
console.log('📋 Formation positions:', JSON.stringify(concept?.formation?.positions, null, 2));

// Set concept and coverage
if (concept) {
  engine.setPlayConcept(concept);
}
if (coverage) {
  engine.setCoverage(coverage);
}

// Get game state
const gameState = engine.getGameState();

console.log('\n🏈 Game State:');
console.log('- LOS:', gameState.lineOfScrimmage);
console.log('- Player count:', gameState.players.length);
console.log('- Offensive players:', gameState.players.filter(p => p.team === 'offense').length);
console.log('- Defensive players:', gameState.players.filter(p => p.team === 'defense').length);

console.log('\n👥 Player Positions:');
gameState.players.forEach(player => {
  console.log(`  ${player.id} (${player.team}): x=${player.position.x.toFixed(2)}, y=${player.position.y.toFixed(2)}`);
});

// Check if all positions are (0,0)
const allAtOrigin = gameState.players.every(p => p.position.x === 0 && p.position.y === 0);
console.log('\n❓ All players at (0,0)?', allAtOrigin);

if (allAtOrigin) {
  console.log('\n🚨 BUG CONFIRMED: All players are at position (0,0)!');
} else {
  console.log('\n✅ Players have proper positions!');
}
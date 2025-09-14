import { FootballEngine } from './src/engine/Engine.js';
import { DataLoader } from './src/lib/dataLoader.js';

const engine = new FootballEngine();

// Load default data
const concept = DataLoader.getConcept('slant-flat');
const coverage = DataLoader.getCoverage('cover-1');

if (concept) engine.setPlayConcept(concept);
if (coverage) engine.setCoverage(coverage);

const state = engine.getGameState();
const los = state.lineOfScrimmage;

console.log('Line of Scrimmage:', los);
console.log('\nDefensive Players:');
state.players.filter(p => p.team === 'defense').forEach(defender => {
  const relativeToLOS = defender.position.y - los;
  console.log(`${defender.id}: y=${defender.position.y.toFixed(1)}, relative to LOS: ${relativeToLOS > 0 ? '+' : ''}${relativeToLOS.toFixed(1)} (${relativeToLOS > 0 ? 'defensive side ✓' : 'OFFENSIVE SIDE ❌'})`);
});

console.log('\nOffensive Players:');
state.players.filter(p => p.team === 'offense').forEach(player => {
  const relativeToLOS = player.position.y - los;
  console.log(`${player.id}: y=${player.position.y.toFixed(1)}, relative to LOS: ${relativeToLOS > 0 ? '+' : ''}${relativeToLOS.toFixed(1)} (${relativeToLOS < 0 ? 'offensive backfield ✓' : 'WRONG SIDE ❌'})`);
});
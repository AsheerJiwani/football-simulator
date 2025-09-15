const { FootballEngine } = require('./dist/src/engine/Engine.js');
const { DataLoader } = require('./dist/src/lib/dataLoader.js');

const engine = new FootballEngine();
engine.setLineOfScrimmage(20);

const concept = DataLoader.getConcept('slant-flat');
const coverage = DataLoader.getCoverage('cover-1');

console.log('Coverage type:', coverage?.type);
console.log('Coverage name:', coverage?.name);

if (concept) engine.setPlayConcept(concept);
if (coverage) engine.setCoverage(coverage);

const state = engine.getGameState();
const defenders = state.players.filter(p => p.team === 'defense');

console.log('\nDefender positions (LOS = 20):');
defenders.forEach(defender => {
  console.log(`${defender.id} (${defender.playerType}): y=${defender.position.y}, coverage=${defender.coverageResponsibility?.type}, zone=${defender.coverageResponsibility?.zone?.name}`);
});

const linebackers = defenders.filter(d => d.playerType === 'LB');
console.log('\nLinebackers specifically:');
linebackers.forEach(lb => {
  console.log(`${lb.id}: y=${lb.position.y} (${lb.position.y - 20} yards from LOS)`);
});
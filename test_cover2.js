const { FootballEngine } = require('./src/engine/Engine.ts');

const engine = new FootballEngine();
engine.setPlayConcept('slant-flat');
engine.setCoverage({ type: 'cover-2', name: 'Cover 2', responsibilities: require('./src/data/coverages.json')['cover-2'].responsibilities });

const state = engine.getGameState();
const defenders = state.players.filter(p => p.team === 'defense');
const safeties = defenders.filter(p => p.playerType === 'S');

console.log('Total defenders:', defenders.length);
console.log('Safeties:', safeties.length);
console.log('Defender types:', defenders.map(d => `${d.id}:${d.playerType}`).join(', '));

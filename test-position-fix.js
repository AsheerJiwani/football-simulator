// Simple test to verify position fix without running full browser
const fs = require('fs');
const path = require('path');

// Simulate the data loading
const formationsData = JSON.parse(fs.readFileSync('./src/data/formations.json', 'utf8'));
const conceptsData = JSON.parse(fs.readFileSync('./src/data/concepts.json', 'utf8'));

console.log('=== Testing Position Fix ===');

// Simulate the original buggy approach
const conceptDataOriginal = conceptsData['slant-flat'];
console.log('Original concept formation (string):', conceptDataOriginal.formation);

const buggyResult = {
  ...conceptDataOriginal,
  formation: formationsData[conceptDataOriginal.formation]
};

console.log('After spread + formation override:');
console.log('- formation.name:', buggyResult.formation?.name);
console.log('- formation.positions available:', !!buggyResult.formation?.positions);
console.log('- QB1 position exists:', !!buggyResult.formation?.positions?.QB1);

// Test our fixed approach
const formation = formationsData[conceptDataOriginal.formation];
const fixedResult = {
  name: conceptDataOriginal.name,
  description: conceptDataOriginal.description,
  difficulty: conceptDataOriginal.difficulty,
  formation,
  routes: conceptDataOriginal.routes
};

console.log('\nFixed approach:');
console.log('- formation.name:', fixedResult.formation?.name);
console.log('- formation.positions available:', !!fixedResult.formation?.positions);
console.log('- QB1 position exists:', !!fixedResult.formation?.positions?.QB1);
console.log('- QB1 position:', fixedResult.formation?.positions?.QB1);

console.log('\nSimulating setupPlayers position calculation:');
const lineOfScrimmage = 30;
const hashOffset = 0; // middle hash
const qb1BasePosition = fixedResult.formation.positions.QB1;
const adjustedPosition = {
  x: qb1BasePosition.x + hashOffset,
  y: qb1BasePosition.y + lineOfScrimmage
};
console.log('QB1 adjusted position:', adjustedPosition);
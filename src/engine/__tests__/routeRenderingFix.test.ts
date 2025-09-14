import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Route Rendering Fix - Player Routes', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
  });

  test('players should have routes directly on them after setPlayConcept', () => {
    const concept = DataLoader.getConcept('slant-flat');
    if (!concept) throw new Error('Concept not found');

    engine.setPlayConcept(concept);
    const state = engine.getGameState();

    // Filter offensive eligible players
    const offensivePlayers = state.players.filter(p =>
      p.team === 'offense' && p.isEligible
    );

    // Each eligible offensive player should have a route
    offensivePlayers.forEach(player => {
      expect(player.route).toBeDefined();
      expect(player.route?.waypoints).toBeDefined();
      expect(player.route?.waypoints?.length).toBeGreaterThan(0);
    });
  });

  test('changing play concept should update player routes', () => {
    // Set initial concept
    const concept1 = DataLoader.getConcept('slant-flat');
    if (!concept1) throw new Error('Concept 1 not found');
    engine.setPlayConcept(concept1);

    const state1 = engine.getGameState();
    const player1Routes = state1.players
      .filter(p => p.team === 'offense' && p.isEligible)
      .map(p => ({ id: p.id, route: p.route }));

    // Change to different concept
    const concept2 = DataLoader.getConcept('mesh');
    if (!concept2) throw new Error('Concept 2 not found');
    engine.setPlayConcept(concept2);

    const state2 = engine.getGameState();
    const player2Routes = state2.players
      .filter(p => p.team === 'offense' && p.isEligible)
      .map(p => ({ id: p.id, route: p.route }));

    // Routes should have changed
    expect(player2Routes).not.toEqual(player1Routes);

    // All players should still have routes
    player2Routes.forEach(playerRoute => {
      expect(playerRoute.route).toBeDefined();
      expect(playerRoute.route?.waypoints).toBeDefined();
    });
  });

  test('routes should be adjusted relative to LOS', () => {
    const concept = DataLoader.getConcept('slant-flat');
    if (!concept) throw new Error('Concept not found');

    // Set LOS to 50 yards
    engine.setLineOfScrimmage(50);
    engine.setPlayConcept(concept);

    const state = engine.getGameState();
    const offensivePlayers = state.players.filter(p =>
      p.team === 'offense' && p.isEligible
    );

    // All route waypoints should be relative to LOS (50)
    offensivePlayers.forEach(player => {
      if (player.route?.waypoints) {
        player.route.waypoints.forEach(waypoint => {
          // Routes should start near LOS and progress upfield
          expect(waypoint.y).toBeGreaterThanOrEqual(45); // Allow some back movement
          expect(waypoint.y).toBeLessThanOrEqual(120); // Within field bounds
        });
      }
    });
  });
});
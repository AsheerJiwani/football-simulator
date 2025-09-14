import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Quick Game Concepts Tests', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
    const coverage = DataLoader.getCoverage('cover-3');
    if (coverage) engine.setCoverage(coverage);
  });

  describe('Hitch-Seam Concept', () => {
    test('should load hitch-seam concept with 2x2 spread formation', () => {
      const hitchSeam = DataLoader.getConcept('hitch-seam');
      expect(hitchSeam).toBeDefined();

      if (hitchSeam) {
        engine.setPlayConcept(hitchSeam);
        const state = engine.getGameState();

        // Check formation loaded correctly
        expect(state.playConcept?.name).toBe('Hitch-Seam');
        expect(state.playConcept?.formation.name).toBe('2x2 Spread');

        // Check offensive players created
        const offensivePlayers = state.players.filter(p => p.team === 'offense');
        expect(offensivePlayers.length).toBe(6); // QB + RB + 3 WRs + 1 TE

        // Check route assignments
        const wideReceivers = offensivePlayers.filter(p => p.playerType === 'WR');
        const tightEnd = offensivePlayers.find(p => p.playerType === 'TE');
        expect(wideReceivers.length).toBe(3);
        expect(tightEnd).toBeDefined();

        // Verify outside receivers have hitch routes at 5 yards
        const outsideWRs = wideReceivers.filter(wr =>
          Math.abs(wr.position.x - 8) < 1 || Math.abs(wr.position.x - 45) < 1
        );
        expect(outsideWRs.length).toBe(2);
        outsideWRs.forEach(wr => {
          expect(wr.route?.depth).toBe(5);
        });

        // Verify inside receivers have seam routes
        const slotWR = wideReceivers.find(wr =>
          Math.abs(wr.position.x - 18) < 2
        );
        expect(slotWR).toBeDefined();
        expect(slotWR?.route?.depth).toBe(30);

        // Verify TE has seam route
        expect(tightEnd?.route?.depth).toBe(30);
      }
    });

    test('should trigger proper defensive alignment for 2x2 spread', () => {
      const hitchSeam = DataLoader.getConcept('hitch-seam');
      if (hitchSeam) {
        engine.setPlayConcept(hitchSeam);
        const state = engine.getGameState();

        // Defense should recognize 2x2 spread formation
        const defenders = state.players.filter(p => p.team === 'defense');
        expect(defenders.length).toBe(7);

        // Check for balanced defensive alignment
        const leftDefenders = defenders.filter(d => d.position.x < 26.665);
        const rightDefenders = defenders.filter(d => d.position.x > 26.665);

        // Should have relatively balanced distribution (within 2 defenders)
        expect(Math.abs(leftDefenders.length - rightDefenders.length)).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Curl-Flat Concept', () => {
    test('should load curl-flat concept with trips formation', () => {
      const curlFlat = DataLoader.getConcept('curl-flat');
      expect(curlFlat).toBeDefined();

      if (curlFlat) {
        engine.setPlayConcept(curlFlat);
        const state = engine.getGameState();

        // Check formation
        expect(state.playConcept?.name).toBe('Curl-Flat');
        expect(state.playConcept?.formation.name).toBe('Trips Right');

        // Check route depths match NFL specs
        const offensivePlayers = state.players.filter(p => p.team === 'offense');
        const routes = offensivePlayers
          .filter(p => p.route)
          .map(p => ({ type: p.playerType, depth: p.route?.depth }));

        // Should have curl at 12 yards, flat at 4 yards, sit at 9 yards
        expect(routes.find(r => r.depth === 12)).toBeDefined(); // Curl
        expect(routes.find(r => r.depth === 4)).toBeDefined();  // Flat
        expect(routes.find(r => r.depth === 9)).toBeDefined();  // Sit
      }
    });

    test('should create proper high-low conflict for zone coverage', () => {
      const curlFlat = DataLoader.getConcept('curl-flat');
      if (curlFlat) {
        engine.setPlayConcept(curlFlat);

        // Set Cover 3 to test zone conflict
        const cover3 = DataLoader.getCoverage('cover-3');
        if (cover3) engine.setCoverage(cover3);

        const state = engine.getGameState();

        // Verify trips side has multiple route levels
        const tripsReceivers = state.players.filter(p =>
          p.team === 'offense' && p.position.x > 30
        );

        const depths = tripsReceivers
          .filter(p => p.route)
          .map(p => p.route!.depth)
          .sort((a, b) => a - b);

        // Should have shallow (4), intermediate (9), and deep (12) routes
        expect(depths[0]).toBeLessThanOrEqual(5);   // Flat
        expect(depths[1]).toBeGreaterThan(5);        // Sit
        expect(depths[depths.length - 1]).toBeGreaterThanOrEqual(10); // Curl
      }
    });
  });

  describe('All Curls Concept', () => {
    test('should load all-curls concept with all receivers at 10 yards', () => {
      const allCurls = DataLoader.getConcept('all-curls');
      expect(allCurls).toBeDefined();

      if (allCurls) {
        engine.setPlayConcept(allCurls);
        const state = engine.getGameState();

        expect(state.playConcept?.name).toBe('All Curls');

        // All WRs and TE should have curl routes at 10 yards
        const wideReceivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );
        const tightEnd = state.players.find(p =>
          p.team === 'offense' && p.playerType === 'TE'
        );

        wideReceivers.forEach(wr => {
          expect(wr.route?.depth).toBe(10);
          expect(wr.route?.waypoints).toBeDefined();
        });

        expect(tightEnd?.route?.depth).toBe(10);

        // RB should have shorter curl at 5 yards
        const runningBack = state.players.find(p =>
          p.team === 'offense' && p.playerType === 'RB'
        );
        expect(runningBack?.route?.depth).toBe(5);
      }
    });

    test('should create horizontal stretch against zone coverage', () => {
      const allCurls = DataLoader.getConcept('all-curls');
      if (allCurls) {
        engine.setPlayConcept(allCurls);

        const state = engine.getGameState();
        const receivers = state.players.filter(p =>
          p.team === 'offense' && p.route && (p.playerType === 'WR' || p.playerType === 'TE')
        );

        // Check horizontal spacing
        const xPositions = receivers.map(r => r.position.x).sort((a, b) => a - b);

        // Should have receivers spread across the field
        expect(xPositions[0]).toBeLessThan(15);  // Far left
        expect(xPositions[xPositions.length - 1]).toBeGreaterThan(40); // Far right

        // All at same depth creates horizontal stretch
        const depths = receivers.map(r => r.route!.depth);
        depths.forEach(d => expect(d).toBe(10));
      }
    });
  });

  describe('Defense vs Quick Game Integration', () => {
    test('Cover 2 should handle hitch-seam with proper zone distribution', () => {
      const hitchSeam = DataLoader.getConcept('hitch-seam');
      const cover2 = DataLoader.getCoverage('cover-2');

      if (hitchSeam && cover2) {
        engine.setPlayConcept(hitchSeam);
        engine.setCoverage(cover2);

        const state = engine.getGameState();

        // Cover 2 should have corners in flats to defend hitches
        const corners = state.players.filter(p =>
          p.team === 'defense' && p.playerType === 'CB'
        );

        // Corners should be positioned to defend outside hitches (relative to LOS at y=30)
        corners.forEach(cb => {
          expect(cb.position.y).toBeLessThanOrEqual(38); // In flat zone (30 + 8)
        });

        // Safeties should be deep to defend seams
        const safeties = state.players.filter(p =>
          p.team === 'defense' && p.playerType === 'S'
        );

        safeties.forEach(s => {
          expect(s.position.y).toBeGreaterThanOrEqual(40); // Deep (30 + 10)
        });
      }
    });

    test('Cover 3 should handle curl-flat with proper underneath defenders', () => {
      const curlFlat = DataLoader.getConcept('curl-flat');
      const cover3 = DataLoader.getCoverage('cover-3');

      if (curlFlat && cover3) {
        engine.setPlayConcept(curlFlat);
        engine.setCoverage(cover3);

        const state = engine.getGameState();

        // Should have 4 underneath defenders in Cover 3
        const underneathDefenders = state.players.filter(p =>
          p.team === 'defense' &&
          (p.playerType === 'LB' ||
           (p.playerType === 'CB' && p.coverageResponsibility?.type === 'zone'))
        );

        expect(underneathDefenders.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
import {
  calculateZoneLandmarks,
  applyDeeperThanDeepestRule,
  calculateZoneOverlaps,
  adjustZoneWidthsForReceiverDistribution,
  coordinateZonesByCoverage
} from '../zoneCoordination';
import { Player, ZoneLandmark, FormationAnalysis } from '../types';

describe('Zone Coordination System', () => {
  const los = 30;
  const fieldCenter = 26.665;

  // Helper to create a basic player
  const createPlayer = (id: string, position: { x: number; y: number }, playerType: string, team: 'offense' | 'defense'): Player => ({
    id,
    position,
    velocity: { x: 0, y: 0 },
    currentSpeed: 0,
    playerType: playerType as any,
    team,
    isEligible: playerType !== 'QB',
    jerseyNumber: parseInt(id.slice(-1)) || 1,
    baseSpeed: 9.0,
    maxSpeed: 9.5,
    acceleration: 2.0,
    topSpeed: 9.5
  });

  // Helper to create a defender with zone responsibility
  const createZoneDefender = (id: string, position: { x: number; y: number }, zoneName: string): Player => {
    const defender = createPlayer(id, position, 'S', 'defense');
    defender.coverageResponsibility = {
      defenderId: id,
      type: 'zone',
      zone: {
        name: zoneName,
        center: { ...position },
        width: 10,
        height: 10,
        depth: 15
      }
    };
    return defender;
  };

  describe('calculateZoneLandmarks', () => {
    it('should create hash mark landmarks', () => {
      const landmarks = calculateZoneLandmarks(los, 'Cover 2');

      const leftHash = landmarks.find(l => l.name === 'left-hash');
      const rightHash = landmarks.find(l => l.name === 'right-hash');

      expect(leftHash).toBeDefined();
      expect(rightHash).toBeDefined();
      expect(leftHash!.position.x).toBe(fieldCenter - 18.67);
      expect(rightHash!.position.x).toBe(fieldCenter + 18.67);
    });

    it('should create Cover 3 specific landmarks', () => {
      const landmarks = calculateZoneLandmarks(los, 'Cover 3');

      const thirds = landmarks.filter(l => l.name.includes('third'));
      expect(thirds).toHaveLength(3);

      const leftThird = landmarks.find(l => l.name === 'left-third');
      const middleThird = landmarks.find(l => l.name === 'middle-third');
      const rightThird = landmarks.find(l => l.name === 'right-third');

      expect(leftThird!.position.x).toBe(17.77 / 2); // DEEP_THIRD_WIDTH / 2
      expect(middleThird!.position.x).toBe(fieldCenter);
      expect(rightThird!.position.x).toBe(53.33 - (17.77 / 2));
    });
  });

  describe('applyDeeperThanDeepestRule', () => {
    it('should position defender deeper than deepest receiver in zone', () => {
      const defenders = [
        createZoneDefender('S1', { x: fieldCenter, y: los + 15 }, 'deep-middle')
      ];

      const receivers = [
        createPlayer('WR1', { x: fieldCenter - 2, y: los + 18 }, 'WR', 'offense'),
        createPlayer('WR2', { x: fieldCenter + 2, y: los + 20 }, 'WR', 'offense') // Deepest
      ];

      const adjustedPositions = applyDeeperThanDeepestRule(defenders, receivers, los);

      expect(adjustedPositions['S1']).toBeDefined();
      expect(adjustedPositions['S1'].y).toBe(los + 20 + 2); // Deepest receiver + 2 yard cushion
    });

    it('should not adjust defender position if already deeper than receivers', () => {
      const defenders = [
        createZoneDefender('S1', { x: fieldCenter, y: los + 25 }, 'deep-middle')
      ];

      const receivers = [
        createPlayer('WR1', { x: fieldCenter, y: los + 18 }, 'WR', 'offense')
      ];

      const adjustedPositions = applyDeeperThanDeepestRule(defenders, receivers, los);

      // Should maintain current position since already deeper
      expect(adjustedPositions['S1'].y).toBe(los + 25);
    });
  });

  describe('calculateZoneOverlaps', () => {
    it('should identify adjacent zone defenders within communication range', () => {
      const defenders = [
        createZoneDefender('S1', { x: 15, y: los + 15 }, 'deep-left'),
        createZoneDefender('S2', { x: 20, y: los + 15 }, 'deep-middle'), // 5 yards apart
        createZoneDefender('CB1', { x: 40, y: los + 8 }, 'flat-right')  // Too far
      ];

      const overlaps = calculateZoneOverlaps(defenders, los);

      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].defenderId).toBe('S1');
      expect(overlaps[0].adjacentDefenderId).toBe('S2');
      expect(overlaps[0].handoffPoint.x).toBe(17.5); // Midpoint between 15 and 20
    });

    it('should not create overlaps for defenders too far apart', () => {
      const defenders = [
        createZoneDefender('S1', { x: 10, y: los + 15 }, 'deep-left'),
        createZoneDefender('S2', { x: 25, y: los + 15 }, 'deep-right') // 15 yards apart
      ];

      const overlaps = calculateZoneOverlaps(defenders, los);

      expect(overlaps).toHaveLength(0);
    });
  });

  describe('adjustZoneWidthsForReceiverDistribution', () => {
    const createFormation = (isBunch: boolean): FormationAnalysis => ({
      strength: 'right',
      receiversLeft: [],
      receiversRight: [],
      hasTE: false,
      isTrips: false,
      personnel: { QB: 1, RB: 0, WR: 4, TE: 0, FB: 0 }
    });

    it('should contract zones for bunch formations', () => {
      const defenders = [
        createZoneDefender('LB1', { x: fieldCenter - 5, y: los + 8 }, 'underneath-left')
      ];

      // Bunch formation - receivers within 15 yards
      const receivers = [
        createPlayer('WR1', { x: fieldCenter - 2, y: los }, 'WR', 'offense'),
        createPlayer('WR2', { x: fieldCenter, y: los }, 'WR', 'offense'),
        createPlayer('WR3', { x: fieldCenter + 2, y: los }, 'WR', 'offense')
      ];

      const formation = createFormation(true);
      const adjustedPositions = adjustZoneWidthsForReceiverDistribution(defenders, receivers, formation);

      expect(adjustedPositions['LB1']).toBeDefined();
      // Zone should contract toward center for bunch formation
      expect(adjustedPositions['LB1'].x).toBeGreaterThan(fieldCenter - 5);
    });

    it('should expand zones for spread formations', () => {
      const defenders = [
        createZoneDefender('S1', { x: fieldCenter + 10, y: los + 15 }, 'deep-right')
      ];

      // Spread formation - receivers spread over 35 yards
      const receivers = [
        createPlayer('WR1', { x: 5, y: los }, 'WR', 'offense'),
        createPlayer('WR2', { x: 20, y: los }, 'WR', 'offense'),
        createPlayer('WR3', { x: 35, y: los }, 'WR', 'offense'),
        createPlayer('WR4', { x: 45, y: los }, 'WR', 'offense')
      ];

      const formation = createFormation(false);
      const adjustedPositions = adjustZoneWidthsForReceiverDistribution(defenders, receivers, formation);

      expect(adjustedPositions['S1']).toBeDefined();
      // Zone should expand further from center for spread formation
      expect(adjustedPositions['S1'].x).toBeGreaterThan(fieldCenter + 10);
    });
  });

  describe('coordinateZonesByCoverage', () => {
    const createBasicFormation = (): FormationAnalysis => ({
      strength: 'right',
      receiversLeft: [],
      receiversRight: [],
      hasTE: false,
      isTrips: false,
      personnel: { QB: 1, RB: 1, WR: 3, TE: 0, FB: 0 }
    });

    it('should coordinate Cover 2 safeties to proper halves', () => {
      const defenders = [
        createZoneDefender('S1', { x: fieldCenter - 10, y: los + 15 }, 'deep-half-left'),
        createZoneDefender('S2', { x: fieldCenter + 10, y: los + 15 }, 'deep-half-right')
      ];

      const receivers = [
        createPlayer('WR1', { x: 10, y: los + 12 }, 'WR', 'offense'),
        createPlayer('WR2', { x: 40, y: los + 18 }, 'WR', 'offense') // Deepest in right half
      ];

      const formation = createBasicFormation();
      const coordinatedPositions = coordinateZonesByCoverage(
        defenders,
        receivers,
        'Cover 2',
        formation,
        los
      );

      expect(coordinatedPositions['S1']).toBeDefined();
      expect(coordinatedPositions['S2']).toBeDefined();

      // Right safety should be deeper than deepest receiver (18 + 2 = 20)
      expect(coordinatedPositions['S2'].y).toBe(los + 20);

      // Safeties should maintain proper width (13 yards from center)
      expect(coordinatedPositions['S1'].x).toBe(fieldCenter - 13);
      expect(coordinatedPositions['S2'].x).toBe(fieldCenter + 13);
    });

    it('should coordinate Cover 3 thirds to landmark positions', () => {
      const defenders = [
        createZoneDefender('CB1', { x: 10, y: los + 12 }, 'deep-third-left'),
        createZoneDefender('FS1', { x: fieldCenter, y: los + 12 }, 'deep-third-middle'),
        createZoneDefender('CB2', { x: 45, y: los + 12 }, 'deep-third-right')
      ];

      const receivers = [
        createPlayer('WR1', { x: 8, y: los + 15 }, 'WR', 'offense'),
        createPlayer('WR2', { x: fieldCenter, y: los + 14 }, 'WR', 'offense'),
        createPlayer('WR3', { x: 48, y: los + 16 }, 'WR', 'offense')
      ];

      const formation = createBasicFormation();
      const coordinatedPositions = coordinateZonesByCoverage(
        defenders,
        receivers,
        'Cover 3',
        formation,
        los
      );

      expect(coordinatedPositions['CB1']).toBeDefined();
      expect(coordinatedPositions['FS1']).toBeDefined();
      expect(coordinatedPositions['CB2']).toBeDefined();

      // Each defender should be deeper than deepest receiver in their third
      expect(coordinatedPositions['CB1'].y).toBe(los + 17); // 15 + 2 cushion
      expect(coordinatedPositions['FS1'].y).toBe(los + 16); // 14 + 2 cushion
      expect(coordinatedPositions['CB2'].y).toBe(los + 18); // 16 + 2 cushion
    });

    it('should return empty object for unsupported coverage', () => {
      const defenders = [createZoneDefender('S1', { x: fieldCenter, y: los + 15 }, 'deep')];
      const receivers = [createPlayer('WR1', { x: fieldCenter, y: los }, 'WR', 'offense')];
      const formation = createBasicFormation();

      const coordinatedPositions = coordinateZonesByCoverage(
        defenders,
        receivers,
        'Unsupported Coverage',
        formation,
        los
      );

      expect(Object.keys(coordinatedPositions)).toHaveLength(0);
    });
  });
});
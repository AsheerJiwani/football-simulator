import { FormationAnalyzer } from '../formationAnalyzer';
import { PersonnelMatcher } from '../personnelMatcher';
import { CoverageAdjustments } from '../coverageAdjustments';
import { PostSnapRules } from '../postSnapRules';
import { Player, Vector2D, CoverageType } from '../types';

describe('Formation Analysis and Defensive Adjustments', () => {
  let formationAnalyzer: FormationAnalyzer;
  let personnelMatcher: PersonnelMatcher;
  let coverageAdjustments: CoverageAdjustments;
  let postSnapRules: PostSnapRules;

  beforeEach(() => {
    formationAnalyzer = new FormationAnalyzer();
    personnelMatcher = new PersonnelMatcher();
    coverageAdjustments = new CoverageAdjustments();
    postSnapRules = new PostSnapRules();
  });

  describe('FormationAnalyzer', () => {
    it('should detect trips formation', () => {
      const offensivePlayers: Player[] = [
        createPlayer('WR1', 'offense', 'WR', { x: 10, y: 0 }, true),
        createPlayer('WR2', 'offense', 'WR', { x: 15, y: 0 }, true),
        createPlayer('WR3', 'offense', 'WR', { x: 20, y: 0 }, true),
        createPlayer('TE', 'offense', 'TE', { x: 35, y: 0 }, true),
        createPlayer('RB', 'offense', 'RB', { x: 26.67, y: -5 }, true),
      ];

      const analysis = formationAnalyzer.analyzeFormation(offensivePlayers);

      expect(analysis.type).toBe('trips');
      expect(analysis.receiverSets).toContain('trips');
      expect(analysis.strength).toBe('left');
      expect(analysis.receiverDistribution.left).toBe(3);
    });

    it('should detect bunch formation', () => {
      const offensivePlayers: Player[] = [
        createPlayer('WR1', 'offense', 'WR', { x: 10, y: 0 }, true),
        createPlayer('WR2', 'offense', 'WR', { x: 12, y: 0 }, true),
        createPlayer('WR3', 'offense', 'WR', { x: 14, y: 0 }, true),
        createPlayer('TE', 'offense', 'TE', { x: 35, y: 0 }, true),
      ];

      const analysis = formationAnalyzer.analyzeFormation(offensivePlayers);

      expect(analysis.type).toBe('bunch');
      expect(analysis.receiverSets).toContain('bunch');
    });

    it('should detect spread formation', () => {
      const offensivePlayers: Player[] = [
        createPlayer('WR1', 'offense', 'WR', { x: 5, y: 0 }, true),
        createPlayer('WR2', 'offense', 'WR', { x: 15, y: 0 }, true),
        createPlayer('WR3', 'offense', 'WR', { x: 38, y: 0 }, true),
        createPlayer('WR4', 'offense', 'WR', { x: 48, y: 0 }, true),
      ];

      const analysis = formationAnalyzer.analyzeFormation(offensivePlayers);

      expect(analysis.receiverSets).toContain('spread');
      expect(analysis.personnel).toBe('00'); // No RBs, no TEs
    });

    it('should determine formation strength based on TE position', () => {
      const offensivePlayers: Player[] = [
        createPlayer('WR1', 'offense', 'WR', { x: 10, y: 0 }, true),
        createPlayer('WR2', 'offense', 'WR', { x: 43, y: 0 }, true),
        createPlayer('TE', 'offense', 'TE', { x: 38, y: 0 }, true),
        createPlayer('RB', 'offense', 'RB', { x: 26.67, y: -5 }, true),
      ];

      const analysis = formationAnalyzer.analyzeFormation(offensivePlayers);

      expect(analysis.strength).toBe('right'); // TE on right side
      expect(analysis.hasTE).toBe(true);
    });

    it('should calculate gaps correctly', () => {
      const offensivePlayers: Player[] = [
        createPlayer('TE', 'offense', 'TE', { x: 35, y: 0 }, true),
      ];

      const gaps = formationAnalyzer.determineGaps(offensivePlayers);

      expect(gaps).toHaveLength(8); // A, A, B, B, C, C, D, D gaps
      expect(gaps.filter(g => g.gap === 'A')).toHaveLength(2);
      expect(gaps.filter(g => g.gap === 'D')).toHaveLength(2); // D gaps when TE present
    });
  });

  describe('PersonnelMatcher', () => {
    it('should match offensive personnel to defensive personnel', () => {
      expect(personnelMatcher.getOptimalDefensivePersonnel('10')).toBe('Dime'); // 4 WR
      expect(personnelMatcher.getOptimalDefensivePersonnel('11')).toBe('Nickel'); // 3 WR
      expect(personnelMatcher.getOptimalDefensivePersonnel('12')).toBe('Base'); // 2 TE
      expect(personnelMatcher.getOptimalDefensivePersonnel('21')).toBe('Base'); // 2 RB
    });

    it('should check coverage compatibility with personnel', () => {
      // Tampa 2 requires 3 LBs
      expect(personnelMatcher.isCoverageCompatible('tampa-2', 'Base')).toBe(true);
      expect(personnelMatcher.isCoverageCompatible('tampa-2', 'Dime')).toBe(false);

      // Cover 4 needs 4 DBs
      expect(personnelMatcher.isCoverageCompatible('cover-4', 'Dime')).toBe(true);
      expect(personnelMatcher.isCoverageCompatible('cover-4', 'Goal Line')).toBe(false);
    });

    it('should get compatible coverages for personnel', () => {
      const dimeCompatible = personnelMatcher.getCompatibleCoverages('Dime');
      expect(dimeCompatible).not.toContain('tampa-2'); // Tampa 2 needs 3 LBs

      const baseCompatible = personnelMatcher.getCompatibleCoverages('Base');
      expect(baseCompatible).toContain('tampa-2');
      expect(baseCompatible).toContain('cover-3');
    });

    it('should generate correct defensive player types', () => {
      const nickelTypes = personnelMatcher.generateDefensivePlayerTypes('Nickel');
      expect(nickelTypes.filter(t => t === 'CB')).toHaveLength(2);
      expect(nickelTypes.filter(t => t === 'S')).toHaveLength(2);
      expect(nickelTypes.filter(t => t === 'NB')).toHaveLength(1);
      expect(nickelTypes.filter(t => t === 'LB')).toHaveLength(2);
    });

    it('should adjust personnel for game situation', () => {
      // Red zone, short yardage
      expect(personnelMatcher.getPersonnelForSituation(1, 1, 95, '12')).toBe('Goal Line');

      // 3rd and long
      expect(personnelMatcher.getPersonnelForSituation(3, 15, 50, '11')).toBe('Nickel');

      // Prevent defense
      expect(personnelMatcher.getPersonnelForSituation(4, 20, 50, '10')).toBe('Dime');
    });
  });

  describe('CoverageAdjustments', () => {
    it('should apply Cover 0 adjustments vs trips', () => {
      const defenders = createDefenders();
      const offensivePlayers: Player[] = [
        createPlayer('WR1', 'offense', 'WR', { x: 10, y: 0 }, true),
        createPlayer('WR2', 'offense', 'WR', { x: 15, y: 0 }, true),
        createPlayer('WR3', 'offense', 'WR', { x: 20, y: 0 }, true),
      ];

      const formation = formationAnalyzer.analyzeFormation(offensivePlayers);
      const adjustments = coverageAdjustments.applyCoverageSpecificAdjustments(
        'cover-0',
        defenders,
        offensivePlayers,
        formation
      );

      // NCB should bump to trips side
      const ncbAdjustment = adjustments.find(a => a.defenderId.includes('NB'));
      expect(ncbAdjustment).toBeDefined();
      expect(ncbAdjustment?.leverage).toBe('head-up');
    });

    it('should apply Cover 1 robber positioning', () => {
      const defenders = createDefenders();
      const offensivePlayers = createOffensivePlayers();
      const formation = formationAnalyzer.analyzeFormation(offensivePlayers);

      const adjustments = coverageAdjustments.applyCoverageSpecificAdjustments(
        'cover-1',
        defenders,
        offensivePlayers,
        formation
      );

      // FS should be in deep middle
      const fsAdjustment = adjustments.find(a => a.defenderId === 'FS');
      expect(fsAdjustment).toBeDefined();
      expect(fsAdjustment?.technique).toBe('center-field');

      // SS should be robber
      const ssAdjustment = adjustments.find(a => a.defenderId === 'SS');
      expect(ssAdjustment).toBeDefined();
      expect(ssAdjustment?.technique).toBe('robber');
    });

    it('should handle motion adjustments', () => {
      const defenders = createDefenders();
      const offensivePlayers = createOffensivePlayers();

      // Assign a defender to cover WR3 for Cover 0 test
      defenders[0].coverageAssignment = 'WR3'; // CB1 covers WR3

      const motion = {
        type: 'fly' as const,
        playerId: 'WR3',
        startPosition: { x: 40, y: 0 },
        endPosition: { x: 15, y: 0 },
        path: [],
        duration: 1,
        currentTime: 0.5
      };

      // Cover 0 should lock
      const cover0Adjustments = coverageAdjustments.handleMotionAdjustments(
        'cover-0',
        motion,
        defenders,
        offensivePlayers
      );
      expect(cover0Adjustments.length).toBeGreaterThan(0);

      // Cover 3 should buzz
      const cover3Adjustments = coverageAdjustments.handleMotionAdjustments(
        'cover-3',
        motion,
        defenders,
        offensivePlayers
      );
      expect(cover3Adjustments.length).toBeGreaterThan(0);
    });
  });

  describe('PostSnapRules', () => {
    it('should analyze route distribution', () => {
      const offensivePlayers = [
        createPlayerWithRoute('WR1', 25), // Deep
        createPlayerWithRoute('WR2', 15), // Intermediate
        createPlayerWithRoute('TE', 8),   // Shallow
        createPlayerWithRoute('RB', 3),   // Shallow
      ];

      const distribution = postSnapRules.analyzeRouteDistribution(offensivePlayers);

      expect(distribution.threats.deep).toHaveLength(1);
      expect(distribution.threats.intermediate).toHaveLength(1);
      expect(distribution.threats.shallow).toHaveLength(2);
    });

    it('should generate pattern match triggers for Cover 4', () => {
      const defenders = createDefenders();
      const offensivePlayers = [
        createPlayerWithRoute('WR1', 20),
        createPlayerWithRoute('WR2', 15), // #2 vertical
      ];

      const triggers = postSnapRules.getPatternMatchTriggers(
        'cover-4',
        defenders,
        offensivePlayers
      );

      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers.some(t => t.trigger === '#2 vertical')).toBe(true);
    });

    it('should determine zone handoff points', () => {
      const defenders = [
        createDefenderWithZone('CB1', 'flat', { x: 10, y: 5 }),
        createDefenderWithZone('LB1', 'hook', { x: 20, y: 10 }),
      ];

      const receiver = createPlayer('WR1', 'offense', 'WR', { x: 15, y: 7 }, true);

      const handoffs = postSnapRules.getZoneHandoffTriggers(defenders, receiver);

      expect(handoffs.length).toBeGreaterThan(0);
    });

    it('should calculate pursuit angles', () => {
      const defender = createPlayer('CB1', 'defense', 'CB', { x: 10, y: 10 });
      const ballCarrier = createPlayer('WR1', 'offense', 'WR', { x: 20, y: 5 });
      const ballVelocity = { x: 2, y: 0 };

      const angle = postSnapRules.calculatePursuitAngle(
        defender,
        ballCarrier,
        ballVelocity
      );

      expect(angle).toBeDefined();
      expect(typeof angle).toBe('number');
    });
  });

  // Helper functions
  function createPlayer(
    id: string,
    team: 'offense' | 'defense',
    playerType: any,
    position: Vector2D,
    isEligible: boolean = false
  ): Player {
    return {
      id,
      position,
      velocity: { x: 0, y: 0 },
      team,
      playerType,
      isEligible,
      maxSpeed: 9,
      currentSpeed: 0,
      isStar: false,
      hasMotion: false,
      hasMotionBoost: false,
      motionBoostTimeLeft: 0,
      isBlocking: false,
      acceleration: 0,
      isAccelerating: false,
      isDecelerating: false
    };
  }

  function createPlayerWithRoute(id: string, depth: number): Player {
    const player = createPlayer(id, 'offense', 'WR', { x: 20, y: 0 }, true);
    player.route = {
      type: 'go',
      waypoints: [],
      timing: [],
      depth
    };
    return player;
  }

  function createDefenderWithZone(id: string, zoneName: string, center: Vector2D): Player {
    const defender = createPlayer(id, 'defense', 'CB', { x: 10, y: 10 });
    defender.coverageResponsibility = {
      defenderId: id,
      type: 'zone',
      zone: {
        name: zoneName,
        center,
        width: 10,
        height: 10,
        depth: 10
      }
    };
    return defender;
  }

  function createDefenders(): Player[] {
    return [
      createPlayer('CB1', 'defense', 'CB', { x: 10, y: 7 }),
      createPlayer('CB2', 'defense', 'CB', { x: 43, y: 7 }),
      createPlayer('FS', 'defense', 'S', { x: 26.67, y: 15 }),
      createPlayer('SS', 'defense', 'S', { x: 26.67, y: 10 }),
      createPlayer('NB', 'defense', 'NB', { x: 20, y: 5 }),
      createPlayer('LB1', 'defense', 'LB', { x: 22, y: 5 }),
      createPlayer('LB2', 'defense', 'LB', { x: 31, y: 5 }),
    ];
  }

  function createOffensivePlayers(): Player[] {
    return [
      createPlayer('WR1', 'offense', 'WR', { x: 10, y: 0 }, true),
      createPlayer('WR2', 'offense', 'WR', { x: 43, y: 0 }, true),
      createPlayer('WR3', 'offense', 'WR', { x: 25, y: 0 }, true),
      createPlayer('TE', 'offense', 'TE', { x: 35, y: 0 }, true),
      createPlayer('RB', 'offense', 'RB', { x: 26.67, y: -5 }, true),
    ];
  }
});
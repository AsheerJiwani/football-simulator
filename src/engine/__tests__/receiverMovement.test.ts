import { ReceiverMovement } from '../receiverMovement';
import { Player, RouteType, Vector2D } from '../types';

describe('ReceiverMovement', () => {
  let receiverMovement: ReceiverMovement;

  beforeEach(() => {
    receiverMovement = new ReceiverMovement();
  });

  const createTestReceiver = (routeType: RouteType): Player => ({
    id: 'WR1',
    position: { x: 26, y: 30 },
    velocity: { x: 0, y: 0 },
    team: 'offense',
    playerType: 'WR',
    route: {
      type: routeType,
      waypoints: [
        { x: 26, y: 30 }, // Start position
        { x: 29, y: 30 }, // Stem
        { x: 30, y: 32 }  // Break
      ],
      timing: [0, 0.6, 1.8],
      depth: 3
    },
    isEligible: true,
    maxSpeed: 9.0,
    currentSpeed: 0,
    isStar: false,
    hasMotion: false,
    hasMotionBoost: false,
    motionBoostTimeLeft: 0,
    isBlocking: false,
    acceleration: 12,
    isAccelerating: false,
    isDecelerating: false
  });

  describe('Initialization', () => {
    it('should initialize receiver with proper state', () => {
      const receiver = createTestReceiver('slant');
      receiverMovement.initializeReceiver(receiver);

      // Should not throw and system should be ready
      expect(() => {
        receiverMovement.updateReceiverMovement(receiver, 0.016, 0.1);
      }).not.toThrow();
    });
  });

  describe('NFL Route Timing', () => {
    it('should return correct timing for slant route', () => {
      const timing = receiverMovement.getRouteTiming('slant');
      expect(timing).toBe(1.8); // NFL rhythm timing
    });

    it('should return correct timing for curl route', () => {
      const timing = receiverMovement.getRouteTiming('curl');
      expect(timing).toBe(2.2); // NFL read timing
    });
  });

  describe('Break Angles', () => {
    it('should return correct break angle for slant', () => {
      const angle = receiverMovement.getBreakAngle('slant');
      expect(angle).toBe(45);
    });

    it('should return correct break angle for out route', () => {
      const angle = receiverMovement.getBreakAngle('out');
      expect(angle).toBe(90);
    });

    it('should return correct break angle for hitch', () => {
      const angle = receiverMovement.getBreakAngle('hitch');
      expect(angle).toBe(180);
    });
  });

  describe('Speed Transitions', () => {
    it('should apply proper speed transition during acceleration phase', () => {
      const receiver = createTestReceiver('slant');
      receiverMovement.initializeReceiver(receiver);

      // At start (acceleration phase)
      const startPos = receiver.position;
      const newPos = receiverMovement.updateReceiverMovement(receiver, 0.016, 0.1);

      // Should have moved, indicating speed multiplier is being applied
      const distance = Math.sqrt(
        Math.pow(newPos.x - startPos.x, 2) + Math.pow(newPos.y - startPos.y, 2)
      );
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle route break timing correctly', () => {
      const receiver = createTestReceiver('slant');
      receiverMovement.initializeReceiver(receiver);

      // Simulate progression through break time
      let position = receiver.position;
      for (let time = 0; time <= 1.8; time += 0.016) {
        position = receiverMovement.updateReceiverMovement(receiver, 0.016, time);
        receiver.position = position;
      }

      // Should have progressed significantly through the route
      expect(position.y).toBeGreaterThan(30);
    });
  });

  describe('Coverage Leverage Adjustments', () => {
    it('should adjust route based on defender leverage', () => {
      const receiver = createTestReceiver('slant');
      const defender: Player = {
        id: 'CB1',
        position: { x: 24, y: 30 }, // Closer inside leverage
        velocity: { x: 0, y: 0 },
        team: 'defense',
        playerType: 'CB',
        isEligible: false,
        maxSpeed: 9.0,
        currentSpeed: 0,
        isStar: false,
        hasMotion: false,
        hasMotionBoost: false,
        motionBoostTimeLeft: 0,
        isBlocking: false,
        acceleration: 12,
        isAccelerating: false,
        isDecelerating: false
      };

      receiverMovement.initializeReceiver(receiver);

      // Test that leverage determination and adjustment methods work
      const leverageDetermination = receiverMovement['determineDefenderLeverage'];
      const stemAdjustmentCalc = receiverMovement['calculateStemAdjustment'];

      const receiverPos = { x: 26, y: 30 };
      const defenderPos = { x: 24, y: 30 }; // Outside leverage (defender outside receiver)

      const leverage = leverageDetermination.call(receiverMovement, receiverPos, defenderPos);
      expect(leverage).toBe('outside');

      const adjustment = stemAdjustmentCalc.call(receiverMovement, leverage, { routePhase: 'stem' } as any);
      expect(adjustment.x).toBe(-1.5); // Should stem inside to neutralize outside leverage
      expect(adjustment.y).toBe(0);
    });
  });

  describe('Route Types', () => {
    const routeTypes: RouteType[] = ['slant', 'out', 'curl', 'go', 'fade', 'hitch'];

    routeTypes.forEach(routeType => {
      it(`should handle ${routeType} route without errors`, () => {
        const receiver = createTestReceiver(routeType);
        receiverMovement.initializeReceiver(receiver);

        expect(() => {
          receiverMovement.updateReceiverMovement(receiver, 0.016, 0.1);
        }).not.toThrow();
      });
    });
  });

  describe('System Reset', () => {
    it('should reset receiver states properly', () => {
      const receiver = createTestReceiver('slant');
      receiverMovement.initializeReceiver(receiver);

      // Reset system
      receiverMovement.reset();

      // Should be able to re-initialize without issues
      expect(() => {
        receiverMovement.initializeReceiver(receiver);
        receiverMovement.updateReceiverMovement(receiver, 0.016, 0.1);
      }).not.toThrow();
    });
  });
});
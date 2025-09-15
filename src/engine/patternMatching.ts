import type {
  Player,
  Vector2D,
  CoverageResponsibility,
  GameState,
  CoverageType
} from './types';
import { Vector } from '@/lib/math';

/**
 * Advanced Pattern Matching System
 * Implements enhanced route combination recognition and automatic coverage adjustments
 * Based on NFL research from Phase 4.3
 */
export class PatternMatchingSystem {

  /**
   * Pattern matching trigger interface
   */
  static getPatternMatchTriggers(): PatternMatchTrigger[] {
    return [
      {
        routeCombination: ["smash"], // corner + hitch combination
        adjustmentType: "bracket",
        triggerTiming: 1.2,
        affectedDefenders: ["CB1", "S2"],
        rule: "CB takes hitch (low), SS takes corner (high)"
      },
      {
        routeCombination: ["flood"], // 3+ receivers to one side
        adjustmentType: "rotation",
        triggerTiming: 0.8,
        affectedDefenders: ["S1", "S2", "LB2"],
        rule: "FS rotates to flood side, SS becomes robber"
      },
      {
        routeCombination: ["mesh"], // crossing routes
        adjustmentType: "zone-to-man",
        triggerTiming: 1.5,
        affectedDefenders: ["LB1", "LB2"],
        rule: "LBs lock onto crossers at collision point"
      },
      {
        routeCombination: ["four-verts"],
        adjustmentType: "man-to-zone",
        triggerTiming: 0.6,
        affectedDefenders: ["all"],
        rule: "Convert to Quarters concept with pattern matching"
      },
      {
        routeCombination: ["trips-vertical"],
        adjustmentType: "bracket",
        triggerTiming: 1.0,
        affectedDefenders: ["CB1", "S2", "LB1"],
        rule: "Bracket #1, rob #2, sink on #3"
      }
    ];
  }

  /**
   * Analyze current route combinations and trigger adjustments
   */
  static processPatternMatching(
    defensePlayers: Player[],
    offensePlayers: Player[],
    coverage: CoverageType,
    gameTime: number,
    gameState: GameState
  ): void {
    const receivers = offensePlayers.filter(p => p.isEligible && p.playerType !== 'QB');
    const routes = receivers.map(r => r.route?.type).filter(Boolean) as string[];

    // Analyze route patterns
    const detectedPatterns = this.detectRoutePatterns(receivers);
    const triggers = this.getPatternMatchTriggers();

    triggers.forEach(trigger => {
      const timeSinceSnap = gameState.timeElapsed;

      // Check if timing window is met
      if (timeSinceSnap < trigger.triggerTiming) return;

      // Check if pattern is detected
      const hasPattern = trigger.routeCombination.some(pattern =>
        detectedPatterns.includes(pattern)
      );

      if (hasPattern) {
        this.executePatternMatchAdjustment(
          trigger,
          defensePlayers,
          receivers,
          coverage,
          gameState
        );
      }
    });
  }

  /**
   * Detect specific route patterns from receiver routes
   */
  private static detectRoutePatterns(receivers: Player[]): string[] {
    const patterns: string[] = [];
    const routes = receivers.map(r => r.route?.type).filter(Boolean) as string[];
    const positions = receivers.map(r => r.position);

    // Smash concept detection (corner + hitch combination)
    if (routes.includes('corner') && routes.includes('hitch')) {
      const cornerReceiver = receivers.find(r => r.route?.type === 'corner');
      const hitchReceiver = receivers.find(r => r.route?.type === 'hitch');

      if (cornerReceiver && hitchReceiver) {
        // Check if they're on same side (within 10 yards horizontally)
        const distance = Math.abs(cornerReceiver.position.x - hitchReceiver.position.x);
        if (distance <= 10) {
          patterns.push('smash');
        }
      }
    }

    // Flood concept detection (3+ receivers to one side)
    const leftReceivers = receivers.filter(r => r.position.x < 26.67);
    const rightReceivers = receivers.filter(r => r.position.x > 26.67);

    if (leftReceivers.length >= 3 || rightReceivers.length >= 3) {
      patterns.push('flood');
    }

    // Mesh concept detection (crossing routes)
    const crossingRoutes = routes.filter(r => ['mesh_cross', 'dig', 'in', 'slant'].includes(r));
    if (crossingRoutes.length >= 2) {
      patterns.push('mesh');
    }

    // Four Verts detection
    const verticalRoutes = routes.filter(r => ['go', 'fade', 'seam'].includes(r));
    if (verticalRoutes.length >= 4) {
      patterns.push('four-verts');
    }

    // Trips vertical detection
    const groupedReceivers = this.groupReceiversByProximity(receivers);
    const tripsGroup = groupedReceivers.find(group => group.length >= 3);

    if (tripsGroup) {
      const tripsRoutes = tripsGroup.map(r => r.route?.type).filter(Boolean);
      const verticalInTrips = tripsRoutes.filter(r => ['go', 'fade', 'seam', 'corner'].includes(r || ''));

      if (verticalInTrips.length >= 2) {
        patterns.push('trips-vertical');
      }
    }

    return patterns;
  }

  /**
   * Group receivers by proximity for formation analysis
   */
  private static groupReceiversByProximity(receivers: Player[]): Player[][] {
    const groups: Player[][] = [];
    const processed = new Set<string>();

    receivers.forEach(receiver => {
      if (processed.has(receiver.id)) return;

      const group = [receiver];
      processed.add(receiver.id);

      // Find nearby receivers (within 5 yards)
      receivers.forEach(other => {
        if (processed.has(other.id)) return;

        const distance = Vector.distance(receiver.position, other.position);
        if (distance <= 5) {
          group.push(other);
          processed.add(other.id);
        }
      });

      if (group.length > 1) {
        groups.push(group);
      }
    });

    return groups;
  }

  /**
   * Execute pattern match adjustment based on trigger
   */
  private static executePatternMatchAdjustment(
    trigger: PatternMatchTrigger,
    defensePlayers: Player[],
    receivers: Player[],
    coverage: CoverageType,
    gameState: GameState
  ): void {
    const { adjustmentType, affectedDefenders, rule } = trigger;

    switch (adjustmentType) {
      case 'bracket':
        this.executeBracketAdjustment(defensePlayers, receivers, affectedDefenders, rule);
        break;

      case 'rotation':
        this.executeRotationAdjustment(defensePlayers, receivers, affectedDefenders, rule);
        break;

      case 'zone-to-man':
        this.executeZoneToManAdjustment(defensePlayers, receivers, affectedDefenders, rule);
        break;

      case 'man-to-zone':
        this.executeManToZoneAdjustment(defensePlayers, receivers, coverage, rule);
        break;
    }
  }

  /**
   * Execute bracket adjustment for pattern recognition
   */
  private static executeBracketAdjustment(
    defensePlayers: Player[],
    receivers: Player[],
    affectedDefenders: string[],
    rule: string
  ): void {
    if (rule.includes("CB takes hitch")) {
      const cb = defensePlayers.find(d => affectedDefenders.includes(d.id));
      const safety = defensePlayers.find(d => d.playerType === 'S' && affectedDefenders.includes(d.id));
      const hitchReceiver = receivers.find(r => r.route?.type === 'hitch');
      const cornerReceiver = receivers.find(r => r.route?.type === 'corner');

      if (cb && safety && hitchReceiver && cornerReceiver) {
        // CB takes hitch (low)
        cb.coverageAssignment = `bracket-low-${hitchReceiver.id}`;
        if (cb.coverageResponsibility) {
          cb.coverageResponsibility.type = 'man';
          cb.coverageResponsibility.target = hitchReceiver.id;
          cb.coverageResponsibility.bracketType = 'top-bottom';
          cb.coverageResponsibility.maxDepth = 8; // Hitch depth
        }

        // Safety takes corner (high)
        safety.coverageAssignment = `bracket-high-${cornerReceiver.id}`;
        if (safety.coverageResponsibility) {
          safety.coverageResponsibility.type = 'zone';
          safety.coverageResponsibility.target = cornerReceiver.id;
          safety.coverageResponsibility.bracketType = 'top-bottom';
          safety.coverageResponsibility.triggerDepth = 12; // Corner route depth
        }
      }
    }
  }

  /**
   * Execute rotation adjustment for pattern recognition
   */
  private static executeRotationAdjustment(
    defensePlayers: Player[],
    receivers: Player[],
    affectedDefenders: string[],
    rule: string
  ): void {
    if (rule.includes("FS rotates to flood side")) {
      const fs = defensePlayers.find(d => d.playerType === 'S' && d.id.includes('1'));
      const ss = defensePlayers.find(d => d.playerType === 'S' && d.id.includes('2'));

      // Determine flood side
      const leftReceivers = receivers.filter(r => r.position.x < 26.67);
      const rightReceivers = receivers.filter(r => r.position.x > 26.67);
      const floodSide = leftReceivers.length > rightReceivers.length ? 'left' : 'right';
      const floodX = floodSide === 'left' ? 18 : 35;

      if (fs) {
        // FS rotates to flood side
        fs.position.x = floodX;
        fs.coverageAssignment = `flood-help-${floodSide}`;
      }

      if (ss) {
        // SS becomes robber
        ss.position.x = 26.67;
        ss.position.y = Math.max(ss.position.y - 5, 8); // Move closer to LOS
        ss.coverageAssignment = 'robber-flood-adjustment';
        if (ss.coverageResponsibility) {
          ss.coverageResponsibility.type = 'zone';
          ss.coverageResponsibility.qbKeyRules = {
            readEyes: true,
            jumpThreshold: 0.8,
            pursuitAngle: 'undercut'
          };
        }
      }
    }
  }

  /**
   * Execute zone-to-man adjustment for pattern recognition
   */
  private static executeZoneToManAdjustment(
    defensePlayers: Player[],
    receivers: Player[],
    affectedDefenders: string[],
    rule: string
  ): void {
    if (rule.includes("LBs lock onto crossers")) {
      const linebackers = defensePlayers.filter(d =>
        d.playerType === 'LB' && affectedDefenders.includes(d.id)
      );
      const crossingReceivers = receivers.filter(r =>
        ['mesh_cross', 'dig', 'in', 'slant'].includes(r.route?.type || '')
      );

      // Match linebackers to crossing receivers
      linebackers.forEach((lb, index) => {
        const crosser = crossingReceivers[index];
        if (crosser && lb.coverageResponsibility) {
          lb.coverageResponsibility.type = 'man';
          lb.coverageResponsibility.target = crosser.id;
          lb.coverageAssignment = `converted-man-${crosser.id}`;
        }
      });
    }
  }

  /**
   * Execute man-to-zone adjustment for pattern recognition
   */
  private static executeManToZoneAdjustment(
    defensePlayers: Player[],
    receivers: Player[],
    coverage: CoverageType,
    rule: string
  ): void {
    if (rule.includes("Convert to Quarters")) {
      // Convert all defenders to quarters zones
      const quarterZones = this.generateQuartersZones();

      defensePlayers.forEach((defender, index) => {
        const zone = quarterZones[index % quarterZones.length];
        if (defender.coverageResponsibility && zone) {
          defender.coverageResponsibility.type = 'zone';
          defender.coverageResponsibility.zone = zone;
          defender.coverageAssignment = `quarters-${zone.name}`;
          defender.coverageResponsibility.matchRules = "Match vertical routes at 8-12 yards";
        }
      });
    }
  }

  /**
   * Generate quarters coverage zones for pattern matching conversion
   */
  private static generateQuartersZones(): Array<{name: string, center: Vector2D, width: number, height: number, depth: number}> {
    return [
      {
        name: "quarters-1",
        center: { x: 8, y: 20 },
        width: 13.33,
        height: 40,
        depth: 20
      },
      {
        name: "quarters-2",
        center: { x: 18, y: 20 },
        width: 13.33,
        height: 40,
        depth: 20
      },
      {
        name: "quarters-3",
        center: { x: 35, y: 20 },
        width: 13.33,
        height: 40,
        depth: 20
      },
      {
        name: "quarters-4",
        center: { x: 45, y: 20 },
        width: 13.33,
        height: 40,
        depth: 20
      },
      {
        name: "underneath-1",
        center: { x: 13, y: 6 },
        width: 10,
        height: 8,
        depth: 6
      },
      {
        name: "hook",
        center: { x: 26.67, y: 8 },
        width: 15,
        height: 10,
        depth: 8
      },
      {
        name: "underneath-3",
        center: { x: 40, y: 6 },
        width: 10,
        height: 8,
        depth: 6
      }
    ];
  }

  /**
   * Check if pattern matching should be disabled for certain coverages
   */
  static shouldDisablePatternMatching(coverage: CoverageType): boolean {
    // Disable pattern matching for pure man coverages
    return coverage === 'cover-0' || coverage === 'cover-1';
  }

  /**
   * Get pattern match priority based on route combination
   */
  static getPatternMatchPriority(pattern: string): number {
    const priorities = {
      'four-verts': 1,     // Highest priority
      'flood': 2,
      'smash': 3,
      'trips-vertical': 4,
      'mesh': 5            // Lowest priority
    };

    return priorities[pattern as keyof typeof priorities] || 10;
  }
}

/**
 * Pattern matching trigger interface
 */
export interface PatternMatchTrigger {
  routeCombination: string[]; // routes that trigger adjustment
  adjustmentType: 'zone-to-man' | 'man-to-zone' | 'rotation' | 'bracket';
  triggerTiming: number; // seconds after snap
  affectedDefenders: string[];
  rule: string; // description of the adjustment
}
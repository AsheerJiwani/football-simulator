import type {
  Coverage,
  CoverageResponsibility,
  Player,
  Vector2D,
  Zone,
  CoverageType
} from './types';

// Extended CoverageResponsibility for advanced concepts
export interface AdvancedCoverageResponsibility extends CoverageResponsibility {
  // Bracket coverage properties
  bracketType?: 'top-bottom' | 'inside-outside';
  bracketPartner?: string; // defender ID of bracket partner
  primaryTarget?: string; // receiver being bracketed
  triggerRoutes?: string[]; // routes that activate bracket
  maxDepth?: number; // handoff depth for bracket coverage
  triggerDepth?: number; // depth at which bracket activates
  leverage?: 'inside' | 'outside' | 'head-up';

  // Robber/Lurk properties
  patternReads?: string[]; // patterns this defender reads
  qbKeyRules?: {
    readEyes: boolean;
    jumpThreshold: number; // seconds after snap to react
    pursuitAngle: 'undercut' | 'overthrow' | 'collision';
  };
  strengthAdjustment?: boolean; // adjusts position based on formation strength

  // Pattern matching enhancements
  matchRules?: string;
  patternTriggers?: PatternMatchTrigger[];

  // Disguise properties
  preSnapAlignment?: Vector2D;
  postSnapMovement?: {
    destination: Vector2D;
    timing: number; // seconds after snap
    trigger: 'snap' | 'ball-movement' | 'route-recognition';
  };
  disguiseType?: 'safety-rotation' | 'coverage-roll' | 'late-break';

  // Modern coverage properties
  poachRules?: {
    keyPlayer: string; // player to read (e.g., "TE")
    helpStrong: boolean;
    trigger: string; // condition that triggers poach
  };
  receivesHelp?: boolean; // gets help from poach defender
  invertedRole?: boolean; // playing inverted coverage (safety low, corner high)
}

// Pattern matching trigger interface
export interface PatternMatchTrigger {
  routeCombination: string[]; // routes that trigger adjustment
  adjustmentType: 'zone-to-man' | 'man-to-zone' | 'rotation' | 'bracket';
  triggerTiming: number; // seconds after snap
  affectedDefenders: string[];
  rule: string; // description of the adjustment
}

// Coverage disguise interface
export interface CoverageDisguise {
  preSnapAlignment: Vector2D;
  postSnapTransition: {
    newCoverage: CoverageType;
    rotationTiming: number;
    safetyMovement: Record<string, {
      preSnap: Vector2D;
      postSnap: Vector2D;
      role: string;
    }>;
  };
}

// Extended coverage interface for advanced concepts
export interface AdvancedCoverage extends Coverage {
  responsibilities: AdvancedCoverageResponsibility[];
  disguise?: CoverageDisguise;
  patternMatchRules?: PatternMatchTrigger[];
  motionAdjustments?: Record<string, string>;
}

/**
 * Advanced Coverage Concepts Implementation
 * Implements bracket coverage, robber/lurk techniques, pattern matching refinements,
 * coverage disguise, and modern NFL innovations
 */
export class AdvancedCoverageSystem {

  /**
   * Generate Cover 1 Bracket coverage with top-bottom concept
   * Based on NFL research from Bleacher Report and coaching clinics
   */
  generateCover1Bracket(): AdvancedCoverage {
    return {
      name: "Cover 1 Bracket",
      type: "cover-1",
      safetyCount: 1,
      description: "Cover 1 with top-bottom bracket on #1 receiver",
      positions: {
        "CB1": { x: 8, y: 7 },
        "CB2": { x: 45, y: 7 },
        "CB3": { x: 38, y: 6 },
        "S1": { x: 26.67, y: 14 }, // Free Safety - deep middle
        "S2": { x: 20, y: 12 }, // Strong Safety - bracket over
        "LB1": { x: 30, y: 5 },
        "LB2": { x: 23, y: 5 }
      },
      responsibilities: [
        {
          defenderId: "CB1", // Bottom bracket on #1
          type: "man",
          target: "#1",
          bracketType: "top-bottom",
          bracketPartner: "S2",
          leverage: "inside", // force outside to safety
          maxDepth: 12, // releases to safety at 12+ yards
          triggerRoutes: ["go", "fade", "corner", "comeback"]
        },
        {
          defenderId: "S2", // Top bracket on #1
          type: "zone",
          target: "#1",
          bracketType: "top-bottom",
          bracketPartner: "CB1",
          triggerDepth: 12, // takes over at 12+ yard routes
          zone: {
            name: "bracket-over",
            center: { x: 8, y: 18 }, // adjusts to #1 alignment
            width: 8,
            height: 15,
            depth: 18
          },
          triggerRoutes: ["go", "fade", "corner", "comeback"]
        },
        {
          defenderId: "CB2",
          type: "man",
          target: "#2"
        },
        {
          defenderId: "CB3",
          type: "man",
          target: "#3"
        },
        {
          defenderId: "S1", // Free Safety - deep middle
          type: "zone",
          zone: {
            name: "deep-middle-bracket",
            center: { x: 26.67, y: 22 },
            width: 20,
            height: 25,
            depth: 22
          }
        },
        {
          defenderId: "LB1",
          type: "man",
          target: "RB1"
        },
        {
          defenderId: "LB2",
          type: "zone",
          zone: {
            name: "hole-bracket",
            center: { x: 26.67, y: 8 },
            width: 12,
            height: 8,
            depth: 8
          }
        }
      ]
    };
  }

  /**
   * Generate Cover 1 Robber coverage with pattern reading
   * Based on NFL coaching clinic research and pattern matching techniques
   */
  generateCover1Robber(): AdvancedCoverage {
    return {
      name: "Cover 1 Robber",
      type: "cover-1",
      safetyCount: 1,
      description: "Cover 1 with robber defender reading QB eyes and patterns",
      positions: {
        "CB1": { x: 8, y: 7 },
        "CB2": { x: 45, y: 7 },
        "CB3": { x: 38, y: 6 },
        "S1": { x: 26.67, y: 25 }, // Free Safety - single high
        "S2": { x: 26.67, y: 8 }, // Strong Safety - robber
        "LB1": { x: 30, y: 5 },
        "LB2": { x: 23, y: 5 }
      },
      responsibilities: [
        {
          defenderId: "S2", // Robber defender
          type: "zone",
          zone: {
            name: "robber-hole",
            center: { x: 26.67, y: 8 },
            width: 12,
            height: 8,
            depth: 8
          },
          patternReads: ["mesh", "crossing", "shallow", "dig", "slant"],
          qbKeyRules: {
            readEyes: true,
            jumpThreshold: 0.6, // seconds after snap to react
            pursuitAngle: "undercut" // position between QB and target
          }
        },
        {
          defenderId: "S1", // Free Safety - expanded responsibility
          type: "zone",
          zone: {
            name: "deep-middle-robber",
            center: { x: 26.67, y: 25 },
            width: 22,
            height: 20,
            depth: 25
          }
        },
        {
          defenderId: "CB1",
          type: "man",
          target: "#1"
        },
        {
          defenderId: "CB2",
          type: "man",
          target: "#2"
        },
        {
          defenderId: "CB3",
          type: "man",
          target: "#3"
        },
        {
          defenderId: "LB1",
          type: "man",
          target: "RB1"
        },
        {
          defenderId: "LB2",
          type: "man",
          target: "TE1"
        }
      ]
    };
  }

  /**
   * Generate Cover 1 Lurk coverage (strength-side robber)
   * Based on modern NFL defensive concepts
   */
  generateCover1Lurk(): AdvancedCoverage {
    return {
      name: "Cover 1 Lurk",
      type: "cover-1",
      safetyCount: 1,
      description: "Cover 1 with lurk defender positioned toward formation strength",
      positions: {
        "CB1": { x: 8, y: 7 },
        "CB2": { x: 45, y: 7 },
        "CB3": { x: 38, y: 6 },
        "S1": { x: 26.67, y: 25 },
        "S2": { x: 20, y: 9 }, // Lurk to strength side
        "LB1": { x: 30, y: 5 },
        "LB2": { x: 23, y: 5 }
      },
      responsibilities: [
        {
          defenderId: "S2", // Lurk to strength side
          type: "zone",
          zone: {
            name: "lurk-hole-strong",
            center: { x: 20, y: 9 }, // shifts toward strength
            width: 10,
            height: 8,
            depth: 9
          },
          strengthAdjustment: true,
          patternReads: ["smash-low", "flood-underneath", "stick", "hitch"]
        },
        {
          defenderId: "S1",
          type: "zone",
          zone: {
            name: "deep-middle-lurk",
            center: { x: 26.67, y: 25 },
            width: 24,
            height: 20,
            depth: 25
          }
        },
        {
          defenderId: "CB1",
          type: "man",
          target: "#1"
        },
        {
          defenderId: "CB2",
          type: "man",
          target: "#2"
        },
        {
          defenderId: "CB3",
          type: "man",
          target: "#3"
        },
        {
          defenderId: "LB1",
          type: "man",
          target: "RB1"
        },
        {
          defenderId: "LB2",
          type: "man",
          target: "TE1"
        }
      ]
    };
  }

  /**
   * Generate Cover 2 Roll to Cover 1 disguise coverage
   * Based on NFL disguise and rotation concepts
   */
  generateCover2RollTo1(): AdvancedCoverage {
    return {
      name: "Cover 2 Roll to 1",
      type: "cover-2", // starts as Cover 2
      safetyCount: 2,
      description: "Cover 2 pre-snap alignment rolling to Cover 1 post-snap",
      positions: {
        "CB1": { x: 8, y: 5 },
        "CB2": { x: 45, y: 5 },
        "S1": { x: 18, y: 20 }, // Pre-snap: appears as Cover 2
        "S2": { x: 35, y: 20 }, // Pre-snap: appears as Cover 2
        "LB1": { x: 20, y: 5 },
        "LB2": { x: 26.67, y: 5 },
        "LB3": { x: 33, y: 5 }
      },
      disguise: {
        preSnapAlignment: { x: 26.67, y: 20 }, // both safeties deep
        postSnapTransition: {
          newCoverage: "cover-1",
          rotationTiming: 0.3, // 0.3s after snap
          safetyMovement: {
            "S2": {
              preSnap: { x: 35, y: 20 },
              postSnap: { x: 26.67, y: 8 }, // drops to robber
              role: "robber"
            },
            "S1": {
              preSnap: { x: 18, y: 20 },
              postSnap: { x: 26.67, y: 25 }, // single high
              role: "deep-middle"
            }
          }
        }
      },
      responsibilities: [
        {
          defenderId: "S1", // Rotates to single high
          type: "zone",
          preSnapAlignment: { x: 18, y: 20 },
          postSnapMovement: {
            destination: { x: 26.67, y: 25 },
            timing: 0.3,
            trigger: "snap"
          },
          zone: {
            name: "deep-middle-disguise",
            center: { x: 26.67, y: 25 },
            width: 24,
            height: 20,
            depth: 25
          }
        },
        {
          defenderId: "S2", // Drops to robber
          type: "zone",
          preSnapAlignment: { x: 35, y: 20 },
          postSnapMovement: {
            destination: { x: 26.67, y: 8 },
            timing: 0.3,
            trigger: "snap"
          },
          zone: {
            name: "robber-disguise",
            center: { x: 26.67, y: 8 },
            width: 12,
            height: 8,
            depth: 8
          },
          patternReads: ["mesh", "crossing", "shallow"]
        },
        {
          defenderId: "CB1",
          type: "man",
          target: "#1"
        },
        {
          defenderId: "CB2",
          type: "man",
          target: "#2"
        },
        {
          defenderId: "LB1",
          type: "man",
          target: "#3"
        },
        {
          defenderId: "LB2",
          type: "man",
          target: "TE1"
        },
        {
          defenderId: "LB3",
          type: "man",
          target: "RB1"
        }
      ]
    };
  }

  /**
   * Generate Quarters Poach coverage
   * Based on modern NFL safety help concepts
   */
  generateQuartersPoach(): AdvancedCoverage {
    return {
      name: "Quarters Poach",
      type: "quarters",
      safetyCount: 2,
      description: "Quarters coverage with backside safety providing help",
      positions: {
        "CB1": { x: 8, y: 7 },
        "CB2": { x: 45, y: 7 },
        "S1": { x: 18, y: 22 }, // Backside safety
        "S2": { x: 35, y: 22 }, // Strong safety
        "LB1": { x: 20, y: 6 },
        "LB2": { x: 26.67, y: 6 },
        "LB3": { x: 33, y: 6 }
      },
      responsibilities: [
        {
          defenderId: "S1", // Backside safety with poach rules
          type: "zone",
          zone: {
            name: "quarters-backside",
            center: { x: 18, y: 22 },
            width: 16,
            height: 20,
            depth: 22
          },
          poachRules: {
            keyPlayer: "TE1", // reads tight end
            helpStrong: true,
            trigger: "te-block-or-flat"
          }
        },
        {
          defenderId: "S2", // Strong safety receives help
          type: "zone",
          zone: {
            name: "quarters-strong-poach",
            center: { x: 35, y: 22 },
            width: 16,
            height: 20,
            depth: 22
          },
          receivesHelp: true // gets help from poach safety
        },
        {
          defenderId: "CB1",
          type: "zone",
          zone: {
            name: "quarters-corner1",
            center: { x: 8, y: 20 },
            width: 13.33,
            height: 40,
            depth: 20
          }
        },
        {
          defenderId: "CB2",
          type: "zone",
          zone: {
            name: "quarters-corner2",
            center: { x: 45, y: 20 },
            width: 13.33,
            height: 40,
            depth: 20
          }
        },
        {
          defenderId: "LB1",
          type: "zone",
          zone: {
            name: "underneath-1",
            center: { x: 13, y: 6 },
            width: 10,
            height: 8,
            depth: 6
          }
        },
        {
          defenderId: "LB2",
          type: "zone",
          zone: {
            name: "hook",
            center: { x: 26.67, y: 8 },
            width: 15,
            height: 10,
            depth: 8
          }
        },
        {
          defenderId: "LB3",
          type: "zone",
          zone: {
            name: "underneath-3",
            center: { x: 40, y: 6 },
            width: 10,
            height: 8,
            depth: 6
          }
        }
      ]
    };
  }

  /**
   * Generate Cover 2 Invert coverage
   * Based on modern NFL inverted coverage concepts
   */
  generateCover2Invert(): AdvancedCoverage {
    return {
      name: "Cover 2 Invert",
      type: "cover-2",
      safetyCount: 2,
      description: "Inverted coverage with safety low and corner high",
      positions: {
        "CB1": { x: 8, y: 12 }, // Corner plays high
        "CB2": { x: 45, y: 5 },
        "S1": { x: 13, y: 16 },
        "S2": { x: 8, y: 10 }, // Safety plays low (inverted)
        "LB1": { x: 20, y: 5 },
        "LB2": { x: 26.67, y: 5 },
        "LB3": { x: 33, y: 5 }
      },
      responsibilities: [
        {
          defenderId: "CB1", // Corner plays deep (inverted)
          type: "zone",
          zone: {
            name: "deep-outside-invert",
            center: { x: 8, y: 22 },
            width: 12,
            height: 20,
            depth: 22
          },
          invertedRole: true // corner plays deep
        },
        {
          defenderId: "S2", // Safety plays low (inverted)
          type: "zone",
          zone: {
            name: "robber-invert",
            center: { x: 8, y: 10 },
            width: 8,
            height: 8,
            depth: 10
          },
          invertedRole: true // safety plays low
        },
        {
          defenderId: "CB2",
          type: "zone",
          zone: {
            name: "flat-right",
            center: { x: 45, y: 8 },
            width: 8,
            height: 12,
            depth: 8
          }
        },
        {
          defenderId: "S1",
          type: "zone",
          zone: {
            name: "deep-right",
            center: { x: 37, y: 20 },
            width: 26.67,
            height: 40,
            depth: 20
          }
        },
        {
          defenderId: "LB1",
          type: "zone",
          zone: {
            name: "hook-left",
            center: { x: 20, y: 6 },
            width: 10,
            height: 8,
            depth: 6
          }
        },
        {
          defenderId: "LB2",
          type: "zone",
          zone: {
            name: "middle-hook",
            center: { x: 26.67, y: 8 },
            width: 15,
            height: 10,
            depth: 8
          }
        },
        {
          defenderId: "LB3",
          type: "zone",
          zone: {
            name: "hook-right",
            center: { x: 33, y: 6 },
            width: 10,
            height: 8,
            depth: 6
          }
        }
      ]
    };
  }

  /**
   * Get all available advanced coverage concepts
   */
  getAllAdvancedCoverages(): AdvancedCoverage[] {
    return [
      this.generateCover1Bracket(),
      this.generateCover1Robber(),
      this.generateCover1Lurk(),
      this.generateCover2RollTo1(),
      this.generateQuartersPoach(),
      this.generateCover2Invert()
    ];
  }

  /**
   * Get pattern matching rules for advanced concepts
   */
  getAdvancedPatternMatchRules(): PatternMatchTrigger[] {
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
      }
    ];
  }
}
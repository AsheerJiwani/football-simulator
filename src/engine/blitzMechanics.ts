// NFL Blitz and Pass Rush Mechanics
import { Player, CoverageResponsibility, Vector2D, CoverageType, GameState } from './types';

// Blitz package definitions based on NFL research
export interface BlitzPackage {
  name: string;
  rushers: number;
  coverage: {
    deep?: number;
    underneath?: number;
    man?: number;
  };
  responsibilities: BlitzResponsibility[];
  timingModifier?: number; // +/- seconds from base timing
}

export interface BlitzResponsibility extends CoverageResponsibility {
  rushLane?: 'A-gap' | 'B-gap' | 'C-gap' | 'edge';
  target?: 'center' | 'guard' | 'tackle' | 'contain';
  timingSeconds?: number; // time to reach QB
  priority?: number; // rush priority (1 = highest)
}

export interface PressureTiming {
  rushers: number;
  minTime: number;
  maxTime: number;
  averageTime: number;
}

export interface RushLane {
  name: 'A-gap' | 'B-gap' | 'C-gap' | 'edge';
  aimPoint: Vector2D;
  width: number;
  containResponsibility: boolean;
  timingModifier: number;
}

export interface ProtectionAssignment {
  playerId: string;
  position: 'RB' | 'TE' | 'FB';
  scanDirection: 'inside-out' | 'outside-in';
  priority: string[]; // defender types in priority order
  effectiveness: Record<string, number>; // effectiveness vs different rusher types
  maxBlockTime: number; // seconds before rusher breaks free
}

export interface PressureEffect {
  clean: { accuracyMultiplier: number; throwTime: number };
  pressured: { accuracyMultiplier: number; throwTime: number };
  collapsed: { accuracyMultiplier: number; throwTime: number };
}

// NFL-based pressure timing by rusher count
export const PRESSURE_TIMING: Record<string, PressureTiming> = {
  '3-man': { rushers: 3, minTime: 4.0, maxTime: 5.0, averageTime: 4.5 },
  '4-man': { rushers: 4, minTime: 3.5, maxTime: 4.0, averageTime: 3.75 },
  '5-man': { rushers: 5, minTime: 2.5, maxTime: 3.0, averageTime: 2.75 },
  '6-man': { rushers: 6, minTime: 1.5, maxTime: 2.5, averageTime: 2.0 }
};

export const SACK_TIMING: Record<string, PressureTiming> = {
  '3-man': { rushers: 3, minTime: 5.0, maxTime: 6.0, averageTime: 5.5 },
  '4-man': { rushers: 4, minTime: 4.0, maxTime: 5.0, averageTime: 4.5 },
  '5-man': { rushers: 5, minTime: 3.0, maxTime: 4.0, averageTime: 3.5 },
  '6-man': { rushers: 6, minTime: 2.0, maxTime: 3.5, averageTime: 2.75 }
};

// Rush lane definitions with contain mechanics
export const RUSH_LANES: Record<string, RushLane> = {
  'A-gap': {
    name: 'A-gap',
    aimPoint: { x: 26.67, y: 2 }, // Center of field, 2 yards deep
    width: 2,
    containResponsibility: false,
    timingModifier: -0.3 // Faster interior rush
  },
  'B-gap': {
    name: 'B-gap',
    aimPoint: { x: 23, y: 2.5 }, // Guard position
    width: 3,
    containResponsibility: false,
    timingModifier: -0.2
  },
  'C-gap': {
    name: 'C-gap',
    aimPoint: { x: 20, y: 3 }, // Tackle position
    width: 3,
    containResponsibility: false,
    timingModifier: -0.1
  },
  'edge': {
    name: 'edge',
    aimPoint: { x: 17, y: 4 }, // 4 yards behind tackle
    width: 8,
    containResponsibility: true,
    timingModifier: 0.2 // Maintain contain, slightly slower
  }
};

// Protection assignments for RB/TE
export const PROTECTION_ASSIGNMENTS: Record<string, ProtectionAssignment> = {
  RB: {
    playerId: 'RB1',
    position: 'RB',
    scanDirection: 'inside-out',
    priority: ['MIKE', 'SAM', 'WILL', 'SS'],
    effectiveness: {
      'LB': 0.85,  // Good vs linebackers
      'S': 0.65,   // Struggle vs safeties
      'CB': 0.70   // Average vs corners
    },
    maxBlockTime: 3.0
  },
  TE: {
    playerId: 'TE1',
    position: 'TE',
    scanDirection: 'outside-in',
    priority: ['SAM', 'WILL', 'SS', 'MIKE'],
    effectiveness: {
      'LB': 0.90,  // Excellent vs linebackers
      'S': 0.75,   // Good vs safeties
      'CB': 0.80   // Good vs corners
    },
    maxBlockTime: 3.5
  }
};

// Pressure effects on QB performance
export const PRESSURE_EFFECTS: PressureEffect = {
  clean: {
    accuracyMultiplier: 1.0,
    throwTime: 0.8
  },
  pressured: {
    accuracyMultiplier: 0.85,
    throwTime: 0.6
  },
  collapsed: {
    accuracyMultiplier: 0.70,
    throwTime: 0.4
  }
};

// NFL Blitz packages
export const BLITZ_PACKAGES: Record<string, BlitzPackage> = {
  'Cover 0': {
    name: 'Cover 0',
    rushers: 6,
    coverage: { man: 6 },
    responsibilities: [
      {
        defenderId: 'SS',
        type: 'blitz',
        rushLane: 'A-gap',
        target: 'center',
        timingSeconds: 1.5,
        priority: 1
      },
      {
        defenderId: 'MIKE',
        type: 'blitz',
        rushLane: 'A-gap',
        target: 'center',
        timingSeconds: 1.6,
        priority: 2
      }
    ] as BlitzResponsibility[]
  },
  'Fire Zone': {
    name: 'Fire Zone',
    rushers: 5,
    coverage: { deep: 3, underneath: 3 },
    responsibilities: [
      {
        defenderId: 'MIKE',
        type: 'blitz',
        rushLane: 'A-gap',
        target: 'center',
        timingSeconds: 1.8,
        priority: 1
      },
      {
        defenderId: 'WILL',
        type: 'blitz',
        rushLane: 'B-gap',
        target: 'guard',
        timingSeconds: 2.0,
        priority: 2
      },
      {
        defenderId: 'SAM',
        type: 'blitz',
        rushLane: 'edge',
        target: 'contain',
        timingSeconds: 2.2,
        priority: 3
      }
    ] as BlitzResponsibility[]
  },
  'Safety Blitz': {
    name: 'Safety Blitz',
    rushers: 5,
    coverage: { deep: 2, underneath: 4 },
    responsibilities: [
      {
        defenderId: 'SS',
        type: 'blitz',
        rushLane: 'A-gap',
        target: 'center',
        timingSeconds: 1.6,
        priority: 1
      }
    ] as BlitzResponsibility[]
  },
  'Corner Blitz': {
    name: 'Corner Blitz',
    rushers: 5,
    coverage: { deep: 2, underneath: 4 },
    responsibilities: [
      {
        defenderId: 'CB1',
        type: 'blitz',
        rushLane: 'edge',
        target: 'contain',
        timingSeconds: 2.4,
        priority: 1
      }
    ] as BlitzResponsibility[]
  }
};

// Critical timing constants
export const CRITICAL_PRESSURE_TIME = 2.5; // NFL standard for pressure vs clean pocket
export const QB_REACTION_TIME = 0.3; // Average QB reaction to pressure
export const HOT_ROUTE_TRIGGER_TIME = 2.0; // When hot routes activate
export const HOT_ROUTE_COMPLETION_TIME = 2.5; // Must complete throw before sack

/**
 * Calculate actual pressure timing based on user's sack time setting
 */
export function calculatePressureTiming(
  rushers: number,
  userSackTime: number,
  rushLane?: string
): { pressureTime: number; sackTime: number } {
  const key = `${rushers}-man`;
  const baseTiming = PRESSURE_TIMING[key];
  const baseSackTiming = SACK_TIMING[key];

  if (!baseTiming || !baseSackTiming) {
    // Default fallback
    return {
      pressureTime: Math.max(1.5, userSackTime - 1.0),
      sackTime: userSackTime
    };
  }

  // Scale NFL timing to user's sack time preference
  const scaleFactor = userSackTime / baseSackTiming.averageTime;
  let pressureTime = baseTiming.averageTime * scaleFactor;

  // Apply rush lane timing modifier
  if (rushLane && RUSH_LANES[rushLane]) {
    pressureTime += RUSH_LANES[rushLane].timingModifier * scaleFactor;
  }

  // Ensure pressure happens before sack
  pressureTime = Math.max(1.0, Math.min(pressureTime, userSackTime - 0.5));

  return {
    pressureTime,
    sackTime: userSackTime
  };
}

/**
 * Determine if blitz should be triggered based on coverage
 */
export function shouldTriggerBlitz(coverage: CoverageType): boolean {
  return coverage === 'cover-0' ||
         Math.random() < getBlitzProbability(coverage);
}

/**
 * Get blitz probability by coverage type
 */
export function getBlitzProbability(coverage: CoverageType): number {
  const blitzRates: Record<CoverageType, number> = {
    'cover-0': 1.0,    // Always blitz
    'cover-1': 0.25,   // Occasional fire zone
    'cover-2': 0.15,   // Rare
    'cover-3': 0.20,   // Some fire zones
    'cover-4': 0.10,   // Very rare
    'cover-6': 0.30,   // Higher blitz rate
    'quarters': 0.12,  // Rare
    'tampa-2': 0.18    // Occasional
  };

  return blitzRates[coverage] || 0.15;
}

/**
 * Get appropriate blitz package for coverage
 */
export function getBlitzPackage(coverage: CoverageType): BlitzPackage | null {
  switch (coverage) {
    case 'cover-0':
      return BLITZ_PACKAGES['Cover 0'];
    case 'cover-1':
    case 'cover-3':
      return BLITZ_PACKAGES['Fire Zone'];
    case 'cover-2':
      return BLITZ_PACKAGES['Safety Blitz'];
    default:
      return Math.random() < 0.5
        ? BLITZ_PACKAGES['Fire Zone']
        : BLITZ_PACKAGES['Safety Blitz'];
  }
}

/**
 * Calculate pressure effects on QB accuracy
 */
export function getPressureEffect(
  timeElapsed: number,
  pressureTime: number,
  sackTime: number
): keyof PressureEffect {
  if (timeElapsed < pressureTime) {
    return 'clean';
  } else if (timeElapsed < sackTime - 0.5) {
    return 'pressured';
  } else {
    return 'collapsed';
  }
}

/**
 * Check if protection assignment can handle rusher
 */
export function canBlockRusher(
  protector: Player,
  rusher: Player,
  assignment: ProtectionAssignment
): boolean {
  const effectiveness = assignment.effectiveness[rusher.playerType] || 0.5;
  return Math.random() < effectiveness;
}

/**
 * Calculate rush lane assignment for blitzer
 */
export function assignRushLane(
  blitzer: Player,
  rushLane: 'A-gap' | 'B-gap' | 'C-gap' | 'edge'
): Vector2D {
  const lane = RUSH_LANES[rushLane];
  if (!lane) {
    return { x: 26.67, y: 2 }; // Default to A-gap
  }

  // Adjust for left/right side based on blitzer position
  let aimX = lane.aimPoint.x;
  if (blitzer.position.x < 26.67) {
    // Left side rusher
    aimX = 53.33 - lane.aimPoint.x;
  }

  return {
    x: aimX,
    y: lane.aimPoint.y
  };
}

/**
 * Update blitzer movement toward rush lane
 */
export function updateBlitzerMovement(
  blitzer: Player,
  rushLane: 'A-gap' | 'B-gap' | 'C-gap' | 'edge',
  dt: number
): void {
  if (blitzer.coverageResponsibility?.type !== 'blitz') return;

  const target = assignRushLane(blitzer, rushLane);
  const dx = target.x - blitzer.position.x;
  const dy = target.y - blitzer.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0.5) {
    // Move toward rush lane
    const direction = { x: dx / distance, y: dy / distance };
    blitzer.velocity = {
      x: direction.x * blitzer.maxSpeed,
      y: direction.y * blitzer.maxSpeed
    };

    // Update position
    blitzer.position.x += blitzer.velocity.x * dt;
    blitzer.position.y += blitzer.velocity.y * dt;
  }
}

/**
 * Check if hot route should trigger due to blitz
 */
export function shouldTriggerHotRoute(
  rushers: number,
  timeElapsed: number
): boolean {
  return rushers >= 5 && timeElapsed >= HOT_ROUTE_TRIGGER_TIME;
}
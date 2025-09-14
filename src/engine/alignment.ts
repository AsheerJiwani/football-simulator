import type { Player, Vector2D } from './types';
import { Vector } from '@/lib/math';

// Formation strength determination
export type FormationStrength = 'left' | 'right' | 'balanced';

export interface FormationAnalysis {
  strength: FormationStrength;
  receiversLeft: Player[];
  receiversRight: Player[];
  hasTE: boolean;
  teSide?: 'left' | 'right';
  isTrips: boolean;
  tripsSide?: 'left' | 'right';
  personnel: PersonnelPackage;
}

export interface PersonnelPackage {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FB: number;
}

export interface DefensivePersonnel {
  CB: number;
  S: number;
  LB: number;
  NB: number; // Nickel backs
}

// Coverage leverage options
export type Leverage = 'inside' | 'outside' | 'head-up';

// NFL Cover 1 alignment constants (based on research)
export const COVER_1_CONSTANTS = {
  CB_DEPTH_SOFT: 7,        // 7-8 yards off LOS for soft coverage
  CB_DEPTH_PRESS: 1,       // 1-2 yards off LOS for press coverage
  FS_DEPTH: 14,            // 14-16 yards centerfield
  SS_DEPTH_VS_TE: 9,       // 9 yards when covering TE
  LB_DEPTH: 5,             // 4-6 yards off LOS
  BOUNDARY_SWITCH: 6,      // Inside leverage if receiver within 6 yards of sideline
  ROUTE_BREAK_DEPTH: 13,   // Anticipate route breaks at this depth
} as const;

/**
 * Count personnel by position type
 */
function countPersonnel(players: Player[]): PersonnelPackage {
  const personnel: PersonnelPackage = { QB: 0, RB: 0, WR: 0, TE: 0, FB: 0 };

  players.forEach(player => {
    if (player.playerType in personnel) {
      personnel[player.playerType as keyof PersonnelPackage]++;
    }
  });

  return personnel;
}

/**
 * Analyze offensive formation to determine strength and receiver distribution
 */
export function analyzeFormation(offensivePlayers: Player[]): FormationAnalysis {
  const receivers = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB');
  const te = receivers.find(p => p.playerType === 'TE');
  const personnel = countPersonnel(offensivePlayers);

  // Separate receivers by side of field (using middle of field as divider)
  const midfield = 26.665; // Middle of 53.33 yard field
  const receiversLeft = receivers.filter(p => p.position.x < midfield);
  const receiversRight = receivers.filter(p => p.position.x >= midfield);

  let strength: FormationStrength = 'balanced';
  let teSide: 'left' | 'right' | undefined;
  let isTrips = false;
  let tripsSide: 'left' | 'right' | undefined;

  // Determine TE side
  if (te) {
    teSide = te.position.x < midfield ? 'left' : 'right';
    strength = teSide; // TE side is strength
  }

  // Check for trips (3+ receivers on one side)
  if (receiversLeft.length >= 3) {
    isTrips = true;
    tripsSide = 'left';
    strength = 'left';
  } else if (receiversRight.length >= 3) {
    isTrips = true;
    tripsSide = 'right';
    strength = 'right';
  }

  // If no TE and no trips, use wider side
  if (!te && !isTrips) {
    if (receiversLeft.length > receiversRight.length) {
      strength = 'left';
    } else if (receiversRight.length > receiversLeft.length) {
      strength = 'right';
    }
  }

  return {
    strength,
    receiversLeft,
    receiversRight,
    hasTE: !!te,
    teSide,
    isTrips,
    tripsSide,
    personnel,
  };
}

/**
 * Get receivers by their alignment number (#1, #2, #3) for each side
 */
export function getReceiversByAlignment(receivers: Player[]): { number1?: Player, number2?: Player, number3?: Player } {
  if (receivers.length === 0) return {};

  // Sort by distance from LOS (closest to LOS is #1)
  const sorted = receivers.sort((a, b) => b.position.y - a.position.y);

  return {
    number1: sorted[0],
    number2: sorted[1],
    number3: sorted[2],
  };
}

/**
 * Calculate proper leverage for a defender based on receiver position and coverage rules
 */
export function calculateLeverage(receiver: Player, fieldBoundary: 'left' | 'right'): Leverage {
  const boundaryDistance = fieldBoundary === 'left'
    ? receiver.position.x
    : 53.33 - receiver.position.x;

  // Inside leverage if receiver is within 6 yards of boundary
  if (boundaryDistance < COVER_1_CONSTANTS.BOUNDARY_SWITCH) {
    return 'inside';
  }

  // Default outside leverage for Cover 1
  return 'outside';
}

/**
 * Calculate Cover 1 Free Safety position
 */
export function getCover1FreeSafety(formation: FormationAnalysis, los: number): Vector2D {
  const centerX = 26.665; // Center of field
  const depth = COVER_1_CONSTANTS.FS_DEPTH;

  // Shade slightly toward strength
  let xAdjustment = 0;
  if (formation.strength === 'left') {
    xAdjustment = -2; // Shade 2 yards toward left
  } else if (formation.strength === 'right') {
    xAdjustment = 2; // Shade 2 yards toward right
  }

  return {
    x: centerX + xAdjustment,
    y: los - depth, // Position on defensive side of LOS
  };
}

/**
 * Calculate Cover 1 Cornerback position
 */
export function getCover1Cornerback(receiver: Player, leverage: Leverage, los: number, coverage: 'soft' | 'press' = 'soft'): Vector2D {
  const depth = coverage === 'press' ? COVER_1_CONSTANTS.CB_DEPTH_PRESS : COVER_1_CONSTANTS.CB_DEPTH_SOFT;

  let xOffset = 0;
  if (leverage === 'outside') {
    xOffset = 2; // 2 yards outside shade
  } else if (leverage === 'inside') {
    xOffset = -2; // 2 yards inside shade
  }

  return {
    x: receiver.position.x + xOffset,
    y: los - depth, // On defensive side of LOS
  };
}

/**
 * Calculate Cover 1 Strong Safety position
 */
export function getCover1StrongSafety(targetReceiver: Player, _los: number): Vector2D {
  const depth = COVER_1_CONSTANTS.SS_DEPTH_VS_TE;

  // 2 yards outside the target receiver
  return {
    x: targetReceiver.position.x + 2,
    y: targetReceiver.position.y - depth,
  };
}

/**
 * Calculate Cover 1 Linebacker position
 */
export function getCover1Linebacker(targetReceiver: Player, los: number, role: 'coverage' | 'spy' = 'coverage'): Vector2D {
  const depth = COVER_1_CONSTANTS.LB_DEPTH;

  if (role === 'spy') {
    // Spy stays in middle of field to watch QB
    return {
      x: 26.665,
      y: los - depth,
    };
  }

  // Coverage linebacker aligns over target at x position, 5 yards on defensive side
  return {
    x: targetReceiver.position.x,
    y: los - depth,  // 5 yards on defensive side of LOS
  };
}

/**
 * Adjust defender position based on motion
 */
export function adjustForMotion(
  defender: Player,
  motionReceiver: Player,
  motionDirection: 'left' | 'right'
): Vector2D {
  // If this defender is assigned to the motion receiver, follow
  if (defender.coverageResponsibility?.target === motionReceiver.id) {
    // Maintain same relative positioning
    const currentOffset = Vector.subtract(defender.position, motionReceiver.position);
    return Vector.add(motionReceiver.position, currentOffset);
  }

  // Adjacent defenders bump slightly toward motion
  const bumpDistance = 1; // 1 yard bump
  const bumpDirection = motionDirection === 'right' ? bumpDistance : -bumpDistance;

  return {
    x: defender.position.x + bumpDirection,
    y: defender.position.y,
  };
}

/**
 * Determine optimal defensive personnel based on offensive personnel
 */
export function getOptimalDefensivePersonnel(offensivePersonnel: PersonnelPackage): DefensivePersonnel {
  const totalReceivers = offensivePersonnel.WR + offensivePersonnel.TE + offensivePersonnel.RB + offensivePersonnel.FB;

  // Base Cover 1 personnel: 2 CBs, 1 FS, 4 LBs
  const basePersonnel: DefensivePersonnel = {
    CB: 2,
    S: 1, // Free Safety
    LB: 4,
    NB: 0,
  };

  // Create adjustable copy
  const personnel = { ...basePersonnel };

  // Adjust based on offensive personnel
  if (offensivePersonnel.WR >= 4) {
    // 4+ WRs: Add nickel back, reduce LB
    personnel.NB = 1;
    personnel.LB = 3;
  }

  if (offensivePersonnel.WR >= 5) {
    // 5 WRs: Add dime back (second nickel), reduce another LB
    personnel.NB = 2;
    personnel.LB = 2;
  }

  if (offensivePersonnel.TE >= 2) {
    // Multiple TEs: May need Strong Safety, adjust LBs
    personnel.S = 2; // Add Strong Safety
    personnel.LB = Math.max(2, personnel.LB - 1);
  }

  return personnel;
}

/**
 * Generate defensive player assignments based on offensive personnel
 */
export function generateDefensiveAssignments(
  formation: FormationAnalysis,
  requiredPersonnel: DefensivePersonnel
): Array<{ defenderId: string; playerType: string; target?: string; role: string }> {
  const assignments: Array<{ defenderId: string; playerType: string; target?: string; role: string }> = [];
  const receivers = [...formation.receiversLeft, ...formation.receiversRight];

  // Sort receivers by priority: #1 outside receivers first, then slots, then TEs/RBs
  const sortedReceivers = receivers.sort((a, b) => {
    // WRs get priority over TEs/RBs
    if (a.playerType === 'WR' && b.playerType !== 'WR') return -1;
    if (b.playerType === 'WR' && a.playerType !== 'WR') return 1;

    // Among same type, sort by field width (outside receivers first)
    const aDistFromCenter = Math.abs(a.position.x - 26.665);
    const bDistFromCenter = Math.abs(b.position.x - 26.665);
    return bDistFromCenter - aDistFromCenter;
  });

  let cbCount = 0;
  let nbCount = 0;
  let lbCount = 0;

  // Assign cornerbacks to #1 receivers on each side
  const leftNumber1 = formation.receiversLeft
    .sort((a, b) => Math.abs(b.position.x - 0) - Math.abs(a.position.x - 0))[0];
  const rightNumber1 = formation.receiversRight
    .sort((a, b) => Math.abs(a.position.x - 53.33) - Math.abs(b.position.x - 53.33))[0];

  if (leftNumber1) {
    assignments.push({
      defenderId: `CB${++cbCount}`,
      playerType: 'CB',
      target: leftNumber1.id,
      role: 'man-coverage'
    });
  }

  if (rightNumber1) {
    assignments.push({
      defenderId: `CB${++cbCount}`,
      playerType: 'CB',
      target: rightNumber1.id,
      role: 'man-coverage'
    });
  }

  // Assign nickel backs to slot receivers
  sortedReceivers.forEach(receiver => {
    if (receiver === leftNumber1 || receiver === rightNumber1) return; // Already assigned

    if (nbCount < requiredPersonnel.NB) {
      assignments.push({
        defenderId: `NB${++nbCount}`,
        playerType: 'NB',
        target: receiver.id,
        role: 'man-coverage'
      });
    } else if (lbCount < requiredPersonnel.LB) {
      // Assign remaining receivers to linebackers
      const lbType = receiver.playerType === 'TE' ? 'LB' :
                    receiver.playerType === 'RB' ? 'LB' : 'LB';
      assignments.push({
        defenderId: `LB${++lbCount}`,
        playerType: lbType,
        target: receiver.id,
        role: 'man-coverage'
      });
    }
  });

  // Add remaining linebackers for spy/zone coverage
  while (lbCount < requiredPersonnel.LB) {
    const role = lbCount === requiredPersonnel.LB - 1 ? 'spy' : 'zone';
    assignments.push({
      defenderId: `LB${++lbCount}`,
      playerType: 'LB',
      target: role === 'spy' ? 'QB1' : undefined,
      role
    });
  }

  // Add safeties
  assignments.push({
    defenderId: 'S1',
    playerType: 'S',
    role: 'free-safety'
  });

  if (requiredPersonnel.S > 1) {
    const strongSideReceiver = formation.strength === 'left'
      ? formation.receiversLeft[1]
      : formation.receiversRight[1];

    assignments.push({
      defenderId: 'SS1',
      playerType: 'S',
      target: strongSideReceiver?.id,
      role: 'strong-safety'
    });
  }

  return assignments.slice(0, 7); // Ensure exactly 7 defenders
}

/**
 * Generate complete Cover 1 defensive alignment
 */
export function generateCover1Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Get receivers by side
  const leftReceivers = getReceiversByAlignment(formation.receiversLeft);
  const rightReceivers = getReceiversByAlignment(formation.receiversRight);

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;
    if (!responsibility) return;

    switch (defender.playerType) {
      case 'S':
        if (defender.id === 'S1' || defender.id === 'FS') {
          positions[defender.id] = getCover1FreeSafety(formation, los);
        } else {
          // Strong Safety - cover #2 receiver on strength side
          const strongSideReceivers = formation.strength === 'left' ? leftReceivers : rightReceivers;
          if (strongSideReceivers.number2) {
            positions[defender.id] = getCover1StrongSafety(strongSideReceivers.number2, los);
          }
        }
        break;

      case 'CB':
        const assignedReceiver = offensivePlayers.find(p => p.id === responsibility.target);
        if (assignedReceiver) {
          const boundaryDirection = assignedReceiver.position.x < 26.665 ? 'left' : 'right';
          const leverage = calculateLeverage(assignedReceiver, boundaryDirection);
          positions[defender.id] = getCover1Cornerback(assignedReceiver, leverage, los);
        }
        break;

      case 'LB':
        if (responsibility.type === 'spy') {
          positions[defender.id] = getCover1Linebacker(offensivePlayers[0], los, 'spy'); // QB
        } else if (responsibility.target) {
          const assignedReceiver = offensivePlayers.find(p => p.id === responsibility.target);
          if (assignedReceiver) {
            positions[defender.id] = getCover1Linebacker(assignedReceiver, los, 'coverage');
          }
        }
        break;

      case 'NB': // Nickel back
        const assignedNickelReceiver = offensivePlayers.find(p => p.id === responsibility.target);
        if (assignedNickelReceiver) {
          const leverage = calculateLeverage(assignedNickelReceiver, 'left'); // Default
          positions[defender.id] = getCover1Cornerback(assignedNickelReceiver, leverage, los);
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 4 (Quarters) defensive alignment
 */
export function generateCover4Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Cover 4 - Four deep, three under
  const deepZoneWidth = 53.33 / 4; // Four deep quarters

  defensivePlayers.forEach((defender, idx) => {
    switch (defender.playerType) {
      case 'CB':
        // CBs take outside quarters
        if (defender.id === 'CB1') {
          positions[defender.id] = { x: 8, y: los - 7 }; // Left outside quarter, 7 yards on defensive side
        } else if (defender.id === 'CB2') {
          positions[defender.id] = { x: 45, y: los - 7 }; // Right outside quarter
        }
        break;

      case 'S':
        // Safeties take inside quarters
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 18, y: los - 12 }; // Left inside quarter, 12 yards on defensive side
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 35, y: los - 12 }; // Right inside quarter
        }
        break;

      case 'LB':
        // Three linebackers in underneath coverage
        if (defender.id === 'LB1') {
          positions[defender.id] = { x: 20, y: los - 4 }; // Left flat, 4 yards on defensive side
        } else if (defender.id === 'LB2') {
          positions[defender.id] = { x: 26.665, y: los - 5 }; // Middle hook, 5 yards on defensive side
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 33, y: los - 4 }; // Right flat
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 2 defensive alignment
 */
export function generateCover2Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // CBs play press or bail technique
        if (defender.id === 'CB1') {
          positions[defender.id] = { x: 8, y: los - 5 }; // Bail technique, 5 yards on defensive side
        } else if (defender.id === 'CB2') {
          positions[defender.id] = { x: 45, y: los - 5 };
        }
        break;

      case 'S':
        // Safeties play deep halves
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 13, y: los - 13 }; // Left deep half, 13 yards on defensive side
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 40, y: los - 13 }; // Right deep half
        }
        break;

      case 'LB':
        // Linebackers play underneath zones
        if (defender.id === 'LB1') {
          positions[defender.id] = { x: 10, y: los - 5 }; // Left flat, 5 yards on defensive side
        } else if (defender.id === 'LB2') {
          positions[defender.id] = { x: 26.665, y: los - 6 }; // Middle hole, 6 yards on defensive side
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 43, y: los - 5 }; // Right flat
        } else if (defender.id === 'LB4') {
          positions[defender.id] = { x: 20, y: los - 5 }; // Left hook
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 3 defensive alignment
 */
export function generateCover3Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // CBs play deep outside thirds
        if (defender.id === 'CB1') {
          positions[defender.id] = { x: 8, y: los - 8 }; // Deep third, 8 yards on defensive side
        } else if (defender.id === 'CB2') {
          positions[defender.id] = { x: 45, y: los - 8 };
        }
        break;

      case 'S':
        // FS plays deep middle third, SS plays in the box
        if (defender.id === 'S1' || defender.id === 'FS') {
          positions[defender.id] = { x: 26.665, y: los - 12 }; // Deep middle third, 12 yards on defensive side
        } else if (defender.id === 'S2' || defender.id === 'SS') {
          positions[defender.id] = { x: 20, y: los - 4 }; // Strong side curl/flat, 4 yards on defensive side
        }
        break;

      case 'LB':
        // Four underneath defenders
        if (defender.id === 'LB1') {
          positions[defender.id] = { x: 10, y: los - 5 }; // Strong side curl
        } else if (defender.id === 'LB2') {
          positions[defender.id] = { x: 26.665, y: los - 6 }; // Middle hook
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 43, y: los - 5 }; // Weak side curl
        } else if (defender.id === 'LB4') {
          positions[defender.id] = { x: 35, y: los - 4 }; // Weak side flat
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Tampa 2 defensive alignment
 */
export function generateTampa2Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // CBs play deep outside thirds
        if (defender.id === 'CB1') {
          positions[defender.id] = { x: 8, y: los + 5 }; // Press-bail technique, 5 yards behind LOS
        } else if (defender.id === 'CB2') {
          positions[defender.id] = { x: 45, y: los + 5 };
        }
        break;

      case 'S':
        // Safeties play underneath robber roles
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 13, y: los + 12 }; // Left intermediate, 12 yards behind LOS
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 40, y: los + 12 }; // Right intermediate
        }
        break;

      case 'LB':
        // Mike LB drops to deep middle third, others play underneath
        if (defender.id === 'LB2') {
          // Mike linebacker - will drop to deep middle
          positions[defender.id] = { x: 26.665, y: los + 5 };
        } else if (defender.id === 'LB1') {
          positions[defender.id] = { x: 18, y: los + 4 }; // Left curl, 4 yards behind LOS
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 35, y: los + 4 }; // Right curl
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 6 (Split-field) defensive alignment
 */
export function generateCover6Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Field side gets Cover 4, boundary side gets Cover 2
  const isFieldLeft = formation.strength === 'left';

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        if (defender.id === 'CB1') {
          // Boundary CB - plays Cover 2
          positions[defender.id] = { x: 8, y: los + 5 }; // 5 yards behind LOS
        } else if (defender.id === 'CB2') {
          // Field CB - plays quarters
          positions[defender.id] = { x: 45, y: los + 7 }; // 7 yards behind LOS
        }
        break;

      case 'S':
        if (defender.id === 'S1') {
          // Boundary safety - deep half
          positions[defender.id] = { x: 13, y: los + 12 }; // 12 yards behind LOS
        } else if (defender.id === 'S2') {
          // Field safety - deep quarter
          positions[defender.id] = { x: 35, y: los + 12 };
        }
        break;

      case 'LB':
        // Linebackers play underneath zones
        if (defender.id === 'LB1') {
          positions[defender.id] = { x: 18, y: los + 4 }; // 4 yards behind LOS
        } else if (defender.id === 'LB2') {
          positions[defender.id] = { x: 26.665, y: los + 5 }; // 5 yards behind LOS
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 35, y: los + 4 };
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 0 (All-out blitz) defensive alignment
 */
export function generateCover0Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};
  const receivers = [...formation.receiversLeft, ...formation.receiversRight];

  // Sort receivers by priority for man coverage
  const sortedReceivers = receivers.sort((a, b) => {
    const aDistFromCenter = Math.abs(a.position.x - 26.665);
    const bDistFromCenter = Math.abs(b.position.x - 26.665);
    return bDistFromCenter - aDistFromCenter; // Outside receivers first
  });

  let cbIdx = 0;
  const lbIdx = 0;

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;

    switch (defender.playerType) {
      case 'CB':
        // CBs press man coverage on outside receivers
        if (cbIdx < sortedReceivers.length) {
          const receiver = sortedReceivers[cbIdx++];
          positions[defender.id] = {
            x: receiver.position.x,
            y: los - 1 // Press coverage, 1 yard on defensive side of LOS
          };
        }
        break;

      case 'S':
        // Safeties blitz from depth
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 20, y: los - 2 }; // A gap blitz, 2 yards on defensive side
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 33, y: los - 2 }; // B gap blitz
        }
        break;

      case 'LB':
        if (responsibility?.type === 'blitz') {
          // Blitzing linebacker
          positions[defender.id] = { x: 26.665, y: los - 3 }; // A gap, 3 yards on defensive side
        } else {
          // Coverage linebacker on RB
          const rb = offensivePlayers.find(p => p.playerType === 'RB');
          if (rb) {
            positions[defender.id] = {
              x: rb.position.x,
              y: los - 5  // 5 yards on defensive side of LOS
            };
          } else {
            positions[defender.id] = { x: 23, y: los - 2 };
          }
        }
        break;
    }
  });

  return positions;
}
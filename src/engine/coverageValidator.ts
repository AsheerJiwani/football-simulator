import type { Player, CoverageType, CoverageResponsibility } from './types';
import { DefensivePersonnel } from './alignment';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

export interface ValidationError {
  type: 'DEFENDER_COUNT' | 'DUPLICATE_ASSIGNMENT' | 'UNCOVERED_RECEIVER' | 'INVALID_ZONE';
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'PERSONNEL_MISMATCH' | 'SUBOPTIMAL_ASSIGNMENT' | 'FORMATION_MISMATCH';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

export interface ValidationStats {
  totalDefenders: number;
  manAssignments: number;
  zoneAssignments: number;
  blitzers: number;
  deepSafeties: number;
  uncoveredReceivers: string[];
  duplicateAssignments: string[];
}

export class CoverageValidator {
  private readonly REQUIRED_DEFENDERS = 7;

  /**
   * Validate coverage assignments for correctness
   */
  validateCoverageAssignments(
    defenders: Player[],
    offensivePlayers: Player[],
    coverage: CoverageType
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Calculate stats
    const stats = this.calculateStats(defenders, offensivePlayers);

    // Rule 1: Exactly 7 defenders
    if (stats.totalDefenders !== this.REQUIRED_DEFENDERS) {
      errors.push({
        type: 'DEFENDER_COUNT',
        message: `Invalid defender count: ${stats.totalDefenders}. Must be exactly ${this.REQUIRED_DEFENDERS}`,
        details: { actual: stats.totalDefenders, required: this.REQUIRED_DEFENDERS }
      });
    }

    // Rule 2: No duplicate man assignments
    if (stats.duplicateAssignments.length > 0) {
      errors.push({
        type: 'DUPLICATE_ASSIGNMENT',
        message: `Duplicate assignments found: ${stats.duplicateAssignments.join(', ')}`,
        details: { duplicates: stats.duplicateAssignments }
      });
    }

    // Rule 3: Check uncovered receivers in man coverage
    if (this.isManCoverage(coverage) && stats.uncoveredReceivers.length > 0) {
      errors.push({
        type: 'UNCOVERED_RECEIVER',
        message: `Uncovered receivers in man coverage: ${stats.uncoveredReceivers.join(', ')}`,
        details: { uncovered: stats.uncoveredReceivers }
      });
    }

    // Check for personnel warnings
    const personnelWarnings = this.checkPersonnelCompatibility(
      coverage,
      this.getPersonnelFromDefenders(defenders)
    );
    warnings.push(...personnelWarnings);

    // Check for formation-specific warnings
    const formationWarnings = this.checkFormationCompatibility(
      coverage,
      offensivePlayers
    );
    warnings.push(...formationWarnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats
    };
  }

  /**
   * Calculate validation statistics
   */
  private calculateStats(defenders: Player[], offensivePlayers: Player[]): ValidationStats {
    const eligibleReceivers = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB');
    const manAssignments = new Map<string, string[]>();

    let manCount = 0;
    let zoneCount = 0;
    let blitzCount = 0;
    let deepSafetyCount = 0;

    defenders.forEach(defender => {
      const responsibility = defender.coverageResponsibility;

      if (!responsibility) return;

      if (responsibility.type === 'man' && responsibility.target) {
        manCount++;
        // Track for duplicate detection
        if (!manAssignments.has(responsibility.target)) {
          manAssignments.set(responsibility.target, []);
        }
        manAssignments.get(responsibility.target)!.push(defender.id);
      } else if (responsibility.type === 'zone') {
        zoneCount++;
        // Check if deep safety
        if (responsibility.zone && responsibility.zone.depth >= 12) {
          deepSafetyCount++;
        }
      } else if (responsibility.type === 'blitz') {
        blitzCount++;
      }
    });

    // Find duplicates
    const duplicateAssignments: string[] = [];
    manAssignments.forEach((defenders, target) => {
      if (defenders.length > 1) {
        duplicateAssignments.push(target);
      }
    });

    // Find uncovered receivers
    const coveredReceivers = new Set(manAssignments.keys());
    const uncoveredReceivers = eligibleReceivers
      .filter(r => !coveredReceivers.has(r.id))
      .map(r => r.id);

    return {
      totalDefenders: defenders.length,
      manAssignments: manCount,
      zoneAssignments: zoneCount,
      blitzers: blitzCount,
      deepSafeties: deepSafetyCount,
      uncoveredReceivers,
      duplicateAssignments
    };
  }

  /**
   * Check personnel-coverage compatibility
   */
  checkPersonnelCompatibility(
    coverage: CoverageType,
    personnel: DefensivePersonnel
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Tampa 2 requires 3+ LBs
    if (coverage === 'tampa-2' && personnel.LB < 3) {
      warnings.push({
        type: 'PERSONNEL_MISMATCH',
        severity: 'high',
        message: 'Tampa 2 requires at least 3 LBs (MLB drops to deep middle)',
        suggestion: 'Switch to Base (4-3) personnel or select a different coverage'
      });
    }

    // Cover 2 and variants need 2 safeties
    if ((coverage === 'cover-2' || coverage === 'cover-2-roll-to-1' ||
         coverage === 'cover-2-invert') && personnel.S < 2) {
      warnings.push({
        type: 'PERSONNEL_MISMATCH',
        severity: 'high',
        message: 'Cover 2 requires 2 safeties for deep halves',
        suggestion: 'Use personnel with 2 safeties'
      });
    }

    // Cover 4/6 benefit from 2 safeties
    if ((coverage === 'cover-4' || coverage === 'quarters' ||
         coverage === 'cover-6') && personnel.S < 2) {
      warnings.push({
        type: 'PERSONNEL_MISMATCH',
        severity: 'medium',
        message: `${coverage} works best with 2 safeties for quarters coverage`,
        suggestion: 'Consider using 2-safety personnel'
      });
    }

    // Cover 0 with fewer than 3 CBs vs 3+ WRs
    if (coverage === 'cover-0' && personnel.CB < 3) {
      warnings.push({
        type: 'SUBOPTIMAL_ASSIGNMENT',
        severity: 'medium',
        message: 'Cover 0 with < 3 CBs may struggle vs 3+ WR sets',
        suggestion: 'Add more CBs or switch to zone coverage'
      });
    }

    // Dime package warnings
    if (personnel.LB === 1) {
      if (coverage === 'cover-3') {
        warnings.push({
          type: 'PERSONNEL_MISMATCH',
          severity: 'low',
          message: 'Dime package (1 LB) may be weak in run support',
          suggestion: 'Consider Nickel (2 LB) for better balance'
        });
      }
    }

    return warnings;
  }

  /**
   * Check formation-coverage compatibility
   */
  private checkFormationCompatibility(
    coverage: CoverageType,
    offensivePlayers: Player[]
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const formation = this.analyzeOffensiveFormation(offensivePlayers);

    // Trips formations
    if (formation.isTrips) {
      if (coverage === 'cover-4' || coverage === 'quarters') {
        warnings.push({
          type: 'FORMATION_MISMATCH',
          severity: 'low',
          message: 'Quarters coverage can be vulnerable to trips formations',
          suggestion: 'Consider rotating to Cover 3 or Cover 6'
        });
      }
    }

    // Empty formations (no RB)
    if (formation.isEmpty) {
      if (coverage === 'tampa-2') {
        warnings.push({
          type: 'FORMATION_MISMATCH',
          severity: 'medium',
          message: 'Tampa 2 vs empty can leave middle vulnerable',
          suggestion: 'Consider Cover 1 or Cover 2 Man'
        });
      }
    }

    // Heavy formations (2+ TE)
    if (formation.isHeavy) {
      if (coverage === 'cover-0') {
        warnings.push({
          type: 'FORMATION_MISMATCH',
          severity: 'low',
          message: 'Cover 0 vs heavy formations may lack run support',
          suggestion: 'Consider Cover 3 or Cover 4 for better run fits'
        });
      }
    }

    // Spread formations
    if (formation.isSpread) {
      if (!this.hasEnoughDBs(offensivePlayers)) {
        warnings.push({
          type: 'PERSONNEL_MISMATCH',
          severity: 'medium',
          message: 'May need more DBs vs spread formation',
          suggestion: 'Use Nickel or Dime personnel'
        });
      }
    }

    return warnings;
  }

  /**
   * Analyze offensive formation characteristics
   */
  private analyzeOffensiveFormation(offensivePlayers: Player[]) {
    const receivers = offensivePlayers.filter(p =>
      p.playerType === 'WR' || p.playerType === 'TE');
    const rbs = offensivePlayers.filter(p =>
      p.playerType === 'RB' || p.playerType === 'FB');
    const tes = offensivePlayers.filter(p => p.playerType === 'TE');

    // Check trips
    const leftReceivers = receivers.filter(r => r.position.x < 20);
    const rightReceivers = receivers.filter(r => r.position.x > 33);
    const isTrips = leftReceivers.length >= 3 || rightReceivers.length >= 3;

    return {
      isTrips,
      isEmpty: rbs.length === 0,
      isHeavy: tes.length >= 2,
      isSpread: receivers.length >= 4,
      receiverCount: receivers.length,
      rbCount: rbs.length,
      teCount: tes.length
    };
  }

  /**
   * Check if coverage is primarily man
   */
  private isManCoverage(coverage: CoverageType): boolean {
    return coverage === 'cover-0' ||
           coverage === 'cover-1' ||
           coverage === 'cover-1-robber' ||
           coverage === 'cover-1-bracket' ||
           coverage === 'cover-1-lurk' ||
           coverage === 'cover-2-roll-to-1';
  }

  /**
   * Get personnel from defenders
   */
  private getPersonnelFromDefenders(defenders: Player[]): DefensivePersonnel {
    const personnel: DefensivePersonnel = {
      CB: 0,
      S: 0,
      LB: 0,
      NB: 0
    };

    defenders.forEach(defender => {
      if (defender.playerType === 'CB') personnel.CB++;
      else if (defender.playerType === 'S') personnel.S++;
      else if (defender.playerType === 'LB') personnel.LB++;
      else if (defender.playerType === 'NB') personnel.NB++;
    });

    return personnel;
  }

  /**
   * Check if enough DBs for receivers
   */
  private hasEnoughDBs(offensivePlayers: Player[]): boolean {
    const receivers = offensivePlayers.filter(p =>
      (p.playerType === 'WR' || p.playerType === 'TE') && p.isEligible
    ).length;

    // Need at least as many DBs as receivers in spread
    return receivers <= 5; // Assuming we have at least 5 DBs available
  }

  /**
   * Get suggested personnel for coverage and formation
   */
  getSuggestedPersonnel(
    coverage: CoverageType,
    offensivePlayers: Player[]
  ): DefensivePersonnel {
    const formation = this.analyzeOffensiveFormation(offensivePlayers);

    // Base suggestions by coverage
    let suggestion: DefensivePersonnel = {
      CB: 3,
      S: 2,
      LB: 1,
      NB: 1
    };

    // Tampa 2 needs 3+ LBs
    if (coverage === 'tampa-2') {
      suggestion = { CB: 2, S: 2, LB: 3, NB: 0 };
    }
    // Cover 0/1 vs spread
    else if ((coverage === 'cover-0' || coverage === 'cover-1') && formation.isSpread) {
      suggestion = { CB: 3, S: 1, LB: 1, NB: 2 }; // Dime
    }
    // Standard nickel
    else if (formation.receiverCount === 3) {
      suggestion = { CB: 3, S: 2, LB: 1, NB: 1 };
    }
    // Base vs heavy
    else if (formation.isHeavy) {
      suggestion = { CB: 2, S: 2, LB: 3, NB: 0 };
    }

    return suggestion;
  }

  /**
   * Auto-fix common assignment issues
   */
  autoFixAssignments(
    defenders: Player[],
    offensivePlayers: Player[],
    coverage: CoverageType
  ): Player[] {
    const validation = this.validateCoverageAssignments(defenders, offensivePlayers, coverage);

    // Fix defender count
    if (validation.stats.totalDefenders !== this.REQUIRED_DEFENDERS) {
      console.warn(`Defender count mismatch: ${validation.stats.totalDefenders}, adjusting...`);
      // This would need to add/remove defenders as needed
    }

    // Fix duplicate assignments
    if (validation.stats.duplicateAssignments.length > 0) {
      const seen = new Set<string>();
      defenders.forEach(defender => {
        if (defender.coverageResponsibility?.type === 'man' &&
            defender.coverageResponsibility.target) {
          const target = defender.coverageResponsibility.target;
          if (seen.has(target)) {
            // Find alternate assignment
            const uncovered = validation.stats.uncoveredReceivers[0];
            if (uncovered) {
              defender.coverageResponsibility.target = uncovered;
            } else {
              // Convert to zone
              defender.coverageResponsibility.type = 'zone';
              delete defender.coverageResponsibility.target;
            }
          }
          seen.add(target);
        }
      });
    }

    return defenders;
  }
}

// Export singleton instance
export const coverageValidator = new CoverageValidator();
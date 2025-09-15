import { Personnel, CoverageType } from './types';

export type DefensivePersonnel = 'Base' | 'Nickel' | 'Dime' | 'Quarter' | 'Goal Line';

export interface PersonnelPackage {
  name: DefensivePersonnel;
  DBs: number; // Total defensive backs (CB + S + NB)
  LBs: number; // Linebackers
  DL: number;  // Defensive linemen (not used in our 7-man coverage)
}

export interface CoverageCompatibility {
  coverage: CoverageType;
  required: {
    minLBs?: number;
    minDBs?: number;
    minSafeties?: number;
  };
  incompatible: DefensivePersonnel[];
  warning?: string;
  alternative?: CoverageType;
}

export class PersonnelMatcher {
  private readonly PERSONNEL_PACKAGES: Record<DefensivePersonnel, PersonnelPackage> = {
    'Base': { name: 'Base', DBs: 4, LBs: 3, DL: 0 },      // 4-3 (4 DBs, 3 LBs)
    'Nickel': { name: 'Nickel', DBs: 5, LBs: 2, DL: 0 },  // 5-2 (5 DBs, 2 LBs)
    'Dime': { name: 'Dime', DBs: 6, LBs: 1, DL: 0 },      // 6-1 (6 DBs, 1 LB)
    'Quarter': { name: 'Quarter', DBs: 7, LBs: 0, DL: 0 }, // 7-0 (7 DBs, 0 LBs)
    'Goal Line': { name: 'Goal Line', DBs: 3, LBs: 4, DL: 0 } // 3-4 (3 DBs, 4 LBs)
  };

  private readonly COVERAGE_COMPATIBILITY: CoverageCompatibility[] = [
    {
      coverage: 'tampa-2',
      required: { minLBs: 3 }, // Mike LB must drop deep
      incompatible: ['Dime', 'Quarter'],
      warning: 'Tampa 2 requires minimum 3 LBs for Mike to drop deep',
      alternative: 'cover-2'
    },
    {
      coverage: 'cover-0',
      required: { minDBs: 5 }, // Need enough for man coverage
      incompatible: ['Goal Line'],
      warning: 'Cover 0 requires sufficient DBs for man coverage'
    },
    {
      coverage: 'cover-1',
      required: { minSafeties: 2 }, // Need FS and SS/Robber
      incompatible: [],
      warning: undefined
    },
    {
      coverage: 'cover-2',
      required: { minSafeties: 2 }, // Two deep safeties
      incompatible: [],
      warning: undefined
    },
    {
      coverage: 'cover-3',
      required: { minSafeties: 1, minLBs: 2 },
      incompatible: ['Quarter'],
      warning: 'Cover 3 works best with at least 2 LBs for underneath coverage'
    },
    {
      coverage: 'cover-4',
      required: { minDBs: 4 }, // Need 4 deep defenders
      incompatible: ['Goal Line'],
      warning: 'Cover 4 requires 4 DBs for deep quarters'
    },
    {
      coverage: 'cover-6',
      required: { minDBs: 4 },
      incompatible: ['Goal Line'],
      warning: 'Cover 6 requires sufficient DBs for split-field coverage'
    }
  ];

  private readonly OFFENSIVE_TO_DEFENSIVE_MATCH: Record<string, DefensivePersonnel> = {
    '10': 'Dime',      // 4 WR, 1 RB -> 6 DBs
    '11': 'Nickel',    // 3 WR, 1 TE, 1 RB -> 5 DBs
    '12': 'Base',      // 2 WR, 2 TE, 1 RB -> 4 DBs
    '21': 'Base',      // 2 WR, 1 TE, 2 RB -> 4 DBs
    '22': 'Goal Line', // 1 WR, 2 TE, 2 RB -> 3 DBs
    '13': 'Goal Line', // 1 WR, 3 TE, 1 RB -> 3 DBs
    '20': 'Nickel',    // 3 WR, 1 TE, 0 RB -> 5 DBs
    '00': 'Dime'       // 5 WR, 0 TE, 0 RB -> 6 DBs
  };

  /**
   * Get optimal defensive personnel based on offensive personnel
   */
  getOptimalDefensivePersonnel(offensivePersonnel: string): DefensivePersonnel {
    return this.OFFENSIVE_TO_DEFENSIVE_MATCH[offensivePersonnel] || 'Base';
  }

  /**
   * Check if a coverage is compatible with current defensive personnel
   */
  isCoverageCompatible(coverage: CoverageType, defensivePersonnel: DefensivePersonnel): boolean {
    const compatibility = this.COVERAGE_COMPATIBILITY.find(c => c.coverage === coverage);
    if (!compatibility) return true; // No restrictions

    // Check if personnel is in incompatible list
    if (compatibility.incompatible.includes(defensivePersonnel)) {
      return false;
    }

    // Check minimum requirements
    const personnel = this.PERSONNEL_PACKAGES[defensivePersonnel];
    if (compatibility.required.minLBs && personnel.LBs < compatibility.required.minLBs) {
      return false;
    }
    if (compatibility.required.minDBs && personnel.DBs < compatibility.required.minDBs) {
      return false;
    }

    return true;
  }

  /**
   * Get all compatible coverages for current defensive personnel
   */
  getCompatibleCoverages(defensivePersonnel: DefensivePersonnel): CoverageType[] {
    const allCoverages: CoverageType[] = [
      'cover-0', 'cover-1', 'cover-2', 'cover-3',
      'cover-4', 'cover-6', 'quarters', 'tampa-2'
    ];

    return allCoverages.filter(coverage =>
      this.isCoverageCompatible(coverage, defensivePersonnel)
    );
  }

  /**
   * Get warning message if coverage is incompatible
   */
  getCompatibilityWarning(coverage: CoverageType, defensivePersonnel: DefensivePersonnel): string | undefined {
    const compatibility = this.COVERAGE_COMPATIBILITY.find(c => c.coverage === coverage);
    if (!compatibility) return undefined;

    if (compatibility.incompatible.includes(defensivePersonnel)) {
      return compatibility.warning;
    }

    const personnel = this.PERSONNEL_PACKAGES[defensivePersonnel];
    if (compatibility.required.minLBs && personnel.LBs < compatibility.required.minLBs) {
      return compatibility.warning;
    }
    if (compatibility.required.minDBs && personnel.DBs < compatibility.required.minDBs) {
      return compatibility.warning;
    }

    return undefined;
  }

  /**
   * Get alternative coverage suggestion if current is incompatible
   */
  getAlternativeCoverage(coverage: CoverageType, defensivePersonnel: DefensivePersonnel): CoverageType | undefined {
    if (this.isCoverageCompatible(coverage, defensivePersonnel)) {
      return undefined; // No alternative needed
    }

    const compatibility = this.COVERAGE_COMPATIBILITY.find(c => c.coverage === coverage);
    return compatibility?.alternative;
  }

  /**
   * Adjust defensive personnel based on game situation
   */
  getPersonnelForSituation(
    down: number,
    distance: number,
    fieldPosition: number,
    offensivePersonnel: string
  ): DefensivePersonnel {
    // Red zone adjustments
    if (fieldPosition >= 80) { // Inside 20-yard line
      if (distance <= 3) {
        return 'Goal Line'; // Short yardage in red zone
      }
    }

    // Long yardage situations
    if (distance >= 15) {
      return 'Dime'; // Prevent defense
    }

    // 3rd down adjustments
    if (down === 3) {
      if (distance >= 7) {
        return 'Nickel'; // Pass-likely situation
      } else if (distance <= 2) {
        return 'Base'; // Run-likely situation
      }
    }

    // 4th down adjustments
    if (down === 4) {
      if (distance <= 1) {
        return 'Goal Line'; // Short yardage
      } else {
        return 'Dime'; // Hail Mary defense
      }
    }

    // Default to offensive personnel match
    return this.getOptimalDefensivePersonnel(offensivePersonnel);
  }

  /**
   * Generate defensive player types based on personnel package
   */
  generateDefensivePlayerTypes(personnel: DefensivePersonnel): string[] {
    const personnelPkg = this.PERSONNEL_PACKAGES[personnel];
    const playerTypes: string[] = [];

    // Always have at least 2 corners
    playerTypes.push('CB', 'CB');

    // Add safeties (always have at least 2)
    playerTypes.push('S', 'S');

    // Add remaining DBs as nickel backs
    const remainingDBs = personnelPkg.DBs - 4;
    for (let i = 0; i < remainingDBs; i++) {
      playerTypes.push('NB');
    }

    // Add linebackers
    for (let i = 0; i < personnelPkg.LBs; i++) {
      playerTypes.push('LB');
    }

    return playerTypes;
  }

  /**
   * Get personnel distribution details
   */
  getPersonnelDetails(personnel: DefensivePersonnel): {
    CBs: number;
    Safeties: number;
    Nickels: number;
    LBs: number;
    total: number;
  } {
    const personnelPkg = this.PERSONNEL_PACKAGES[personnel];

    // Standard distribution
    let distribution = {
      CBs: 2, // Always have 2 corners
      Safeties: 2, // Always have 2 safeties
      Nickels: 0,
      LBs: personnelPkg.LBs,
      total: 7
    };

    // Calculate nickel backs from remaining DBs
    const remainingDBs = personnelPkg.DBs - 4; // After 2 CBs and 2 Safeties
    distribution.Nickels = Math.max(0, remainingDBs);

    // Special case for Quarter (7 DBs)
    if (personnel === 'Quarter') {
      distribution.Nickels = 3; // 2 CB + 2 S + 3 NB = 7 DBs
    }

    return distribution;
  }

  /**
   * Check if personnel package is suitable for blitzing
   */
  canBlitz(personnel: DefensivePersonnel, numBlitzers: number): boolean {
    const personnelPkg = this.PERSONNEL_PACKAGES[personnel];

    // Need at least 5 in coverage after blitz
    const coverageAfterBlitz = 7 - numBlitzers;
    if (coverageAfterBlitz < 5) return false;

    // Prefer LBs for blitzing
    if (numBlitzers <= personnelPkg.LBs) return true;

    // Can blitz DBs in aggressive packages
    if (personnel === 'Dime' || personnel === 'Quarter') {
      return numBlitzers <= 2; // Max 2 DB blitzers
    }

    return false;
  }

  /**
   * Get recommended blitzers based on personnel
   */
  getRecommendedBlitzers(personnel: DefensivePersonnel, numBlitzers: number): string[] {
    const blitzers: string[] = [];
    const personnelPkg = this.PERSONNEL_PACKAGES[personnel];

    // Prioritize LBs for blitzing
    const lbBlitzers = Math.min(numBlitzers, personnelPkg.LBs);
    for (let i = 0; i < lbBlitzers; i++) {
      blitzers.push(`LB${i + 1}`);
    }

    // If more blitzers needed, use safeties or nickels
    const remainingBlitzers = numBlitzers - lbBlitzers;
    if (remainingBlitzers > 0) {
      if (personnel === 'Dime' || personnel === 'Quarter') {
        // Blitz nickels in passing situations
        for (let i = 0; i < remainingBlitzers && i < 2; i++) {
          blitzers.push(`NB${i + 1}`);
        }
      } else {
        // Blitz strong safety in base packages
        if (remainingBlitzers >= 1) {
          blitzers.push('SS');
        }
      }
    }

    return blitzers;
  }
}
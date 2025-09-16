import { Vector2D, CoverageType } from './types';

/**
 * NFL-realistic zone depth calculator that handles field position adjustments
 * Implements dual depth system: absolute for underneath, relative with compression for deep zones
 */

export interface ZoneDepthConfig {
  baseDepth: number;        // Base depth from LOS
  isDeepZone: boolean;      // Deep zones (15+ yards) vs underneath zones
  fieldPosition: number;    // Current LOS position on field (0-100)
  isRedZone: boolean;       // Inside opponent's 20
  coverageType: CoverageType;
}

export class ZoneDepthCalculator {
  // NFL standard zone depth thresholds
  private readonly DEEP_ZONE_THRESHOLD = 15; // Yards - zones deeper than this are "deep zones"
  private readonly RED_ZONE_START = 80;       // Field position where red zone begins
  private readonly RED_ZONE_COMPRESSION = 0.75; // 25% depth reduction in red zone

  // Coverage-specific depth adjustments
  private readonly COVERAGE_DEPTHS: Record<string, Record<string, number>> = {
    'cover-2': {
      deepHalf: 18,
      deepCorner: 15,
      flat: 5,
      hook: 8,
      hole: 12
    },
    'cover-3': {
      deepThird: 15,
      curl: 8,
      flat: 5,
      hook: 10,
      hole: 12
    },
    'cover-4': {
      deepQuarter: 12,
      curl: 8,
      flat: 5,
      hook: 10
    },
    'tampa-2': {
      deepHalf: 18,
      deepHole: 20,
      flat: 5,
      hook: 8
    },
    'cover-6': {
      deepQuarter: 12,
      deepHalf: 18,
      curl: 8,
      flat: 5
    }
  };

  /**
   * Calculate adjusted zone depth based on field position and coverage
   */
  calculateZoneDepth(config: ZoneDepthConfig): number {
    const { baseDepth, isDeepZone, fieldPosition, isRedZone, coverageType } = config;

    // Underneath zones (< 15 yards) maintain absolute depth from LOS
    if (!isDeepZone || baseDepth < this.DEEP_ZONE_THRESHOLD) {
      return this.calculateUnderneathDepth(baseDepth, fieldPosition, isRedZone);
    }

    // Deep zones use relative depth with field compression
    return this.calculateDeepZoneDepth(baseDepth, fieldPosition, isRedZone, coverageType);
  }

  /**
   * Calculate depth for underneath zones (absolute from LOS)
   */
  private calculateUnderneathDepth(
    baseDepth: number,
    fieldPosition: number,
    isRedZone: boolean
  ): number {
    // Underneath zones maintain consistent depth but may compress slightly in red zone
    if (isRedZone) {
      // Slight compression for underneath zones in red zone
      return baseDepth * 0.9; // 10% reduction
    }
    return baseDepth;
  }

  /**
   * Calculate depth for deep zones (relative with compression)
   */
  private calculateDeepZoneDepth(
    baseDepth: number,
    fieldPosition: number,
    isRedZone: boolean,
    coverageType: CoverageType
  ): number {
    let adjustedDepth = baseDepth;

    // Apply red zone compression
    if (isRedZone) {
      adjustedDepth *= this.RED_ZONE_COMPRESSION;
    }

    // Apply field position compression (as you get closer to end zone)
    const remainingField = 100 - fieldPosition;
    if (remainingField < 40) {
      // Compress depth when backed up near end zone
      const compressionFactor = Math.max(0.6, remainingField / 40);
      adjustedDepth *= compressionFactor;
    }

    // Apply coverage-specific adjustments
    adjustedDepth = this.applyCoverageAdjustments(adjustedDepth, coverageType);

    // Ensure minimum depth
    return Math.max(8, adjustedDepth); // Never less than 8 yards for deep zones
  }

  /**
   * Apply coverage-specific depth adjustments
   */
  private applyCoverageAdjustments(depth: number, coverageType: CoverageType): number {
    // Some coverages have specific depth requirements
    switch (coverageType) {
      case 'cover-2':
        // Deep halves need to be deeper to cover more ground
        return depth * 1.1;

      case 'tampa-2':
        // MLB needs to get deeper in Tampa 2
        if (depth > 18) {
          return depth * 1.15;
        }
        return depth;

      case 'cover-4':
        // Quarters defenders play slightly shallower for pattern matching
        return depth * 0.95;

      case 'quarters':
        // Same as Cover 4
        return depth * 0.95;

      default:
        return depth;
    }
  }

  /**
   * Get zone depths for a specific coverage and field position
   */
  getZoneDepthsByCoverage(
    coverageType: CoverageType,
    los: number
  ): Record<string, number> {
    const isRedZone = los >= this.RED_ZONE_START;
    const depths: Record<string, number> = {};

    // Get base depths for this coverage
    const coverageDepths = this.COVERAGE_DEPTHS[coverageType] || {};

    for (const [zoneType, baseDepth] of Object.entries(coverageDepths)) {
      const isDeepZone = zoneType.includes('deep') || baseDepth >= this.DEEP_ZONE_THRESHOLD;

      depths[zoneType] = this.calculateZoneDepth({
        baseDepth,
        isDeepZone,
        fieldPosition: los,
        isRedZone,
        coverageType
      });
    }

    return depths;
  }

  /**
   * Calculate zone position with field-aware depth
   */
  calculateZonePosition(
    zoneName: string,
    basePosition: Vector2D,
    los: number,
    coverageType: CoverageType
  ): Vector2D {
    // Determine if this is a deep zone
    const isDeepZone = zoneName.includes('deep') ||
                       zoneName.includes('third') ||
                       zoneName.includes('quarter') ||
                       zoneName.includes('half');

    // Get base depth for this zone type
    const coverageDepths = this.COVERAGE_DEPTHS[coverageType] || {};
    let baseDepth = 10; // Default

    // Try to match zone name to depth config
    for (const [zoneKey, depth] of Object.entries(coverageDepths)) {
      if (zoneName.toLowerCase().includes(zoneKey)) {
        baseDepth = depth;
        break;
      }
    }

    // Calculate adjusted depth
    const adjustedDepth = this.calculateZoneDepth({
      baseDepth,
      isDeepZone,
      fieldPosition: los,
      isRedZone: los >= this.RED_ZONE_START,
      coverageType
    });

    return {
      x: basePosition.x,
      y: los + adjustedDepth
    };
  }

  /**
   * Adjust existing zone position based on new LOS
   */
  adjustZoneForNewLOS(
    currentPosition: Vector2D,
    oldLOS: number,
    newLOS: number,
    zoneName: string,
    coverageType: CoverageType
  ): Vector2D {
    // Calculate the zone's depth from old LOS
    const currentDepth = currentPosition.y - oldLOS;

    // Determine if this is a deep zone
    const isDeepZone = zoneName.includes('deep') || currentDepth >= this.DEEP_ZONE_THRESHOLD;

    // Calculate new depth based on new field position
    const newDepth = this.calculateZoneDepth({
      baseDepth: currentDepth,
      isDeepZone,
      fieldPosition: newLOS,
      isRedZone: newLOS >= this.RED_ZONE_START,
      coverageType
    });

    return {
      x: currentPosition.x,
      y: newLOS + newDepth
    };
  }

  /**
   * Check if field position requires zone adjustment
   */
  requiresDepthAdjustment(oldLOS: number, newLOS: number): boolean {
    // Always adjust if crossing red zone boundary
    if ((oldLOS < this.RED_ZONE_START && newLOS >= this.RED_ZONE_START) ||
        (oldLOS >= this.RED_ZONE_START && newLOS < this.RED_ZONE_START)) {
      return true;
    }

    // Adjust if significant field position change (10+ yards)
    if (Math.abs(newLOS - oldLOS) >= 10) {
      return true;
    }

    // Adjust if getting backed up near end zone
    if (newLOS >= 90 || newLOS <= 10) {
      return true;
    }

    return false;
  }
}
import type { PlayConcept, Formation, Coverage, CoverageResponsibility, Zone, Vector2D } from '@/engine/types';
import formationsData from '@/data/formations.json';
import conceptsData from '@/data/concepts.json';
import coveragesData from '@/data/coverages.json';

// Type-safe data loaders for football simulator

interface ConceptJSON {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  formation: string;
  routes: Record<string, {
    type: string;
    waypoints: Array<{ x: number; y: number }>;
    timing: number[];
    depth: number;
  }>;
}

interface CoverageJSON {
  name: string;
  type: string;
  safetyCount: number;
  description?: string;
  responsibilities: Array<{
    defenderId: string;
    type: string;
    target?: string;
    zone?: {
      name?: string;
      center: Vector2D;
      width: number;
      height: number;
      depth: string | number; // Can be string like "deep" or number
    };
  }>;
}

export const DataLoader = {
  // Get all available formations
  getFormations: (): Record<string, Formation> => {
    return formationsData as Record<string, Formation>;
  },

  // Get a specific formation by name
  getFormation: (name: string): Formation | null => {
    const formations = formationsData as Record<string, Formation>;
    const formation = formations[name];
    return formation || null;
  },

  // Get all play concepts
  getConcepts: (): Record<string, ConceptJSON> => {
    return conceptsData as Record<string, ConceptJSON>;
  },

  // Get a specific play concept with formation data included
  getConcept: (name: string): PlayConcept | null => {
    const concepts = conceptsData as Record<string, ConceptJSON>;
    const conceptData = concepts[name];
    if (!conceptData) return null;

    const formation = DataLoader.getFormation(conceptData.formation);
    if (!formation) return null;

    return {
      ...conceptData,
      formation,
    } as PlayConcept;
  },

  // Get all available coverages
  getCoverages: (): Record<string, CoverageJSON> => {
    return coveragesData as Record<string, CoverageJSON>;
  },

  // Get a specific coverage by name
  getCoverage: (name: string): Coverage | null => {
    const coverages = coveragesData as Record<string, CoverageJSON>;
    const coverageData = coverages[name];
    if (!coverageData) return null;

    // Helper function to convert depth strings to numbers
    const convertDepth = (depth: string | number): number => {
      if (typeof depth === 'number') return depth;
      switch (depth) {
        case 'shallow': return 5;
        case 'intermediate': return 10;
        case 'deep': return 15;
        default: return 10;
      }
    };

    // Transform the JSON data to match our Coverage interface
    return {
      name: coverageData.name,
      type: coverageData.type as Coverage['type'],
      safetyCount: coverageData.safetyCount,
      description: coverageData.description,
      responsibilities: coverageData.responsibilities.map((resp): CoverageResponsibility => ({
        defenderId: resp.defenderId,
        type: resp.type as CoverageResponsibility['type'],
        target: resp.target,
        zone: resp.zone ? {
          ...resp.zone,
          depth: convertDepth(resp.zone.depth)
        } : undefined,
      })),
    };
  },

  // Get list of concept names for UI dropdowns
  getConceptNames: (): string[] => {
    return Object.keys(conceptsData);
  },

  // Get list of coverage names for UI dropdowns
  getCoverageNames: (): string[] => {
    return Object.keys(coveragesData);
  },

  // Get list of formation names for UI dropdowns
  getFormationNames: (): string[] => {
    return Object.keys(formationsData);
  },

  // Validate that a concept and coverage are compatible
  validateSelection: (conceptName: string, coverageName: string): boolean => {
    const concept = DataLoader.getConcept(conceptName);
    const coverage = DataLoader.getCoverage(coverageName);

    if (!concept || !coverage) return false;

    // Basic validation - ensure we have enough defenders
    const offensiveEligibleCount = Object.values(concept.routes).length;
    const manCoverageCount = coverage.responsibilities.filter(r => r.type === 'man').length;

    // For man coverage, we need at least as many man defenders as eligible receivers
    if (coverage.type === 'cover-1' && manCoverageCount < offensiveEligibleCount) {
      return false;
    }

    return true;
  },
};

// Helper functions for working with the loaded data

export const GameData = {
  // Get default selections for quick start
  getDefaults: () => ({
    concept: 'slant-flat',
    coverage: 'cover-1',
    sackTime: 5.0,
    gameMode: 'free-play' as const,
  }),

  // Get beginner-friendly options
  getBeginnerOptions: () => ({
    concepts: ['slant-flat'],
    coverages: ['cover-1', 'cover-2'],
  }),

  // Get advanced options
  getAdvancedOptions: () => ({
    concepts: Object.keys(conceptsData),
    coverages: Object.keys(coveragesData),
  }),

  // Get concept difficulty level
  getConceptDifficulty: (conceptName: string): 'easy' | 'medium' | 'hard' | null => {
    const concepts = conceptsData as Record<string, ConceptJSON>;
    const conceptData = concepts[conceptName];
    return conceptData?.difficulty || null;
  },

  // Filter concepts by difficulty
  getConceptsByDifficulty: (difficulty: 'easy' | 'medium' | 'hard'): string[] => {
    const concepts = conceptsData as Record<string, ConceptJSON>;
    return Object.entries(concepts)
      .filter(([, concept]) => concept.difficulty === difficulty)
      .map(([name]) => name);
  },
};
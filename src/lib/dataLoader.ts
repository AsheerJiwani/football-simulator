import type { PlayConcept, Formation, Coverage } from '@/engine/types';
import formationsData from '@/data/formations.json';
import conceptsData from '@/data/concepts.json';
import coveragesData from '@/data/coverages.json';

// Type-safe data loaders for football simulator

export const DataLoader = {
  // Get all available formations
  getFormations: (): Record<string, Formation> => {
    return formationsData;
  },

  // Get a specific formation by name
  getFormation: (name: string): Formation | null => {
    return formationsData[name as keyof typeof formationsData] || null;
  },

  // Get all play concepts
  getConcepts: (): Record<string, Omit<PlayConcept, 'formation'> & { formation: string }> => {
    return conceptsData;
  },

  // Get a specific play concept with formation data included
  getConcept: (name: string): PlayConcept | null => {
    const conceptData = conceptsData[name as keyof typeof conceptsData];
    if (!conceptData) return null;

    const formation = DataLoader.getFormation(conceptData.formation);
    if (!formation) return null;

    return {
      ...conceptData,
      formation,
    };
  },

  // Get all available coverages
  getCoverages: (): Record<string, any> => {
    return coveragesData;
  },

  // Get a specific coverage by name
  getCoverage: (name: string): Coverage | null => {
    const coverageData = coveragesData[name as keyof typeof coveragesData];
    if (!coverageData) return null;

    // Transform the JSON data to match our Coverage interface
    return {
      name: coverageData.name,
      type: coverageData.type,
      safetyCount: coverageData.safetyCount,
      responsibilities: coverageData.responsibilities.map((resp: any) => ({
        playerId: resp.defenderId,
        type: resp.type,
        target: resp.assignment,
        zone: resp.zone,
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
    const conceptData = conceptsData[conceptName as keyof typeof conceptsData];
    return conceptData?.difficulty || null;
  },

  // Filter concepts by difficulty
  getConceptsByDifficulty: (difficulty: 'easy' | 'medium' | 'hard'): string[] => {
    return Object.entries(conceptsData)
      .filter(([_, concept]) => concept.difficulty === difficulty)
      .map(([name, _]) => name);
  },
};
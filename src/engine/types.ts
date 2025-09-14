// Core Types for Football Simulator Engine

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  team: 'offense' | 'defense';
  playerType: PlayerType;
  route?: Route;
  coverageResponsibility?: CoverageResponsibility;
  isEligible: boolean;
  maxSpeed: number; // yards per second
  currentSpeed: number;
  isStar: boolean; // +10% speed boost
  hasMotionBoost: boolean; // temporary speed boost from motion
  motionBoostTimeLeft: number; // seconds
}

export type PlayerType = 'QB' | 'RB' | 'WR' | 'TE' | 'FB' | 'CB' | 'S' | 'LB' | 'NB';

export interface Ball {
  position: Vector2D;
  velocity: Vector2D;
  state: BallState;
  targetPlayer?: string; // player ID if thrown
  timeInAir: number;
  speed: number; // constant ~16 yards/second
}

export type BallState = 'held' | 'thrown' | 'caught' | 'incomplete' | 'intercepted';

export interface Route {
  type: RouteType;
  waypoints: Vector2D[]; // relative to starting position
  timing: number[]; // time to reach each waypoint
  depth: number; // yards downfield
}

export type RouteType = 'slant' | 'flat' | 'go' | 'curl' | 'out' | 'in' | 'post' | 'comeback' | 'fade';

export interface Formation {
  name: string;
  positions: Record<string, Vector2D>; // player ID to position
  personnel: Personnel;
}

export interface Personnel {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FB: number;
}

export interface Coverage {
  name: string;
  type: CoverageType;
  safetyCount: number;
  description?: string;
  responsibilities: CoverageResponsibility[];
}

export type CoverageType = 'cover-0' | 'cover-1' | 'cover-2' | 'cover-3' | 'cover-4' | 'cover-6' | 'quarters' | 'tampa-2';

export interface CoverageResponsibility {
  playerId: string;
  type: 'man' | 'zone' | 'spy' | 'blitz';
  target?: string; // player ID for man coverage
  zone?: Zone; // zone area for zone coverage
}

export interface Zone {
  center: Vector2D;
  width: number;
  height: number;
  depth: number; // shallow, intermediate, deep
}

export interface GameConfig {
  fieldDimensions: {
    length: 120; // 120 yards (including end zones)
    width: 53.33; // yards
    endZoneDepth: 10; // yards
  };
  tickRate: 60; // Hz
  physics: {
    ballSpeed: number; // yards per second
    tackleRadius: number; // yards
    catchRadius: number; // yards
    motionBoostPercent: number; // speed boost percentage
    starBoostPercent: number; // speed boost percentage
    motionBoostDuration: number; // seconds
  };
  playerSpeeds: {
    QB: { min: number, max: number };
    RB: { min: number, max: number };
    WR: { min: number, max: number };
    TE: { min: number, max: number };
    FB: { min: number, max: number };
    CB: { min: number, max: number };
    S: { min: number, max: number };
    LB: { min: number, max: number };
    NB: { min: number, max: number };
  };
  gameplay: {
    minSackTime: 2.0; // seconds
    maxSackTime: 10.0; // seconds
    defaultSackTime: 5.0; // seconds
    challengeModeSackTime: 2.7; // seconds
    maxAudibles: 2;
  };
}

export interface PlayConcept {
  name: string;
  routes: Record<string, Route>; // player ID to route
  formation: Formation;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  phase: GamePhase;
  timeElapsed: number; // seconds since snap
  sackTime: number; // seconds until sack
  players: Player[];
  ball: Ball;
  playConcept?: PlayConcept;
  coverage?: Coverage;
  outcome?: PlayOutcome;
  isShowingDefense: boolean;
  audiblesUsed: number;
  maxAudibles: number;
  gameMode: 'free-play' | 'challenge';
}

export type GamePhase = 'pre-snap' | 'post-snap' | 'ball-thrown' | 'play-over';

export interface PlayOutcome {
  type: 'catch' | 'incomplete' | 'interception' | 'sack' | 'timeout';
  receiver?: string; // player ID
  defender?: string; // player ID
  yards: number;
  openness: number; // percentage (0-100)
  catchProbability: number; // percentage (0-100)
}

// Utility type for field coordinates
// Field runs from 0 (offense end zone) to 120 (defense end zone)
// Width runs from 0 (left sideline) to 53.33 (right sideline)
export type FieldPosition = Vector2D;

// Helper type for route definitions
export interface RouteDefinition {
  type: RouteType;
  relativeWaypoints: Vector2D[]; // relative to snap position
  timingSeconds: number[];
}
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
  hasMotion: boolean; // player will go in motion pre-snap
  motionPath?: Vector2D[]; // path to follow during motion
  hasMotionBoost: boolean; // temporary speed boost from motion at snap
  motionBoostTimeLeft: number; // seconds
  isBlocking: boolean; // player is pass protecting (RB/TE/FB)
  blockingTarget?: string; // ID of defender being blocked
  blockingPosition?: Vector2D; // default blocking position when no blitzer
  isBlocked?: boolean; // defender is being blocked (for blitzers)
  hasBall?: boolean; // player has the ball
  routeSegmentIndex?: number; // current segment in route waypoints
  coverageAssignment?: string; // zone name or man assignment
  speed?: number; // current speed
  // Acceleration mechanics
  acceleration: number; // current acceleration rate (yd/s²)
  isAccelerating: boolean;
  isDecelerating: boolean;
  isBackpedaling?: boolean; // for defensive backs
  directionChangeRecoveryTime?: number; // time left to recover from direction change
  timeToTopSpeed?: number; // time needed to reach max speed from current
}

export type PlayerType = 'QB' | 'RB' | 'WR' | 'TE' | 'FB' | 'CB' | 'S' | 'LB' | 'NB';

export interface Ball {
  position: Vector2D;
  velocity: Vector2D;
  state: BallState;
  targetPlayer?: string; // player ID if thrown
  carrier?: string; // player ID if carried
  timeInAir: number;
  speed: number; // constant ~16 yards/second
}

export type BallState = 'held' | 'thrown' | 'caught' | 'incomplete' | 'intercepted';

export interface Route {
  type: RouteType;
  waypoints: Vector2D[]; // relative to starting position
  timing: number[]; // time to reach each waypoint
  depth: number; // yards downfield
  points?: RoutePoint[]; // detailed route points with break indicators
}

export interface RoutePoint {
  position: Vector2D;
  isBreak?: boolean; // indicates route break point
  timing: number;
}

export type RouteType = 'slant' | 'flat' | 'go' | 'curl' | 'out' | 'in' | 'post' | 'comeback' | 'fade' | 'hitch' | 'wheel' | 'corner' | 'dig' | 'mesh_cross' | 'speed_out' | 'seam' | 'option_in_out' | 'choice_break' | 'delayed_drag' | 'bootleg_comeback' | 'quick_hitch' | 'drag';

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
  positions?: Record<string, Vector2D>; // Defender positions relative to LOS
}

export type CoverageType = 'cover-0' | 'cover-1' | 'cover-2' | 'cover-3' | 'cover-4' | 'cover-6' | 'quarters' | 'tampa-2';

export interface CoverageResponsibility {
  defenderId: string;
  type: 'man' | 'zone' | 'spy' | 'blitz';
  target?: string; // player ID for man coverage (assignment)
  zone?: Zone; // zone area for zone coverage
  overlaps?: ZoneOverlap[]; // zone overlap information for coordination
}

export interface Zone {
  name?: string; // Zone name (e.g., 'deep-middle', 'flat', 'hook')
  center: Vector2D;
  width: number;
  height: number;
  depth: number; // numeric depth in yards
}

export interface ZoneOverlap {
  defenderId: string;
  adjacentDefenderId: string;
  overlapDistance: number;
  handoffPoint: Vector2D;
}

export type HashPosition = 'left' | 'middle' | 'right';

export interface GameConfig {
  fieldDimensions: {
    length: 120; // 120 yards (including end zones)
    width: 53.33; // yards
    endZoneDepth: 10; // yards
    hashWidth: 6.17; // yards between hash marks (18 feet 6 inches)
    hashFromCenter: 3.08; // yards from center to hash mark
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
  pressureTime?: number; // seconds until pressure affects QB
  players: Player[];
  ball: Ball;
  playConcept?: PlayConcept;
  coverage?: Coverage;
  currentCoverage?: Coverage; // Current active coverage
  outcome?: PlayOutcome;
  isShowingDefense: boolean;
  isShowingRoutes: boolean;
  audiblesUsed: number;
  maxAudibles: number;
  gameMode: 'free-play' | 'challenge';
  motionPlayer?: string; // ID of player in motion
  isMotionActive: boolean; // whether motion is currently happening
  motion?: Motion; // Current motion details
  personnel: PersonnelPackage;
  passProtection: {
    rbBlocking: boolean;
    teBlocking: boolean;
    fbBlocking: boolean;
  };
  // Quarterback movement
  qbMovement?: QBMovementState;
  // Drive and field position
  lineOfScrimmage: number; // Y-coordinate of LOS (default 30)
  currentDown: number; // 1-4
  yardsToGo: number; // Yards needed for first down
  driveStartPosition: number; // Where the drive started
  ballOn: number; // Current field position (yard line)
  isFirstDown: boolean;
  hashPosition: HashPosition; // Current hash position for ball placement
  lastUpdate?: number; // Timestamp for forcing React re-renders
}

export type GamePhase = 'pre-snap' | 'post-snap' | 'ball-thrown' | 'play-over';

export type MotionType = 'fly' | 'orbit' | 'jet' | 'return' | 'shift';

export interface Motion {
  type: MotionType;
  playerId: string;
  startPosition: Vector2D;
  endPosition: Vector2D;
  path: Vector2D[];
  duration: number;
  currentTime: number;
}

export type PersonnelPackage = '11' | '12' | '21' | '10' | '20' | '22' | '00';

export type QBMovementType = 'dropback' | 'playaction' | 'rollout';

export interface QBMovementConfig {
  type: QBMovementType;
  steps: number;
  timing: number; // seconds to complete movement
  depth: number; // yards behind LOS
  pattern: Vector2D[]; // movement waypoints
  accuracyModifier: number; // 0.8-1.0 based on movement type
  fakeHandoffDuration?: number; // for Play Action only
  lateral?: number; // lateral movement for rollouts
}

export interface QBMovementState {
  config: QBMovementConfig;
  isActive: boolean;
  startTime: number; // when movement began
  isPlayAction: boolean;
  hasTriggeredDefensiveResponse: boolean;
}

export interface PlayOutcome {
  type: 'catch' | 'incomplete' | 'interception' | 'sack' | 'timeout';
  receiver?: string; // player ID
  defender?: string; // player ID
  yards: number;
  openness: number; // percentage (0-100)
  catchProbability: number; // percentage (0-100)
  endPosition?: Vector2D; // Where the play ended (for hash determination)
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

// Hot route system interfaces
export interface HotRoute {
  trigger: 'blitz' | 'coverage' | 'pressure';
  fromRoute: RouteType;
  toRoute: RouteType;
  timing: number; // seconds to execute
  depth: number; // yards from LOS
}

export interface SightAdjustment {
  coverage: CoverageType;
  receiverPosition: 'outside' | 'slot' | 'tight';
  adjustment: {
    routeType: RouteType;
    depthChange: number;
    breakDirection: 'in' | 'out' | 'up' | 'weak';
  };
}

export interface HotRouteSystem {
  blitzDetection: {
    triggerCount: number;    // number of rushers that triggers hot route
    autoConvert: RouteType[]; // routes that auto-convert
    timingReduction: number; // reduce sack time
  };
  coverageAudibles: {
    preSnapReads: CoverageType[];
    routeConversions: Record<CoverageType, Partial<Record<RouteType, RouteType>>>;
  };
}
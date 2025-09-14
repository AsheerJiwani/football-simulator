import type {
  GameState,
  Player,
  Ball,
  GameConfig,
  PlayConcept,
  Coverage,
  PlayOutcome,
  PlayerType,
  Vector2D,
  RouteType,
  Route,
  PersonnelPackage,
  Motion,
  MotionType,
  HashPosition,
} from './types';

import { Vector, Physics, Field, Random, Route as RouteUtil } from '@/lib/math';
import {
  generateCover1Alignment,
  generateCover2Alignment,
  generateCover3Alignment,
  generateCover4Alignment,
  generateTampa2Alignment,
  generateCover6Alignment,
  generateCover0Alignment,
  getOptimalDefensivePersonnel,
  generateDefensiveAssignments,
  analyzeFormation
} from './alignment';
import { DefensiveMovement } from './movement';

export class FootballEngine {
  private gameState: GameState;
  private config: GameConfig;
  private animationFrameId?: number;
  private lastTickTime: number = 0;
  private isRunning: boolean = false;
  private defensiveMovement: DefensiveMovement;

  constructor(config?: Partial<GameConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.gameState = this.initializeGameState();
    this.defensiveMovement = new DefensiveMovement();
  }

  private getDefaultConfig(): GameConfig {
    return {
      fieldDimensions: {
        length: 120, // Now represents y-axis (vertical)
        width: 53.33, // Now represents x-axis (horizontal)
        endZoneDepth: 10,
        hashWidth: 6.17, // yards between hash marks (18 feet 6 inches)
        hashFromCenter: 3.08, // yards from center to hash mark
      },
      tickRate: 60,
      physics: {
        ballSpeed: 25, // Updated from research: ~55mph average NFL QB velocity
        tackleRadius: 1.5, // Research shows 1.5 yards is standard tackling range
        catchRadius: 1.0,
        motionBoostPercent: 0.12, // Updated from research: 10-12% boost supported
        starBoostPercent: 0.10,
        motionBoostDuration: 0.35,
      },
      playerSpeeds: {
        QB: { min: 7.0, max: 8.5 }, // Updated from research: average 8.71 yd/s
        RB: { min: 8.5, max: 10.0 }, // Updated from research: average 8.87 yd/s
        WR: { min: 8.5, max: 10.5 }, // Updated from research: average 8.91 yd/s
        TE: { min: 7.5, max: 9.0 }, // Updated from research: average 8.46 yd/s
        FB: { min: 7.5, max: 8.5 }, // Conservative estimate based on TE data
        CB: { min: 8.8, max: 10.5 }, // Updated from research: average 8.99 yd/s
        S: { min: 8.2, max: 9.8 }, // Updated from research: average 8.79 yd/s
        LB: { min: 7.8, max: 9.2 }, // Updated from research: average 8.81 yd/s
        NB: { min: 8.7, max: 10.2 }, // Updated from research: between CB/S
      },
      gameplay: {
        minSackTime: 2.0,
        maxSackTime: 10.0,
        defaultSackTime: 5.0,
        challengeModeSackTime: 2.7,
        maxAudibles: 2,
      },
    };
  }

  private initializeGameState(): GameState {
    return {
      phase: 'pre-snap',
      timeElapsed: 0,
      sackTime: this.config.gameplay.defaultSackTime,
      players: [],
      ball: this.createBall(),
      isShowingDefense: true,
      isShowingRoutes: false,
      audiblesUsed: 0,
      maxAudibles: this.config.gameplay.maxAudibles,
      gameMode: 'free-play',
      isMotionActive: false,
      personnel: '11' as PersonnelPackage,
      passProtection: {
        rbBlocking: false,
        teBlocking: false,
        fbBlocking: false,
      },
      // Drive and field position
      lineOfScrimmage: 30, // Start at offensive 30-yard line
      currentDown: 1,
      yardsToGo: 10,
      driveStartPosition: 30,
      ballOn: 30,
      isFirstDown: true,
      hashPosition: 'middle',
    };
  }

  private createBall(): Ball {
    const los = this.gameState?.lineOfScrimmage || 30;
    const hashPos = this.gameState?.hashPosition || 'middle';

    // Calculate x position based on hash
    let xPos = 26.665; // Middle of field
    if (hashPos === 'left') {
      xPos = 26.665 - this.config.fieldDimensions.hashFromCenter;
    } else if (hashPos === 'right') {
      xPos = 26.665 + this.config.fieldDimensions.hashFromCenter;
    }

    return {
      position: { x: xPos, y: los },
      velocity: { x: 0, y: 0 },
      state: 'held',
      timeInAir: 0,
      speed: this.config.physics.ballSpeed,
    };
  }

  // Public API Methods

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public setPlayConcept(concept: PlayConcept): void {
    this.gameState.playConcept = concept;
    this.setupPlayers();
    // Re-setup defense to adjust to new offensive formation/personnel
    if (this.gameState.coverage) {
      this.setupDefense();
    }
  }

  public setCoverage(coverage: Coverage): void {
    this.gameState.coverage = coverage;
    this.gameState.currentCoverage = coverage;
    this.setupDefense();
  }

  public setSackTime(seconds: number): void {
    const clampedTime = Math.max(
      this.config.gameplay.minSackTime,
      Math.min(this.config.gameplay.maxSackTime, seconds)
    );
    this.gameState.sackTime = clampedTime;
  }

  public setHashPosition(hash: HashPosition): void {
    if (this.gameState.phase === 'pre-snap') {
      this.gameState.hashPosition = hash;
      // Update ball position
      this.gameState.ball = this.createBall();
      // Re-setup players to adjust to new hash position
      if (this.gameState.playConcept) {
        this.setupPlayers();
      }
      if (this.gameState.coverage) {
        this.setupDefense();
      }
    }
  }

  public setGameMode(mode: 'free-play' | 'challenge'): void {
    this.gameState.gameMode = mode;
    if (mode === 'challenge') {
      this.gameState.sackTime = this.config.gameplay.challengeModeSackTime;
      this.gameState.maxAudibles = 2;
      this.gameState.isShowingDefense = false;
    }
  }

  public setShowDefense(show: boolean): void {
    if (this.gameState.gameMode === 'challenge') {
      this.gameState.isShowingDefense = false;
    } else {
      this.gameState.isShowingDefense = show;
    }
  }

  public setShowRoutes(show: boolean): void {
    this.gameState.isShowingRoutes = show;
  }

  public setPersonnel(personnel: PersonnelPackage): void {
    this.gameState.personnel = personnel;
    // TODO: Update formations and plays based on personnel
    // Re-setup players with new personnel
    if (this.gameState.playConcept) {
      this.setupPlayers();
      if (this.gameState.coverage) {
        this.setupDefense();
      }
    }
  }

  public setLineOfScrimmage(yardLine: number): void {
    // Clamp between goal lines (0-100)
    this.gameState.lineOfScrimmage = Math.max(1, Math.min(99, yardLine));
    this.gameState.ballOn = this.gameState.lineOfScrimmage;
    // Update ball position
    this.gameState.ball.position.y = this.gameState.lineOfScrimmage;
    // Re-setup players at new LOS
    if (this.gameState.playConcept) {
      this.setupPlayers();
      if (this.gameState.coverage) {
        this.setupDefense();
      }
    }
  }

  public advanceToNextPlay(): void {
    if (!this.gameState.outcome) return;

    const { type, yards, endPosition } = this.gameState.outcome;
    let newLOS = this.gameState.lineOfScrimmage;

    // Calculate new field position based on outcome
    if (type === 'catch') {
      newLOS += yards;
    } else if (type === 'sack') {
      newLOS += yards; // Negative yards for sack
    }
    // Incomplete pass stays at same spot

    // Determine hash position based on where play ended
    if (endPosition && (type === 'catch' || type === 'sack')) {
      const leftHash = 26.665 - this.config.fieldDimensions.hashFromCenter;
      const rightHash = 26.665 + this.config.fieldDimensions.hashFromCenter;

      if (endPosition.x < leftHash) {
        this.gameState.hashPosition = 'left';
      } else if (endPosition.x > rightHash) {
        this.gameState.hashPosition = 'right';
      } else {
        this.gameState.hashPosition = 'middle';
      }
    }
    // Incomplete passes stay at same hash

    // Check for first down
    const yardsGained = newLOS - this.gameState.lineOfScrimmage;
    if (yardsGained >= this.gameState.yardsToGo) {
      this.gameState.currentDown = 1;
      this.gameState.yardsToGo = 10;
      this.gameState.isFirstDown = true;
    } else {
      this.gameState.currentDown++;
      this.gameState.yardsToGo -= yardsGained;
      this.gameState.isFirstDown = false;
    }

    // Check for turnover on downs
    if (this.gameState.currentDown > 4) {
      // Reset to offensive 30-yard line on turnover
      this.setLineOfScrimmage(30);
      this.gameState.currentDown = 1;
      this.gameState.yardsToGo = 10;
      this.gameState.driveStartPosition = 30;
    } else if (newLOS >= 100) {
      // Touchdown! Reset to offensive 30-yard line
      this.setLineOfScrimmage(30);
      this.gameState.currentDown = 1;
      this.gameState.yardsToGo = 10;
      this.gameState.driveStartPosition = 30;
    } else {
      // Continue drive
      this.setLineOfScrimmage(newLOS);
    }

    // Reset play state
    this.reset();
  }

  public sendInMotion(playerId: string, motionType: MotionType = 'fly'): boolean {
    // Can only send player in motion pre-snap
    if (this.gameState.phase !== 'pre-snap') return false;

    // Can only have one player in motion at a time
    if (this.gameState.isMotionActive) return false;

    const player = this.gameState.players.find(p =>
      p.id === playerId &&
      p.team === 'offense' &&
      p.isEligible &&
      p.playerType !== 'QB'
    );

    if (!player) return false;

    // Set up motion based on type
    player.hasMotion = true;
    this.gameState.motionPlayer = playerId;
    this.gameState.isMotionActive = true;

    const startPos = { ...player.position };
    let endPos: Vector2D;
    let path: Vector2D[] = [];

    switch (motionType) {
      case 'fly':
        // Straight across formation
        endPos = {
          x: player.position.x > 26.665 ? 10 : 43,
          y: player.position.y
        };
        path = [startPos, endPos];
        break;
      case 'orbit':
        // Behind QB then out
        const behindQB = { x: 26.665, y: 62 };
        endPos = {
          x: player.position.x > 26.665 ? 10 : 43,
          y: this.gameState.lineOfScrimmage
        };
        path = [startPos, behindQB, endPos];
        break;
      case 'jet':
        // Fast sweep motion
        endPos = {
          x: player.position.x > 26.665 ? 5 : 48,
          y: this.gameState.lineOfScrimmage
        };
        path = [startPos, endPos];
        break;
      case 'return':
        // Out and back
        const midPoint = {
          x: player.position.x > 26.665 ? player.position.x - 5 : player.position.x + 5,
          y: player.position.y
        };
        endPos = { ...startPos };
        path = [startPos, midPoint, endPos];
        break;
      case 'shift':
        // Short adjustment
        endPos = {
          x: player.position.x + (player.position.x > 26.665 ? -3 : 3),
          y: player.position.y
        };
        path = [startPos, endPos];
        break;
    }

    // Update player position to end position
    player.position = { ...endPos };
    player.motionPath = path;

    // Store motion for visualization and route adjustment
    this.gameState.motion = {
      type: motionType,
      playerId,
      startPosition: startPos,
      endPosition: endPos,
      path,
      duration: motionType === 'jet' ? 0.8 : 1.2,
      currentTime: 0
    };

    // Update route starting point if player has a route
    if (player.route && player.route.waypoints.length > 0) {
      // Adjust route to start from motion end position
      const routeAdjustment = {
        x: endPos.x - startPos.x,
        y: endPos.y - startPos.y
      };

      player.route.waypoints = player.route.waypoints.map((wp, idx) => {
        if (idx === 0) return { ...endPos };
        return {
          x: wp.x + routeAdjustment.x,
          y: wp.y + routeAdjustment.y
        };
      });
    }

    // Start motion animation
    this.animateMotion(player);

    return true;
  }

  public setPassProtection(rbBlocking: boolean, teBlocking: boolean, fbBlocking: boolean): void {
    this.gameState.passProtection = {
      rbBlocking,
      teBlocking,
      fbBlocking,
    };

    // Update player blocking status
    this.gameState.players.forEach(player => {
      if (player.team === 'offense') {
        switch (player.playerType) {
          case 'RB':
            player.isBlocking = rbBlocking;
            break;
          case 'TE':
            player.isBlocking = teBlocking;
            break;
          case 'FB':
            player.isBlocking = fbBlocking;
            break;
          default:
            player.isBlocking = false;
        }
      }
    });
  }

  public updatePlayerPosition(playerId: string, position: Vector2D): boolean {
    if (this.gameState.phase !== 'pre-snap') return false;

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player || player.team !== 'offense') return false;

    // Update the player's position
    player.position = { ...position };

    // Realign defense based on new offensive formation
    // For man coverage, adjust defender positions
    // For zone coverage, recalculate zone centers
    this.realignDefense();

    return true;
  }

  private realignDefense(): void {
    if (!this.gameState.coverage) return;

    const coverage = this.gameState.coverage;
    const offensePlayers = this.gameState.players.filter(p => p.team === 'offense');
    const defensePlayers = this.gameState.players.filter(p => p.team === 'defense');

    // If no defenders exist yet, return (defense not set up)
    if (defensePlayers.length === 0) return;

    // Determine new formation strength (based on receiver positioning)
    const losY = this.gameState.lineOfScrimmage;
    const centerX = 26.665;

    const leftReceivers = offensePlayers.filter(p =>
      p.isEligible && p.position.x < centerX - 5
    ).length;

    const rightReceivers = offensePlayers.filter(p =>
      p.isEligible && p.position.x > centerX + 5
    ).length;

    const strongSide: 'left' | 'right' = rightReceivers > leftReceivers ? 'right' : 'left';

    // Realign based on coverage type
    if (coverage.type === 'cover-1' || coverage.type === 'cover-0') {
      // Man coverage - realign defenders to follow their assigned receivers
      defensePlayers.forEach(defender => {
        if (defender.coverageAssignment) {
          const assignedReceiver = offensePlayers.find(p => p.id === defender.coverageAssignment);
          if (assignedReceiver) {
            // Position defender based on receiver's new position
            // Determine cushion based on defender type and coverage
            const cushion = defender.playerType === 'CB' ? 7 :
                           defender.playerType === 'S' ? 12 :
                           defender.playerType === 'LB' ? 5 : 3;

            // Maintain inside/outside leverage
            const leverageOffset = assignedReceiver.position.x < centerX ? -0.5 : 0.5;

            defender.position = {
              x: assignedReceiver.position.x + leverageOffset,
              y: losY + cushion
            };

            // Reset velocity to prevent sliding
            defender.velocity = { x: 0, y: 0 };
            defender.currentSpeed = 0;

            // Update coverage responsibility to maintain man assignment
            if (defender.coverageResponsibility) {
              defender.coverageResponsibility.target = assignedReceiver.id;
              defender.coverageResponsibility.type = 'man';
            }
          }
        }
      });
    } else {
      // Zone coverage - adjust zone responsibilities based on formation
      defensePlayers.forEach(defender => {
        if (defender.coverageResponsibility?.zone) {
          const zone = defender.coverageResponsibility.zone;
          const originalCenter = { ...zone.center };

          // Shift zones toward formation strength
          if (zone.name?.includes('strong')) {
            const shiftAmount = strongSide === 'right' ? 3 : -3;
            zone.center.x = originalCenter.x + shiftAmount;
            defender.position.x = zone.center.x;
          } else if (zone.name?.includes('weak')) {
            const shiftAmount = strongSide === 'right' ? -3 : 3;
            zone.center.x = originalCenter.x + shiftAmount;
            defender.position.x = zone.center.x;
          }

          // Adjust for bunch formations (receivers close together)
          const bunchedReceivers = this.detectBunchFormation(offensePlayers);
          if (bunchedReceivers.length > 0) {
            // Tighten zone coverage near bunch
            const bunchCenter = this.calculateBunchCenter(bunchedReceivers);
            const distanceToBunch = Math.abs(zone.center.x - bunchCenter.x);

            if (distanceToBunch < 10) {
              // Adjust zone center toward bunch
              const adjustment = (bunchCenter.x - zone.center.x) * 0.3;
              zone.center.x += adjustment;

              // Also update defender position to reflect new zone center
              defender.position.x = zone.center.x;
            }
          }

          // Reset velocity to prevent sliding
          defender.velocity = { x: 0, y: 0 };
          defender.currentSpeed = 0;
        }
      });
    }
  }

  private detectBunchFormation(offensePlayers: Player[]): Player[] {
    const receivers = offensePlayers.filter(p => p.isEligible);
    const bunched: Player[] = [];

    // Check for receivers within 3 yards of each other
    for (let i = 0; i < receivers.length; i++) {
      for (let j = i + 1; j < receivers.length; j++) {
        const distance = Math.sqrt(
          Math.pow(receivers[i].position.x - receivers[j].position.x, 2) +
          Math.pow(receivers[i].position.y - receivers[j].position.y, 2)
        );

        if (distance < 3) {
          if (!bunched.includes(receivers[i])) bunched.push(receivers[i]);
          if (!bunched.includes(receivers[j])) bunched.push(receivers[j]);
        }
      }
    }

    return bunched;
  }

  private calculateBunchCenter(players: Player[]): Vector2D {
    const sumX = players.reduce((sum, p) => sum + p.position.x, 0);
    const sumY = players.reduce((sum, p) => sum + p.position.y, 0);

    return {
      x: sumX / players.length,
      y: sumY / players.length
    };
  }

  public audibleRoute(playerId: string, newRouteType: RouteType): boolean {
    // Can only audible pre-snap
    if (this.gameState.phase !== 'pre-snap') return false;

    // Check audible limit
    if (this.gameState.audiblesUsed >= this.gameState.maxAudibles) {
      return false;
    }

    const player = this.gameState.players.find(p =>
      p.id === playerId &&
      p.team === 'offense' &&
      p.isEligible &&
      p.playerType !== 'QB'
    );

    if (!player || !player.route) return false;

    // Generate new route based on type
    const newRoute = this.generateRouteFromType(newRouteType, player.position);
    if (!newRoute) return false;

    // Update player's route
    player.route = newRoute;
    this.gameState.audiblesUsed++;

    return true;
  }

  private generateRouteFromType(routeType: RouteType, startPos: Vector2D): Route | null {
    // Generate standard route patterns based on type
    const baseRoute: Route = {
      type: routeType,
      waypoints: [],
      timing: [],
      depth: 0
    };

    switch (routeType) {
      case 'slant':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 2 },
          { x: startPos.x - 5, y: startPos.y + 5 }
        ];
        baseRoute.timing = [0, 0.5, 1.0];
        baseRoute.depth = 5;
        break;

      case 'go':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 15 },
          { x: startPos.x, y: startPos.y + 30 }
        ];
        baseRoute.timing = [0, 1.8, 3.5];
        baseRoute.depth = 30;
        break;

      case 'out':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 8 },
          { x: startPos.x + 5, y: startPos.y + 10 }
        ];
        baseRoute.timing = [0, 1.2, 1.6];
        baseRoute.depth = 10;
        break;

      case 'in':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 8 },
          { x: startPos.x - 5, y: startPos.y + 10 }
        ];
        baseRoute.timing = [0, 1.2, 1.6];
        baseRoute.depth = 10;
        break;

      case 'curl':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 12 },
          { x: startPos.x, y: startPos.y + 10 }
        ];
        baseRoute.timing = [0, 1.5, 2.0];
        baseRoute.depth = 10;
        break;

      case 'flat':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 1 },
          { x: startPos.x + 8, y: startPos.y + 2 },
          { x: startPos.x + 8, y: startPos.y + 4 }
        ];
        baseRoute.timing = [0, 0.2, 0.9, 1.3];
        baseRoute.depth = 3;
        break;

      case 'post':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 8 },
          { x: startPos.x - 3, y: startPos.y + 18 }
        ];
        baseRoute.timing = [0, 1.3, 2.5];
        baseRoute.depth = 18;
        break;

      case 'comeback':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x, y: startPos.y + 12 },
          { x: startPos.x, y: startPos.y + 8 }
        ];
        baseRoute.timing = [0, 1.8, 2.4];
        baseRoute.depth = 8;
        break;

      case 'fade':
        baseRoute.waypoints = [
          startPos,
          { x: startPos.x + 2, y: startPos.y + 10 },
          { x: startPos.x + 3, y: startPos.y + 20 }
        ];
        baseRoute.timing = [0, 1.5, 3.0];
        baseRoute.depth = 20;
        break;

      default:
        return null;
    }

    return baseRoute;
  }

  private animateMotion(player: Player): void {
    if (!player.motionPath || player.motionPath.length < 2) return;

    const startPos = player.motionPath[0];
    const endPos = player.motionPath[1];
    const motionDuration = 1.5; // 1.5 seconds for motion
    const startTime = performance.now();

    const updateMotion = () => {
      if (this.gameState.phase !== 'pre-snap') {
        // Motion interrupted by snap
        return;
      }

      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / motionDuration, 1);

      // Interpolate position
      player.position = {
        x: startPos.x + (endPos.x - startPos.x) * progress,
        y: startPos.y + (endPos.y - startPos.y) * progress
      };

      if (progress < 1) {
        requestAnimationFrame(updateMotion);
      } else {
        // Motion complete
        this.gameState.isMotionActive = false;
        player.hasMotionBoost = true; // Ready for boost at snap
      }
    };

    requestAnimationFrame(updateMotion);
  }

  public snap(): boolean {
    if (this.gameState.phase !== 'pre-snap') return false;
    if (!this.gameState.playConcept || !this.gameState.coverage) return false;

    this.gameState.phase = 'post-snap';
    this.gameState.timeElapsed = 0;

    // Apply motion boosts to players who have them
    this.applyMotionBoosts();

    // Calculate adjusted sack time based on blitzers
    this.calculateAdjustedSackTime();

    // Start the game loop
    this.startGameLoop();

    return true;
  }

  public throwTo(receiverId: string): boolean {
    if (this.gameState.phase !== 'post-snap') return false;
    if (this.gameState.ball.state !== 'held') return false;

    const receiver = this.gameState.players.find(p => p.id === receiverId && p.isEligible);
    if (!receiver) return false;

    // Calculate ball trajectory
    const qb = this.gameState.players.find(p => p.playerType === 'QB');
    if (!qb) return false;

    // Calculate ball trajectory timing
    // Ball physics calculations happen in updateBallPhysics

    this.gameState.ball = {
      ...this.gameState.ball,
      state: 'thrown',
      targetPlayer: receiverId,
      timeInAir: 0,
      velocity: Vector.multiply(
        Vector.direction(qb.position, receiver.position),
        this.config.physics.ballSpeed
      ),
    };

    this.gameState.phase = 'ball-thrown';
    return true;
  }

  public reset(): void {
    this.stopGameLoop();
    this.gameState = this.initializeGameState();
    this.defensiveMovement.reset();
  }

  // Game Loop Methods

  private startGameLoop(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTickTime = performance.now();

    const gameLoop = (currentTime: number) => {
      if (!this.isRunning) return;

      const deltaTime = (currentTime - this.lastTickTime) / 1000; // Convert to seconds
      this.lastTickTime = currentTime;

      this.tick(deltaTime);

      if (this.gameState.phase !== 'play-over') {
        this.animationFrameId = requestAnimationFrame(gameLoop);
      } else {
        this.stopGameLoop();
      }
    };

    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  private stopGameLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private tick(deltaTime: number): void {
    if (this.gameState.phase === 'pre-snap' || this.gameState.phase === 'play-over') {
      return;
    }

    this.gameState.timeElapsed += deltaTime;

    // Update player positions first
    this.updatePlayerPositions(deltaTime);

    // Update sack time based on blocked blitzers (dynamic)
    this.updateSackTimeForBlockedBlitzers();

    // Check for sack
    if (this.gameState.phase === 'post-snap' && this.gameState.timeElapsed >= this.gameState.sackTime) {
      this.endPlay({ type: 'sack', yards: 0, openness: 0, catchProbability: 0 });
      return;
    }

    // Update ball physics
    this.updateBallPhysics(deltaTime);

    // Check for catch/incompletion
    if (this.gameState.phase === 'ball-thrown') {
      this.checkForCatch();
    }
  }

  private updatePlayerPositions(deltaTime: number): void {
    this.gameState.players.forEach(player => {
      // Update motion boost
      if (player.hasMotionBoost) {
        player.motionBoostTimeLeft -= deltaTime;
        if (player.motionBoostTimeLeft <= 0) {
          player.hasMotionBoost = false;
          player.motionBoostTimeLeft = 0;
        }
      }

      // Calculate current speed with boosts
      let speed = player.maxSpeed;
      if (player.isStar) {
        speed *= (1 + this.config.physics.starBoostPercent);
      }
      if (player.hasMotionBoost) {
        speed *= (1 + this.config.physics.motionBoostPercent);
      }

      // Update position based on route or coverage
      if (player.team === 'offense' && player.route && player.playerType !== 'QB' && !player.isBlocking) {
        // Only run routes if not blocking
        this.updateOffensivePlayerPosition(player, deltaTime, speed);
      } else if (player.team === 'offense' && player.isBlocking) {
        // Blocking players stay in position
        this.updateBlockingPlayerPosition(player, deltaTime);
      } else if (player.team === 'defense' && player.coverageResponsibility) {
        this.updateDefensivePlayerPosition(player, deltaTime, speed);
      }

      // Clamp position to field bounds
      player.position = Field.clampToField(player.position);
    });
  }

  private updateBlockingPlayerPosition(player: Player, deltaTime: number): void {
    // Make them ineligible for pass targets while blocking
    player.isEligible = false;

    // Find same-side blitzers to block
    const blitzers = this.gameState.players.filter(p =>
      p.team === 'defense' &&
      p.coverageResponsibility?.type === 'blitz' &&
      !this.isBlitzerBlocked(p.id)
    );

    // Determine which side the blocker is on
    const blockerSide = player.position.x < 26.665 ? 'left' : 'right';

    // Find closest same-side blitzer
    let targetBlitzer: Player | undefined;
    let minDistance = Infinity;

    for (const blitzer of blitzers) {
      const blitzerSide = blitzer.position.x < 26.665 ? 'left' : 'right';
      if (blitzerSide === blockerSide) {
        const distance = Vector.distance(player.position, blitzer.position);
        if (distance < minDistance) {
          minDistance = distance;
          targetBlitzer = blitzer;
        }
      }
    }

    if (targetBlitzer) {
      // Move toward the blitzer to intercept
      player.blockingTarget = targetBlitzer.id;

      // Check if we're close enough to block
      const blockingRadius = 2.0; // yards
      if (minDistance <= blockingRadius) {
        // We're blocking them - stop both players
        player.velocity = { x: 0, y: 0 };
        player.currentSpeed = 0;

        // Mark the blitzer as blocked (neutralized)
        targetBlitzer.velocity = { x: 0, y: 0 };
        targetBlitzer.currentSpeed = 0;

        // Mark blitzer as being blocked for sack time calculations
        targetBlitzer.isBlocked = true;
      } else {
        // Move toward the blitzer
        const direction = Vector.direction(player.position, targetBlitzer.position);
        const speed = this.getPlayerSpeed(player.playerType);
        const movement = Vector.multiply(direction, speed * deltaTime);

        player.velocity = movement;
        player.position = Vector.add(player.position, movement);
        player.currentSpeed = speed;
      }
    } else {
      // No blitzer to block - move to the LOS and stop
      if (!player.blockingPosition) {
        // Set default position at LOS (y = 60)
        const offsetX = blockerSide === 'left' ? player.position.x - 2 : player.position.x + 2;
        player.blockingPosition = {
          x: offsetX,
          y: this.gameState.lineOfScrimmage + 2 // Just upfield from LOS
        };
      }

      if (player.blockingPosition) {
        const distance = Vector.distance(player.position, player.blockingPosition);
        if (distance > 0.5) {
          const direction = Vector.direction(player.position, player.blockingPosition);
          const speed = this.getPlayerSpeed(player.playerType) * 0.5; // Move slower when not chasing
          const movement = Vector.multiply(direction, speed * deltaTime);

          player.velocity = movement;
          player.position = Vector.add(player.position, movement);
          player.currentSpeed = speed;
        } else {
          player.velocity = { x: 0, y: 0 };
          player.currentSpeed = 0;
        }
      }
    }
  }

  private isBlitzerBlocked(blitzerId: string): boolean {
    // Check if blitzer is marked as blocked or if any blocker is currently blocking this blitzer
    const blitzer = this.gameState.players.find(p => p.id === blitzerId);
    if (blitzer?.isBlocked) return true;

    return this.gameState.players.some(p =>
      p.team === 'offense' &&
      p.isBlocking &&
      p.blockingTarget === blitzerId &&
      Vector.distance(p.position, blitzer?.position || { x: 0, y: 0 }) <= 2.0
    );
  }

  private updateOffensivePlayerPosition(player: Player, deltaTime: number, speed: number): void {
    if (!player.route) return;

    const targetPosition = RouteUtil.getPositionAtTime(
      player.route.waypoints,
      player.route.timing,
      this.gameState.timeElapsed
    );

    const direction = Vector.direction(player.position, targetPosition);
    const maxMovement = speed * deltaTime;
    const desiredMovement = Vector.multiply(direction, maxMovement);

    player.velocity = desiredMovement;
    player.position = Vector.add(player.position, desiredMovement);
    player.currentSpeed = Vector.magnitude(desiredMovement) / deltaTime;
  }

  private updateDefensivePlayerPosition(player: Player, deltaTime: number, speed: number): void {
    if (!player.coverageResponsibility) return;

    // Get current coverage type from gameState
    const currentCoverage = this.gameState.currentCoverage || this.gameState.coverage;
    if (!currentCoverage) return;

    // Initialize defender state if needed
    if (player.coverageResponsibility.type === 'man' && player.coverageResponsibility.target) {
      const target = this.gameState.players.find(p => p.id === player.coverageResponsibility!.target);
      if (target) {
        this.defensiveMovement.initializeDefender(player, currentCoverage, target);
      }
    } else {
      this.defensiveMovement.initializeDefender(player, currentCoverage);
    }

    // Get adjusted speed from movement system
    const adjustedSpeed = this.defensiveMovement.getMovementSpeed(player, speed);

    // Execute coverage-specific logic
    switch (currentCoverage?.name) {
      case 'Cover 4':
      case 'Quarters':
        this.executeCover4PatternMatch(player, deltaTime, adjustedSpeed);
        break;
      case 'Tampa 2':
        this.executeTampa2Coverage(player, deltaTime, adjustedSpeed);
        break;
      case 'Cover 6':
        this.executeCover6SplitField(player, deltaTime, adjustedSpeed);
        break;
      case 'Cover 0':
        this.executeCover0Blitz(player, deltaTime, adjustedSpeed);
        break;
      default:
        // Standard man/zone execution for other coverages
        this.executeStandardCoverage(player, deltaTime, adjustedSpeed);
        break;
    }
  }

  private executeStandardCoverage(player: Player, deltaTime: number, speed: number): void {
    if (!player.coverageResponsibility) return;

    const currentCoverage = this.gameState.currentCoverage || this.gameState.coverage;
    if (!currentCoverage) return;

    if (player.coverageResponsibility.type === 'man' && player.coverageResponsibility.target) {
      // Use improved man coverage movement
      const target = this.gameState.players.find(p => p.id === player.coverageResponsibility!.target);
      if (target) {
        const newPosition = this.defensiveMovement.updateManCoverage(player, target, deltaTime);

        // Update velocity for animation
        player.velocity = {
          x: (newPosition.x - player.position.x) / deltaTime,
          y: (newPosition.y - player.position.y) / deltaTime
        };
        player.position = newPosition;
        player.currentSpeed = Vector.magnitude(player.velocity);
      }
    } else if (player.coverageResponsibility.type === 'zone' && player.coverageResponsibility.zone) {
      // Use improved zone coverage movement
      const zoneLandmark = this.getZoneTargetPosition(player);
      const ballCarrier = this.gameState.players.find(p => p.hasBall);
      const newPosition = this.defensiveMovement.updateZoneCoverage(player, zoneLandmark, deltaTime, ballCarrier);

      // Update velocity for animation
      player.velocity = {
        x: (newPosition.x - player.position.x) / deltaTime,
        y: (newPosition.y - player.position.y) / deltaTime
      };
      player.position = newPosition;
      player.currentSpeed = Vector.magnitude(player.velocity);
    } else if (player.coverageResponsibility.type === 'blitz') {
      // Blitzing - rush the QB
      const qb = this.gameState.players.find(p => p.playerType === 'QB');
      if (qb) {
        const targetPosition = qb.position;
        const boostedSpeed = speed * 1.1; // Blitzers get slight speed boost
        this.moveDefenderToTarget(player, targetPosition, deltaTime, boostedSpeed);
      }
    }
  }

  private executeCover4PatternMatch(player: Player, deltaTime: number, speed: number): void {
    if (!player.coverageResponsibility) return;

    // Cover 4 Quarters with pattern matching
    const verticalThreshold = 8; // yards downfield triggers man coverage

    if (player.playerType === 'CB' || player.playerType === 'S') {
      // Find assigned receiver (#1 for CB, #2 for Safety)
      const assignedReceiver = this.findAssignedReceiver(player);

      if (assignedReceiver) {
        const routeDepth = assignedReceiver.position.y - this.gameState.lineOfScrimmage; // Distance from LOS

        // MOD (Man Only Deep) rules
        if (routeDepth >= verticalThreshold) {
          // Switch to man coverage on vertical routes
          player.coverageResponsibility.type = 'man';
          player.coverageResponsibility.target = assignedReceiver.id;
          this.moveDefenderToTarget(player, assignedReceiver.position, deltaTime, speed);
        } else {
          // Sink to deep quarter if receiver runs shallow
          const quarterZone = this.getDeepQuarterZone(player);
          this.moveDefenderToTarget(player, quarterZone, deltaTime, speed * 0.85);
        }
      } else {
        // No receiver in zone - maintain deep quarter position
        const quarterZone = this.getDeepQuarterZone(player);
        this.moveDefenderToTarget(player, quarterZone, deltaTime, speed * 0.7);
      }
    } else if (player.playerType === 'LB' || player.playerType === 'NB') {
      // Underneath defenders - wall off crossers and carry verticals
      this.executeUndernethCoverage(player, deltaTime, speed);
    }
  }

  private executeTampa2Coverage(player: Player, deltaTime: number, speed: number): void {
    if (!player.coverageResponsibility) return;

    // Tampa 2 - 2 deep safeties, Mike LB drops to deep middle
    if (player.playerType === 'LB' && player.coverageResponsibility.zone?.name === 'deep-middle') {
      // Mike LB drops to deep hole between safeties
      const deepHolePosition = { x: 26.665, y: this.gameState.lineOfScrimmage + 15 }; // Middle of field, 15 yards deep from LOS
      this.moveDefenderToTarget(player, deepHolePosition, deltaTime, speed * 1.1);
    } else if (player.playerType === 'S') {
      // Safeties play deep halves
      const isFieldSide = player.position.x > 26.665;
      const halfZone = {
        x: isFieldSide ? 40 : 13.33,
        y: this.gameState.lineOfScrimmage + 20 // 20 yards deep from LOS
      };
      this.moveDefenderToTarget(player, halfZone, deltaTime, speed);
    } else if (player.playerType === 'CB') {
      // Corners play aggressive underneath zones
      const flatZone = this.getFlatZone(player);
      this.moveDefenderToTarget(player, flatZone, deltaTime, speed);
    } else {
      // Other LBs play standard underneath zones
      this.executeUndernethCoverage(player, deltaTime, speed);
    }
  }

  private executeCover6SplitField(player: Player, deltaTime: number, speed: number): void {
    if (!player.coverageResponsibility) return;

    // Cover 6 - Field side plays quarters, boundary side plays Cover 2
    const isFieldSide = player.position.x > 26.665;

    if (isFieldSide) {
      // Field side - play quarters coverage
      this.executeCover4PatternMatch(player, deltaTime, speed);
    } else {
      // Boundary side - play Cover 2 principles
      if (player.playerType === 'CB') {
        const flatZone = this.getFlatZone(player);
        this.moveDefenderToTarget(player, flatZone, deltaTime, speed);
      } else if (player.playerType === 'S' && player.position.x < 26.665) {
        // Boundary safety plays deep half
        const deepHalf = { x: 13.33, y: this.gameState.lineOfScrimmage + 20 };
        this.moveDefenderToTarget(player, deepHalf, deltaTime, speed);
      } else {
        this.executeStandardCoverage(player, deltaTime, speed);
      }
    }
  }

  private executeCover0Blitz(player: Player, deltaTime: number, speed: number): void {
    if (!player.coverageResponsibility) return;

    // Cover 0 - All-out blitz with pure man coverage
    if (player.coverageResponsibility.type === 'man' && player.coverageResponsibility.target) {
      // Tight man coverage with no help
      const target = this.gameState.players.find(p => p.id === player.coverageResponsibility!.target);
      if (target) {
        // More aggressive positioning
        const aggressivePosition = {
          x: target.position.x,
          y: target.position.y + 1 // Stay closer on defensive side
        };
        this.moveDefenderToTarget(player, aggressivePosition, deltaTime, speed * 1.05);
      }
    } else if (player.coverageResponsibility?.type === 'blitz') {
      // Aggressive blitz path
      const qb = this.gameState.players.find(p => p.playerType === 'QB');
      if (qb) {
        this.moveDefenderToTarget(player, qb.position, deltaTime, speed * 1.15);
      }
    }
  }

  private executeUndernethCoverage(player: Player, deltaTime: number, speed: number): void {
    // Find closest threat in underneath zone
    const threats = this.gameState.players.filter(p =>
      p.team === 'offense' &&
      p.isEligible &&
      Math.abs(p.position.y - this.gameState.lineOfScrimmage) < 10 && // Within 10 yards of LOS
      Vector.distance(player.position, p.position) < 15
    );

    if (threats.length > 0) {
      // Cover closest threat
      const closest = threats.reduce((prev, curr) =>
        Vector.distance(player.position, prev.position) < Vector.distance(player.position, curr.position) ? prev : curr
      );
      this.moveDefenderToTarget(player, closest.position, deltaTime, speed);
    } else if (player.coverageResponsibility?.zone) {
      // Return to zone
      this.moveDefenderToTarget(player, player.coverageResponsibility.zone.center, deltaTime, speed * 0.8);
    }
  }

  private findAssignedReceiver(defender: Player): Player | null {
    // Find receiver based on defender's assignment (#1, #2, #3)
    const offensivePlayers = this.gameState.players.filter(p =>
      p.team === 'offense' && p.isEligible
    ).sort((a, b) => {
      // Sort by outside-in positioning
      const isLeft = defender.position.x < 26.665;
      return isLeft ? a.position.x - b.position.x : b.position.x - a.position.x;
    });

    // CB covers #1, Safety covers #2
    const index = defender.playerType === 'CB' ? 0 : 1;
    return offensivePlayers[index] || null;
  }

  private getDeepQuarterZone(defender: Player): Vector2D {
    // Calculate deep quarter zone position
    const isLeft = defender.position.x < 26.665;
    return {
      x: isLeft ? 10 : 43.33, // Near sideline
      y: this.gameState.lineOfScrimmage + 15 // 15 yards deep from LOS
    };
  }

  private getFlatZone(defender: Player): Vector2D {
    // Calculate flat zone position
    const isLeft = defender.position.x < 26.665;
    return {
      x: isLeft ? 10 : 43.33,
      y: this.gameState.lineOfScrimmage + 5 // 5 yards deep from LOS
    };
  }

  private getZoneTargetPosition(player: Player): Vector2D {
    if (!player.coverageResponsibility?.zone) return player.position;

    // Find closest offensive threat in zone
    const threatsInZone = this.gameState.players.filter(p => {
      if (p.team !== 'offense' || !p.isEligible) return false;

      const zone = player.coverageResponsibility!.zone!;
      const inZone = Math.abs(p.position.x - zone.center.x) <= zone.width / 2 &&
                     Math.abs(p.position.y - zone.center.y) <= zone.depth / 2;
      return inZone;
    });

    if (threatsInZone.length > 0) {
      // Move toward closest threat in zone
      const closest = threatsInZone.reduce((prev, curr) =>
        Vector.distance(player.position, prev.position) < Vector.distance(player.position, curr.position) ? prev : curr
      );
      return closest.position;
    }

    // No threats - return to zone center
    return player.coverageResponsibility.zone.center;
  }

  private moveDefenderToTarget(player: Player, targetPosition: Vector2D, deltaTime: number, speed: number): void {
    const direction = Vector.direction(player.position, targetPosition);
    const distance = Vector.distance(player.position, targetPosition);

    // Smooth deceleration when close to target
    const speedMultiplier = distance > 5 ? 1 : distance / 5;
    const maxMovement = speed * deltaTime * speedMultiplier * 0.9;

    player.velocity = Vector.multiply(direction, maxMovement);
    player.position = Vector.add(player.position, player.velocity);
    player.currentSpeed = Vector.magnitude(player.velocity) / deltaTime;
  }

  private updateBallPhysics(deltaTime: number): void {
    if (this.gameState.ball.state !== 'thrown') return;

    this.gameState.ball.timeInAir += deltaTime;
    this.gameState.ball.position = Vector.add(
      this.gameState.ball.position,
      Vector.multiply(this.gameState.ball.velocity, deltaTime)
    );

    // Clamp ball to field bounds
    this.gameState.ball.position = Field.clampToField(this.gameState.ball.position);
  }

  private checkForCatch(): void {
    if (!this.gameState.ball.targetPlayer) return;

    const receiver = this.gameState.players.find(p => p.id === this.gameState.ball.targetPlayer);
    if (!receiver) return;

    const ballToReceiver = Vector.distance(this.gameState.ball.position, receiver.position);

    if (ballToReceiver <= this.config.physics.catchRadius) {
      // Ball has reached receiver area - determine outcome
      const closestDefender = this.findClosestDefender(receiver.position);
      const separation = closestDefender
        ? Vector.distance(receiver.position, closestDefender.position)
        : 10; // No defender nearby

      const openness = Physics.separationToOpenness(separation, this.config.physics.tackleRadius);
      const catchProbability = this.calculateCatchProbability(openness, separation);

      // Determine outcome
      let outcome: PlayOutcome;

      if (separation <= this.config.physics.tackleRadius) {
        // Defender is in tackle radius - chance of interception
        if (Random.chance(0.3)) {
          outcome = {
            type: 'interception',
            defender: closestDefender?.id,
            yards: Field.coordsToYards(receiver.position).yardLine,
            openness,
            catchProbability,
          };
        } else {
          outcome = {
            type: 'incomplete',
            receiver: receiver.id,
            defender: closestDefender?.id,
            yards: 0,
            openness,
            catchProbability,
          };
        }
      } else if (Random.chance(catchProbability / 100)) {
        // Successful catch
        outcome = {
          type: 'catch',
          receiver: receiver.id,
          yards: Field.coordsToYards(receiver.position).yardLine,
          openness,
          catchProbability,
        };
      } else {
        // Dropped pass
        outcome = {
          type: 'incomplete',
          receiver: receiver.id,
          yards: 0,
          openness,
          catchProbability,
        };
      }

      this.endPlay(outcome);
    }
  }

  private findClosestDefender(position: Vector2D): Player | null {
    let closest: Player | null = null;
    let closestDistance = Infinity;

    this.gameState.players
      .filter(p => p.team === 'defense')
      .forEach(defender => {
        const distance = Vector.distance(position, defender.position);
        if (distance < closestDistance) {
          closest = defender;
          closestDistance = distance;
        }
      });

    return closest;
  }

  private calculateCatchProbability(openness: number, separation: number): number {
    // Base catch rate is high for wide open receivers
    let catchRate = Math.min(95, openness * 0.9 + 50);

    // Reduce catch rate if defender is very close
    if (separation < 2) {
      catchRate *= 0.7;
    } else if (separation < 3) {
      catchRate *= 0.85;
    }

    return Math.max(10, Math.min(95, catchRate));
  }

  private endPlay(outcome: PlayOutcome): void {
    this.gameState.outcome = outcome;
    this.gameState.phase = 'play-over';
    this.gameState.ball.state = outcome.type === 'catch' ? 'caught' :
      outcome.type === 'interception' ? 'intercepted' : 'incomplete';

    this.stopGameLoop();
  }

  // Helper methods for setup
  private setupPlayers(): void {
    if (!this.gameState.playConcept) return;

    const concept = this.gameState.playConcept;
    this.gameState.players = [];

    // Calculate hash offset for offensive alignment
    let hashOffset = 0;
    if (this.gameState.hashPosition === 'left') {
      hashOffset = -this.config.fieldDimensions.hashFromCenter;
    } else if (this.gameState.hashPosition === 'right') {
      hashOffset = this.config.fieldDimensions.hashFromCenter;
    }

    // Create offensive players based on formation
    Object.entries(concept.formation.positions).forEach(([playerId, position]) => {
      const playerType = this.getPlayerTypeFromId(playerId);
      // Adjust position relative to current LOS and hash
      const adjustedPosition = {
        x: position.x + hashOffset, // Apply hash offset to x position
        y: position.y - 60 + this.gameState.lineOfScrimmage
      };
      const player: Player = {
        id: playerId,
        position: adjustedPosition,
        velocity: { x: 0, y: 0 },
        team: 'offense',
        playerType,
        route: concept.routes[playerId],
        isEligible: this.isEligibleReceiver(playerType),
        maxSpeed: this.getPlayerSpeed(playerType),
        currentSpeed: 0,
        isStar: false,
        hasMotion: false,
        hasMotionBoost: false,
        motionBoostTimeLeft: 0,
        isBlocking: false,
      };

      this.gameState.players.push(player);
    });
  }

  private setupDefense(): void {
    if (!this.gameState.coverage) return;

    const coverage = this.gameState.coverage;
    // Remove existing defensive players but keep offensive players
    this.gameState.players = this.gameState.players.filter(p => p.team === 'offense');
    const offensivePlayers = this.gameState.players;

    // Apply dynamic personnel substitution and alignment for Cover 1
    if (coverage.type === 'cover-1') {
      // Analyze offensive formation and personnel
      const formation = analyzeFormation(offensivePlayers);
      const optimalPersonnel = getOptimalDefensivePersonnel(formation.personnel);
      const assignments = generateDefensiveAssignments(formation, optimalPersonnel);

      // Create defensive players based on dynamic assignments
      const defensivePlayers: Player[] = assignments.map(assignment => {
        const playerType = assignment.playerType as PlayerType;

        // Create coverage responsibility based on assignment
        const responsibility = {
          defenderId: assignment.defenderId,
          type: assignment.role === 'man-coverage' ? 'man' as const :
                assignment.role === 'spy' ? 'spy' as const : 'zone' as const,
          target: assignment.target,
        };

        const defender: Player = {
          id: assignment.defenderId,
          position: { x: 0, y: 0 }, // Will be set by alignment system
          velocity: { x: 0, y: 0 },
          team: 'defense',
          playerType,
          coverageResponsibility: responsibility,
          isEligible: false,
          maxSpeed: this.getPlayerSpeed(playerType),
          currentSpeed: 0,
          isStar: false,
          hasMotion: false,
          hasMotionBoost: false,
          motionBoostTimeLeft: 0,
          isBlocking: false,
        };

        return defender;
      });

      // Apply dynamic alignment
      const alignmentPositions = generateCover1Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);

      // Update defender positions with calculated alignments
      defensivePlayers.forEach(defender => {
        const calculatedPosition = alignmentPositions[defender.id];
        if (calculatedPosition) {
          defender.position = calculatedPosition;
        } else {
          // Fallback to static positioning if dynamic calculation fails
          defender.position = this.getDefensivePosition(defender.id, coverage);
        }
      });

      // Add defensive players to game state
      this.gameState.players.push(...defensivePlayers);

    } else {
      // For other coverages, create defenders and apply dynamic alignment
      const defensivePlayers: Player[] = [];
      coverage.responsibilities.forEach((responsibility) => {
        const playerType = this.getPlayerTypeFromId(responsibility.defenderId);

        const defender: Player = {
          id: responsibility.defenderId,
          position: { x: 0, y: 0 }, // Will be set by alignment system
          velocity: { x: 0, y: 0 },
          team: 'defense',
          playerType,
          coverageResponsibility: responsibility,
          isEligible: false,
          maxSpeed: this.getPlayerSpeed(playerType),
          currentSpeed: 0,
          isStar: false,
          hasMotion: false,
          hasMotionBoost: false,
          motionBoostTimeLeft: 0,
          isBlocking: false,
        };

        defensivePlayers.push(defender);
      });

      // Apply dynamic alignment based on coverage type
      let alignmentPositions: Record<string, Vector2D> = {};

      switch (coverage.type) {
        case 'cover-0':
          alignmentPositions = generateCover0Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);
          break;
        case 'cover-2':
          alignmentPositions = generateCover2Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);
          break;
        case 'cover-3':
          alignmentPositions = generateCover3Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);
          break;
        case 'tampa-2':
          alignmentPositions = generateTampa2Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);
          break;
        case 'cover-4':
        case 'quarters':
          alignmentPositions = generateCover4Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);
          break;
        case 'cover-6':
          alignmentPositions = generateCover6Alignment(offensivePlayers, defensivePlayers, this.gameState.lineOfScrimmage);
          break;
        default:
          // For coverages without specific alignment functions, use fallback positioning
          defensivePlayers.forEach(defender => {
            defender.position = this.getDefensivePosition(defender.id, coverage);
          });
          break;
      }

      // Update defender positions with calculated alignments
      if (Object.keys(alignmentPositions).length > 0) {
        defensivePlayers.forEach(defender => {
          const calculatedPosition = alignmentPositions[defender.id];
          if (calculatedPosition) {
            defender.position = calculatedPosition;
          } else {
            // Fallback to static positioning if dynamic calculation fails
            defender.position = this.getDefensivePosition(defender.id, coverage);
          }
        });
      }

      // Add defensive players to game state
      this.gameState.players.push(...defensivePlayers);
    }
  }

  private getDefensivePosition(defenderId: string, coverage: Coverage): Vector2D {
    // Get position from coverage data and adjust relative to LOS
    const los = this.gameState.lineOfScrimmage;
    const coveragePosition = coverage.positions?.[defenderId];

    if (coveragePosition) {
      // Coverage positions assume LOS at y=60, so adjust relative to actual LOS
      return {
        x: coveragePosition.x,
        y: coveragePosition.y - 60 + los
      };
    }

    // Fallback positions based on player type
    const playerType = this.getPlayerTypeFromId(defenderId);
    switch (playerType) {
      case 'CB':
        return defenderId === 'CB1' ? { x: 8, y: los - 5 } :
               defenderId === 'CB2' ? { x: 45, y: los - 5 } : { x: 38, y: los - 3 };
      case 'S':
        return { x: 26.665, y: los - 12 }; // 12 yards behind LOS
      case 'LB':
        return defenderId === 'LB1' ? { x: 20, y: los - 4 } :
               defenderId === 'LB2' ? { x: 26.665, y: los - 5 } : { x: 33, y: los - 4 };
      default:
        return { x: 26.665, y: los - 5 };
    }
  }

  private applyMotionBoosts(): void {
    // Apply motion boost to players who have it
    this.gameState.players
      .filter(p => p.hasMotionBoost)
      .forEach(p => {
        p.motionBoostTimeLeft = this.config.physics.motionBoostDuration;
      });
  }

  private calculateAdjustedSackTime(): void {
    // Store original sack time for dynamic adjustments
    const baseSackTime = this.gameState.sackTime;

    // Count only unblocked blitzing defenders
    const unblockedBlitzers = this.gameState.players.filter(player =>
      player.team === 'defense' &&
      player.coverageResponsibility?.type === 'blitz' &&
      !this.isBlitzerBlocked(player.id)
    );

    const unblockedCount = unblockedBlitzers.length;

    if (unblockedCount === 0) {
      // No unblocked blitzers - no adjustment needed
      return;
    }

    // Get base sack time for scaling
    const maxSackTime = this.config.gameplay.maxSackTime;

    // Calculate proportional reduction based on Claude.md specs
    let minReduction = 0;
    let maxReduction = 0;

    if (unblockedCount === 1) {
      // 1 blitzer: 0.3-2.0s reduction (scaled to sack time)
      minReduction = 0.3;
      maxReduction = 2.0;
    } else if (unblockedCount >= 2) {
      // 2+ blitzers: 0.7-4.0s reduction (scaled to sack time)
      minReduction = 0.7;
      maxReduction = 4.0;
    }

    // Scale reduction based on current sack time (proportional to 10s max)
    const scaleFactor = baseSackTime / maxSackTime;
    const scaledMinReduction = minReduction * scaleFactor;
    const scaledMaxReduction = maxReduction * scaleFactor;

    // Random reduction within scaled range
    const reduction = scaledMinReduction +
      Math.random() * (scaledMaxReduction - scaledMinReduction);

    // Apply reduction, ensuring sack time doesn't go below 0.5s
    this.gameState.sackTime = Math.max(0.5, baseSackTime - reduction);
  }

  // Update sack time dynamically during play for newly blocked blitzers
  private updateSackTimeForBlockedBlitzers(): void {
    if (this.gameState.phase !== 'post-snap') return;

    // Recalculate based on current blocking status
    const originalSackTime = this.config.gameplay.defaultSackTime;
    if (this.gameState.gameMode === 'challenge') {
      this.gameState.sackTime = this.config.gameplay.challengeModeSackTime;
    } else {
      this.gameState.sackTime = originalSackTime;
    }

    // Reapply adjustments for unblocked blitzers
    this.calculateAdjustedSackTime();
  }

  private getPlayerTypeFromId(playerId: string): PlayerType {
    // Extract player type from ID (e.g., "QB1" -> "QB")
    const match = playerId.match(/^([A-Z]+)/);
    return (match ? match[1] : 'WR') as PlayerType;
  }

  private isEligibleReceiver(playerType: PlayerType): boolean {
    return ['WR', 'TE', 'RB'].includes(playerType);
  }

  private getPlayerSpeed(playerType: PlayerType): number {
    const speedRange = this.config.playerSpeeds[playerType];
    return Random.range(speedRange.min, speedRange.max);
  }
}
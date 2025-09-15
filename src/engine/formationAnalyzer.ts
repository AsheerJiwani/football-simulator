import { Player, Vector2D } from './types';

export type FormationType = 'balanced' | 'trips' | 'bunch' | 'spread' | 'heavy' | 'empty' | 'i-form' | 'strong';
export type FormationStrength = 'left' | 'right' | 'balanced';
export type ReceiverSet = 'trips' | 'bunch' | 'stack' | 'spread' | 'twins' | 'balanced';

export interface FormationAnalysis {
  type: FormationType;
  strength: FormationStrength;
  receiverDistribution: {
    left: number;
    right: number;
    backfield: number;
  };
  receiverSets: ReceiverSet[];
  personnel: string; // e.g., "11", "12", "10"
  hasTE: boolean;
  hasFB: boolean;
  widestReceiver: {
    left: string | null;
    right: string | null;
  };
  slotReceivers: string[];
  backfieldPlayers: string[];
}

export interface GapResponsibility {
  gap: 'A' | 'B' | 'C' | 'D';
  position: Vector2D;
  defender?: string;
}

export class FormationAnalyzer {
  private readonly FIELD_WIDTH = 53.33;
  private readonly FIELD_CENTER = 26.67;
  private readonly HASH_LEFT = 23.58;
  private readonly HASH_RIGHT = 29.75;
  private readonly BUNCH_THRESHOLD = 4; // yards between receivers for bunch
  private readonly TRIPS_MIN_RECEIVERS = 3;
  private readonly STACK_THRESHOLD = 2; // yards for stacked alignment

  analyzeFormation(offensivePlayers: Player[]): FormationAnalysis {
    const eligibleReceivers = this.getEligibleReceivers(offensivePlayers);
    const personnel = this.getPersonnelGrouping(offensivePlayers);
    const distribution = this.getReceiverDistribution(eligibleReceivers);
    const strength = this.determineStrength(offensivePlayers, distribution);
    const receiverSets = this.identifyReceiverSets(eligibleReceivers);
    const type = this.determineFormationType(offensivePlayers, personnel, distribution, receiverSets);

    const hasTE = offensivePlayers.some(p => p.playerType === 'TE');
    const hasFB = offensivePlayers.some(p => p.playerType === 'FB');

    const widestReceiver = this.findWidestReceivers(eligibleReceivers);
    const slotReceivers = this.identifySlotReceivers(eligibleReceivers);
    const backfieldPlayers = this.getBackfieldPlayers(offensivePlayers);

    return {
      type,
      strength,
      receiverDistribution: distribution,
      receiverSets,
      personnel,
      hasTE,
      hasFB,
      widestReceiver,
      slotReceivers,
      backfieldPlayers
    };
  }

  detectStrength(offensivePlayers: Player[]): FormationStrength {
    const analysis = this.analyzeFormation(offensivePlayers);
    return analysis.strength;
  }

  identifyReceiverSets(receivers: Player[]): ReceiverSet[] {
    const sets: ReceiverSet[] = [];

    // Group receivers by side
    const leftReceivers = receivers.filter(r => r.position.x < this.FIELD_CENTER);
    const rightReceivers = receivers.filter(r => r.position.x >= this.FIELD_CENTER);

    // Check for trips (3+ receivers to one side)
    if (leftReceivers.length >= this.TRIPS_MIN_RECEIVERS) {
      sets.push('trips');

      // Check if trips forms a bunch
      if (this.isBunchFormation(leftReceivers)) {
        sets.push('bunch');
      }

      // Check for stack alignment
      if (this.isStackFormation(leftReceivers)) {
        sets.push('stack');
      }
    }

    if (rightReceivers.length >= this.TRIPS_MIN_RECEIVERS) {
      sets.push('trips');

      if (this.isBunchFormation(rightReceivers)) {
        sets.push('bunch');
      }

      if (this.isStackFormation(rightReceivers)) {
        sets.push('stack');
      }
    }

    // Check for twins (2 receivers to same side)
    if (leftReceivers.length === 2 || rightReceivers.length === 2) {
      sets.push('twins');
    }

    // Check for spread (4+ wide receivers)
    const wideReceivers = receivers.filter(r => r.playerType === 'WR');
    if (wideReceivers.length >= 4) {
      sets.push('spread');
    }

    // Check for balanced (equal distribution)
    if (leftReceivers.length === rightReceivers.length && leftReceivers.length > 0) {
      sets.push('balanced');
    }

    return sets;
  }

  calculateLeverages(offensivePlayers: Player[], defensivePlayers: Player[]): Map<string, 'inside' | 'outside' | 'head-up'> {
    const leverages = new Map<string, 'inside' | 'outside' | 'head-up'>();

    for (const defender of defensivePlayers) {
      if (defender.team !== 'defense') continue;

      // Find closest offensive player
      let closestOffensive: Player | null = null;
      let minDistance = Infinity;

      for (const offensive of offensivePlayers) {
        if (!offensive.isEligible) continue;

        const distance = this.calculateDistance(defender.position, offensive.position);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffensive = offensive;
        }
      }

      if (closestOffensive) {
        // Determine leverage based on relative position
        const xDiff = defender.position.x - closestOffensive.position.x;

        if (Math.abs(xDiff) < 1) {
          leverages.set(defender.id, 'head-up');
        } else if (xDiff < 0) {
          leverages.set(defender.id, 'inside');
        } else {
          leverages.set(defender.id, 'outside');
        }
      }
    }

    return leverages;
  }

  determineGaps(offensivePlayers: Player[]): GapResponsibility[] {
    const gaps: GapResponsibility[] = [];
    const center = this.FIELD_CENTER;

    // A gaps (between center and guards)
    gaps.push(
      { gap: 'A', position: { x: center - 1.5, y: 0 } },
      { gap: 'A', position: { x: center + 1.5, y: 0 } }
    );

    // B gaps (between guards and tackles)
    gaps.push(
      { gap: 'B', position: { x: center - 4, y: 0 } },
      { gap: 'B', position: { x: center + 4, y: 0 } }
    );

    // C gaps (outside tackles)
    gaps.push(
      { gap: 'C', position: { x: center - 7, y: 0 } },
      { gap: 'C', position: { x: center + 7, y: 0 } }
    );

    // D gaps (wide, outside TEs if present)
    const hasTE = offensivePlayers.some(p => p.playerType === 'TE');
    if (hasTE) {
      gaps.push(
        { gap: 'D', position: { x: center - 10, y: 0 } },
        { gap: 'D', position: { x: center + 10, y: 0 } }
      );
    }

    return gaps;
  }

  // Private helper methods

  private getEligibleReceivers(players: Player[]): Player[] {
    return players.filter(p =>
      p.team === 'offense' &&
      p.isEligible &&
      p.playerType !== 'QB'
    );
  }

  private getPersonnelGrouping(players: Player[]): string {
    const rbs = players.filter(p => p.playerType === 'RB' || p.playerType === 'FB').length;
    const tes = players.filter(p => p.playerType === 'TE').length;
    const wrs = players.filter(p => p.playerType === 'WR').length;

    // Personnel grouping: first digit = RBs, second digit = TEs
    // Remaining are WRs (5 - RBs - TEs = WRs)
    return `${rbs}${tes}`;
  }

  private getReceiverDistribution(receivers: Player[]): { left: number; right: number; backfield: number } {
    const left = receivers.filter(r => r.position.x < this.FIELD_CENTER && r.position.y <= 0).length;
    const right = receivers.filter(r => r.position.x >= this.FIELD_CENTER && r.position.y <= 0).length;
    const backfield = receivers.filter(r => r.position.y < -3).length; // Behind QB

    return { left, right, backfield };
  }

  private determineStrength(players: Player[], distribution: { left: number; right: number; backfield: number }): FormationStrength {
    // Priority 1: 3+ receiver surface (trips)
    if (distribution.left >= 3) {
      return 'left';
    } else if (distribution.right >= 3) {
      return 'right';
    }

    // Priority 2: TE side
    const te = players.find(p => p.playerType === 'TE');
    if (te) {
      return te.position.x < this.FIELD_CENTER ? 'left' : 'right';
    }

    // Priority 3: More receivers to one side
    if (distribution.left > distribution.right) {
      return 'left';
    } else if (distribution.right > distribution.left) {
      return 'right';
    }

    // Priority 4: RB alignment
    const rb = players.find(p => p.playerType === 'RB');
    if (rb && Math.abs(rb.position.x - this.FIELD_CENTER) > 2) {
      return rb.position.x < this.FIELD_CENTER ? 'left' : 'right';
    }

    return 'balanced';
  }

  private determineFormationType(
    players: Player[],
    personnel: string,
    distribution: { left: number; right: number; backfield: number },
    receiverSets: ReceiverSet[]
  ): FormationType {
    // Bunch formation (priority over empty if bunch set is detected)
    if (receiverSets.includes('bunch')) {
      return 'bunch';
    }

    // Trips formation
    if (receiverSets.includes('trips')) {
      return 'trips';
    }

    // Empty formation (no RBs or FBs - only check personnel, not distribution)
    const hasRBorFB = players.some(p => p.playerType === 'RB' || p.playerType === 'FB');
    if (!hasRBorFB) {
      return 'empty';
    }

    // Spread formation (4+ WRs)
    if (receiverSets.includes('spread')) {
      return 'spread';
    }

    // Heavy formation (2+ TEs or 2+ RBs)
    if (personnel === '21' || personnel === '22' || personnel === '12' || personnel === '13') {
      return 'heavy';
    }

    // I-Formation (2 backs aligned vertically)
    if (this.isIFormation(players)) {
      return 'i-form';
    }

    // Strong formation (TE + RB to same side)
    if (this.isStrongFormation(players)) {
      return 'strong';
    }

    return 'balanced';
  }

  private isBunchFormation(receivers: Player[]): boolean {
    if (receivers.length < 3) return false;

    // Check if all receivers are within bunch threshold of each other
    for (let i = 0; i < receivers.length - 1; i++) {
      for (let j = i + 1; j < receivers.length; j++) {
        const distance = Math.abs(receivers[i].position.x - receivers[j].position.x);
        if (distance > this.BUNCH_THRESHOLD) {
          return false;
        }
      }
    }

    return true;
  }

  private isStackFormation(receivers: Player[]): boolean {
    if (receivers.length < 2) return false;

    // Check if any receivers are stacked (aligned vertically)
    for (let i = 0; i < receivers.length - 1; i++) {
      for (let j = i + 1; j < receivers.length; j++) {
        const xDiff = Math.abs(receivers[i].position.x - receivers[j].position.x);
        const yDiff = Math.abs(receivers[i].position.y - receivers[j].position.y);

        if (xDiff < this.STACK_THRESHOLD && yDiff > 2) {
          return true;
        }
      }
    }

    return false;
  }

  private isIFormation(players: Player[]): boolean {
    const backs = players.filter(p => p.playerType === 'RB' || p.playerType === 'FB');
    if (backs.length !== 2) return false;

    // Check if backs are aligned vertically
    const xDiff = Math.abs(backs[0].position.x - backs[1].position.x);
    const yDiff = Math.abs(backs[0].position.y - backs[1].position.y);

    return xDiff < 2 && yDiff > 3;
  }

  private isStrongFormation(players: Player[]): boolean {
    const te = players.find(p => p.playerType === 'TE');
    const rb = players.find(p => p.playerType === 'RB');

    if (!te || !rb) return false;

    // Check if TE and RB are on same side
    const teSide = te.position.x < this.FIELD_CENTER ? 'left' : 'right';
    const rbSide = rb.position.x < this.FIELD_CENTER ? 'left' : 'right';

    return teSide === rbSide;
  }

  private findWidestReceivers(receivers: Player[]): { left: string | null; right: string | null } {
    let leftmost: Player | null = null;
    let rightmost: Player | null = null;

    for (const receiver of receivers) {
      if (!leftmost || receiver.position.x < leftmost.position.x) {
        leftmost = receiver;
      }
      if (!rightmost || receiver.position.x > rightmost.position.x) {
        rightmost = receiver;
      }
    }

    return {
      left: leftmost?.id || null,
      right: rightmost?.id || null
    };
  }

  private identifySlotReceivers(receivers: Player[]): string[] {
    const slots: string[] = [];

    for (const receiver of receivers) {
      // Slot receivers are typically aligned between numbers and hash marks
      const isSlot = receiver.position.x > 9 && receiver.position.x < 44.33 && // Between numbers
                     Math.abs(receiver.position.x - this.FIELD_CENTER) < 10; // Near center

      if (isSlot) {
        slots.push(receiver.id);
      }
    }

    return slots;
  }

  private getBackfieldPlayers(players: Player[]): string[] {
    return players
      .filter(p =>
        p.team === 'offense' &&
        p.position.y < -3 && // Behind QB position
        p.playerType !== 'QB'
      )
      .map(p => p.id);
  }

  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
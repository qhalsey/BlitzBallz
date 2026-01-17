import { Brick, Pickup, PickupType } from '../types';
import {
  GRID_COLS,
  GRID_ROWS,
  MIN_BRICKS_PER_ROW,
  MAX_BRICKS_PER_ROW,
  BRICK_HIT_VARIANCE,
  MULTIPLIER_SPAWN_INTERVALS,
} from '../constants';

export class GridManager {
  private nextBrickId = 0;
  private nextPickupId = 0;

  createBrick(gridX: number, gridY: number, hits: number): Brick {
    return {
      id: this.nextBrickId++,
      gridX,
      gridY,
      hits,
      destroying: false,
      destroyProgress: 0,
    };
  }

  createPickup(gridX: number, gridY: number, type: PickupType): Pickup {
    return {
      id: this.nextPickupId++,
      gridX,
      gridY,
      type,
      collected: false,
      collectProgress: 0,
    };
  }

  spawnNewRow(ballCount: number, _existingBricks: Brick[], _existingPickups: Pickup[], level: number = 1): { bricks: Brick[]; pickups: Pickup[] } {
    const newBricks: Brick[] = [];
    const newPickups: Pickup[] = [];

    // Determine available columns (not already occupied in row 2)
    const occupiedColumns = new Set<number>();

    // Get random number of bricks (3-5)
    const numBricks = MIN_BRICKS_PER_ROW + Math.floor(Math.random() * (MAX_BRICKS_PER_ROW - MIN_BRICKS_PER_ROW + 1));

    // Pick random columns for bricks
    const availableColumns = Array.from({ length: GRID_COLS }, (_, i) => i);
    this.shuffleArray(availableColumns);

    const brickColumns = availableColumns.slice(0, numBricks);
    brickColumns.forEach((col) => occupiedColumns.add(col));

    // Create bricks - hits based on ball count (1:1 ratio)
    // Spawn at row 2 to leave top 2 rows empty for bouncing
    for (const col of brickColumns) {
      const baseHits = Math.max(1, ballCount);
      const variance = Math.floor(baseHits * BRICK_HIT_VARIANCE);
      const hits = Math.max(1, baseHits + Math.floor(Math.random() * (variance * 2 + 1)) - variance);

      newBricks.push(this.createBrick(col, 2, hits));
    }

    // Spawn pickups in remaining columns based on round-based intervals
    const remainingColumns = availableColumns.filter((col) => !occupiedColumns.has(col));
    this.shuffleArray(remainingColumns);

    // Determine which pickups should spawn this round
    const pickupsToSpawn = this.getPickupsForRound(level);
    
    // Spawn each pickup in a random remaining column
    for (let i = 0; i < pickupsToSpawn.length && i < remainingColumns.length; i++) {
      newPickups.push(this.createPickup(remainingColumns[i], 2, pickupsToSpawn[i]));
    }

    return { bricks: newBricks, pickups: newPickups };
  }

  private getPickupsForRound(level: number): PickupType[] {
    const pickups: PickupType[] = [];
    
    // Always spawn 1 standard ball pickup every round
    pickups.push('ball');
    
    // Check if any multiplier should spawn based on round intervals
    const multiplierTypes: PickupType[] = ['x2', 'x3', 'x5', 'x10'];
    for (const type of multiplierTypes) {
      const interval = MULTIPLIER_SPAWN_INTERVALS[type];
      if (level % interval === 0) {
        pickups.push(type);
      }
    }
    
    return pickups;
  }

  moveBricksDown(bricks: Brick[]): void {
    for (const brick of bricks) {
      brick.gridY++;
    }
  }

  movePickupsDown(pickups: Pickup[]): void {
    for (const pickup of pickups) {
      pickup.gridY++;
    }
  }

  checkGameOver(bricks: Brick[]): boolean {
    return bricks.some((brick) => brick.gridY >= GRID_ROWS);
  }

  removeBottomPickups(pickups: Pickup[]): Pickup[] {
    return pickups.filter((pickup) => pickup.gridY < GRID_ROWS);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

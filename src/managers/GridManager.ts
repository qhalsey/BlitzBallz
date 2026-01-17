import { Brick, Pickup, PickupType } from '../types';
import {
  GRID_COLS,
  GRID_ROWS,
  MIN_BRICKS_PER_ROW,
  MAX_BRICKS_PER_ROW,
  MAX_PICKUPS_PER_ROW,
  BRICK_HIT_VARIANCE,
  PICKUP_WEIGHTS,
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

  spawnNewRow(level: number, _existingBricks: Brick[], _existingPickups: Pickup[]): { bricks: Brick[]; pickups: Pickup[] } {
    const newBricks: Brick[] = [];
    const newPickups: Pickup[] = [];

    // Determine available columns (not already occupied in row 0)
    const occupiedColumns = new Set<number>();

    // Get random number of bricks (3-5)
    const numBricks = MIN_BRICKS_PER_ROW + Math.floor(Math.random() * (MAX_BRICKS_PER_ROW - MIN_BRICKS_PER_ROW + 1));

    // Pick random columns for bricks
    const availableColumns = Array.from({ length: GRID_COLS }, (_, i) => i);
    this.shuffleArray(availableColumns);

    const brickColumns = availableColumns.slice(0, numBricks);
    brickColumns.forEach((col) => occupiedColumns.add(col));

    // Create bricks
    for (const col of brickColumns) {
      const baseHits = level;
      const variance = Math.floor(baseHits * BRICK_HIT_VARIANCE);
      const hits = Math.max(1, baseHits + Math.floor(Math.random() * (variance * 2 + 1)) - variance);

      newBricks.push(this.createBrick(col, 0, hits));
    }

    // Spawn pickups in remaining columns
    const remainingColumns = availableColumns.filter((col) => !occupiedColumns.has(col));
    this.shuffleArray(remainingColumns);

    const numPickups = Math.min(MAX_PICKUPS_PER_ROW, remainingColumns.length);
    const pickupColumns = remainingColumns.slice(0, numPickups);

    for (const col of pickupColumns) {
      // Determine pickup type based on weights
      const type = this.getRandomPickupType();
      newPickups.push(this.createPickup(col, 0, type));
    }

    return { bricks: newBricks, pickups: newPickups };
  }

  private getRandomPickupType(): PickupType {
    const totalWeight = Object.values(PICKUP_WEIGHTS).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [type, weight] of Object.entries(PICKUP_WEIGHTS)) {
      random -= weight;
      if (random <= 0) {
        return type as PickupType;
      }
    }

    return 'ball'; // Default fallback
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

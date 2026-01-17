import { PickupType } from './types';

// Grid configuration
export const GRID_COLS = 11;
export const GRID_ROWS = 11;
export const GRID_GAP = 2;

// Ball configuration
export const BASE_BALL_RADIUS = 8;
export const BALL_SPEED = 600; // pixels per second at base resolution
export const BALL_LAUNCH_DELAY = 50; // ms between ball launches
export const MIN_LAUNCH_ANGLE = 10; // degrees from horizontal

// Physics
export const GRAVITY = 0; // No gravity in this game

// Trajectory preview
export const MAX_TRAJECTORY_BOUNCES = 4;
export const TRAJECTORY_DASH_LENGTH = 10;
export const TRAJECTORY_GAP_LENGTH = 5;
export const TRAJECTORY_LINE_WIDTH = 2;
export const TRAJECTORY_BOUNCE_RADIUS = 4;

// Brick spawning
export const MIN_BRICKS_PER_ROW = 3;
export const MAX_BRICKS_PER_ROW = 5;
export const BRICK_HIT_VARIANCE = 0.2; // ±20%

// Pickup configuration
export const MAX_PICKUPS_PER_ROW = 2;
export const PICKUP_RADIUS = 12;

// Pickup spawn weights (relative to standard +1)
export const PICKUP_WEIGHTS: Record<PickupType, number> = {
  ball: 1.0,
  x2: 0,
  x3: 0,
  x5: 0,
  x10: 0,
};

// Multiplier spawn intervals (spawn every N rounds)
export const MULTIPLIER_SPAWN_INTERVALS: Record<PickupType, number> = {
  ball: 1,   // Always spawns
  x2: 10,   // Every 10 rounds
  x3: 15,   // Every 15 rounds
  x5: 20,   // Every 20 rounds
  x10: 50,  // Every 50 rounds
};

export const PICKUP_VALUES: Record<PickupType, number> = {
  ball: 1,
  x2: 2,
  x3: 3,
  x5: 5,
  x10: 10,
};

export const PICKUP_COLORS: Record<PickupType, string> = {
  ball: '#ffffff',
  x2: '#22c55e',
  x3: '#3b82f6',
  x5: '#a855f7',
  x10: '#eab308',
};

// Animation
export const BRICK_MOVE_DURATION = 200; // ms
export const DESTROY_ANIMATION_DURATION = 50; // ms - quick fade
export const COLLECT_ANIMATION_DURATION = 300; // ms

// Colors
export const COLORS = {
  background: '#1a1a2e',
  gridBackground: '#16213e',
  ball: '#ffffff',
  ballGlow: 'rgba(255, 255, 255, 0.3)',
  trajectoryLine: 'rgba(255, 255, 255, 0.6)',
  launchPoint: '#4ade80',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  brickLow: '#22c55e',
  brickMid: '#eab308',
  brickHigh: '#ef4444',
  buttonPrimary: '#3b82f6',
  buttonHover: '#2563eb',
  overlay: 'rgba(0, 0, 0, 0.7)',
  easyBadge: '#f59e0b',
};

// UI
export const HEADER_HEIGHT_RATIO = 0.08;
export const LAUNCH_ZONE_RATIO = 0.1;

// Storage keys
export const STORAGE_KEYS = {
  highScores: 'ballblitz_highscores',
  settings: 'ballblitz_settings',
};

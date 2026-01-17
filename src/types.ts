export interface Vector2 {
  x: number;
  y: number;
}

export interface Ball {
  id: number;
  position: Vector2;
  velocity: Vector2;
  active: boolean;
}

export interface Brick {
  id: number;
  gridX: number;
  gridY: number;
  hits: number;
  destroying: boolean;
  destroyProgress: number;
}

export type PickupType = 'ball' | 'x2' | 'x3' | 'x5' | 'x10';

export interface Pickup {
  id: number;
  gridX: number;
  gridY: number;
  type: PickupType;
  collected: boolean;
  collectProgress: number;
}

export interface CollectEffect {
  x: number;
  y: number;
  text: string;
  progress: number;
  color: string;
}

export type GameState = 'menu' | 'aiming' | 'launching' | 'animating' | 'paused' | 'gameOver' | 'settings';

export type SpeedMultiplier = 1 | 2 | 4;

export interface GameSettings {
  easyMode: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface HighScores {
  normal: number;
  easy: number;
}

export interface TrajectoryPoint {
  position: Vector2;
  isBounce: boolean;
}

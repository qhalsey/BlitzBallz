# BlitzBallz TODO List

## Bug Fixes

- [ ] **Physics Issues** - Fix weird bounces and physics-breaking behavior
  - Some bounces behave unexpectedly
  - Some bounces break physics entirely

- [ ] **Bottom Bar Visual Mismatch** - Fix the launch zone visual boundary
  - Balls visually pass through the bottom bar when they hit the bottom
  - The visible line doesn't match where the ball actually stops/starts
  - Intended behavior: balls should stop at the visible line

## Game Balance Changes

- [ ] **Remove Top Row** - Reduce grid height by one row (too tall currently)

- [ ] **Fix Multiplier Ball Logic** - Multiplier balls should multiply total user balls, not just the round's new balls

## New Feature: Multiplier Spawn Rate System

- [ ] **Implement array-based spawn rate system for multiplier balls**
  
  Each multiplier type has an array that determines spawn probability:
  
  | Multiplier | Array Length | Contains |
  |------------|--------------|----------|
  | 2x Ball    | 20           | 19× (-1), 1× (+1) |
  | 3x Ball    | 30           | 29× (-1), 1× (+1) |
  | 5x Ball    | 50           | 49× (-1), 1× (+1) |
  | 10x Ball   | 100          | 99× (-1), 1× (+1) |
  
  **Spawn Logic:**
  1. When rendering new rows, randomly pick an index from each array
  2. If picked index is **+1** → spawn that multiplier ball, reset the array
  3. If picked index is **-1** → don't spawn, remove that index from array (odds increase over time)

import Phaser from 'phaser';

/**
 * Collision detection utilities for the Neumont Virtual Campus
 */

/**
 * Check if two rectangles are overlapping
 */
export const checkRectangleOverlap = (
  rect1: Phaser.Geom.Rectangle,
  rect2: Phaser.Geom.Rectangle
): boolean => {
  return Phaser.Geom.Intersects.RectangleToRectangle(rect1, rect2);
};

/**
 * Calculate distance between two points
 */
export const getDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Phaser.Math.Distance.Between(x1, y1, x2, y2);
};

/**
 * Check if a point is within a radius of another point
 */
export const isWithinRadius = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
): boolean => {
  return getDistance(x1, y1, x2, y2) <= radius;
};

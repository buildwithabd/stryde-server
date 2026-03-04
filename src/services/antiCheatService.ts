import {
  ACTIVITY_CONFIG,
  type ActivityType,
} from "../config/activityConfig.js";
import { type ICoordinate } from "../models/Walk.js";

interface ValidationResult {
  valid: boolean;
  reason?: string;
  spoofingScore: number; // 0-100, higher = more suspicious
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateWalk(
  activityType: ActivityType,
  coordinates: ICoordinate[],
  duration: number,
  distance: number,
  steps: number,
): ValidationResult {
  const config = ACTIVITY_CONFIG[activityType];
  let spoofingScore = 0;

  // Check 1: Minimum coordinates
  if (coordinates.length < 2) {
    return { valid: false, reason: "Not enough GPS data", spoofingScore: 100 };
  }

  // Check 2: Minimum duration
  if (duration < config.minDurationSeconds) {
    return {
      valid: false,
      reason: `Minimum duration is ${config.minDurationSeconds / 60} minutes`,
      spoofingScore: 0,
    };
  }

  // Check 3: Minimum distance
  if (distance < config.minDistanceMeters) {
    return {
      valid: false,
      reason: `Minimum distance is ${config.minDistanceMeters}m`,
      spoofingScore: 0,
    };
  }

  // Check 4: Speed check between each GPS point
  const maxSpeedMs = (config.maxSpeedKmh * 1000) / 3600;
  let speedViolations = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1]!;
    const curr = coordinates[i]!;

    const dist = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );
    const timeDiff = (curr!.timestamp - prev!.timestamp) / 1000;

    if (timeDiff <= 0) continue;

    const speed = dist / timeDiff;

    if (speed > maxSpeedMs * 1.2) {
      // 20% tolerance
      speedViolations++;
      spoofingScore += 20;
    }
  }

  if (speedViolations > 3) {
    return {
      valid: false,
      reason: `Speed exceeded limit for ${activityType} too many times`,
      spoofingScore: Math.min(spoofingScore, 100),
    };
  }

  // Check 5: Distance consistency
  // Recalculate distance from coordinates and compare
  let calculatedDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    calculatedDistance += calculateDistance(
      coordinates[i - 1]!.latitude,
      coordinates[i - 1]!.longitude,
      coordinates[i]!.latitude,
      coordinates[i]!.longitude,
    );
  }

  const distanceDiff = Math.abs(calculatedDistance - distance);
  const distanceTolerance = distance * 0.1; // 10% tolerance

  if (distanceDiff > distanceTolerance) {
    spoofingScore += 30;
  }

  // Check 6: Steps vs distance consistency
  if (config.trackSteps && steps > 0) {
    const distanceKm = distance / 1000;
    const expectedSteps = distanceKm * 1300; // ~1300 steps per km average
    const stepsDiff = Math.abs(steps - expectedSteps);
    const stepsTolerance = expectedSteps * 0.5; // 50% tolerance

    if (stepsDiff > stepsTolerance) {
      spoofingScore += 20;
    }
  }

  // Check 7: GPS points too uniform (fake GPS)
  // Real GPS has slight variations, fake GPS is often too perfect
  let uniformPoints = 0;
  for (let i = 2; i < coordinates.length; i++) {
    const dist1 = calculateDistance(
      coordinates[i - 2]!.latitude,
      coordinates[i - 2]!.longitude,
      coordinates[i - 1]!.latitude,
      coordinates[i - 1]!.longitude,
    );
    const dist2 = calculateDistance(
      coordinates[i - 1]!.latitude,
      coordinates[i - 1]!.longitude,
      coordinates[i]!.latitude,
      coordinates[i]!.longitude,
    );
    if (Math.abs(dist1 - dist2) < 0.01) uniformPoints++;
  }

  if (uniformPoints > coordinates.length * 0.8) {
    spoofingScore += 30; // too uniform = suspicious
  }

  return {
    valid: spoofingScore < 60,
    reason: spoofingScore >= 60 ? "Activity flagged as suspicious" : "",
    spoofingScore,
  };
}

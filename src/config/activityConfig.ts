export type ActivityType = "walk" | "run" | "hike" | "ride";

export interface ActivityConfig {
  label: string;
  maxSpeedKmh: number;
  tokenMultiplier: number;
  trackSteps: boolean;
  trackElevation: boolean;
  minDurationSeconds: number;
  minDistanceMeters: number;
  caloriesPerKm: number;
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
  walk: {
    label: "Walk",
    maxSpeedKmh: 10,
    tokenMultiplier: 1.0,
    trackSteps: true,
    trackElevation: false,
    minDurationSeconds: 60, // 5 minutes
    minDistanceMeters: 100, // 200 meters
    caloriesPerKm: 65,
  },
  run: {
    label: "Run",
    maxSpeedKmh: 35,
    tokenMultiplier: 1.5,
    trackSteps: true,
    trackElevation: false,
    minDurationSeconds: 180, // 3 minutes
    minDistanceMeters: 500,
    caloriesPerKm: 80,
  },
  hike: {
    label: "Hike",
    maxSpeedKmh: 15,
    tokenMultiplier: 1.8,
    trackSteps: true,
    trackElevation: true,
    minDurationSeconds: 600, // 10 minutes
    minDistanceMeters: 1000,
    caloriesPerKm: 75,
  },
  ride: {
    label: "Ride",
    maxSpeedKmh: 60,
    tokenMultiplier: 0.8,
    trackSteps: false,
    trackElevation: true,
    minDurationSeconds: 300,
    minDistanceMeters: 1000,
    caloriesPerKm: 40,
  },
};

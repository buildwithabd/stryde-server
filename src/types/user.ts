export interface IUser {
  // Profile - required
  walletAddress: string
  username: string
  displayName: string
  avatarUrl: string
  bio: string

  // Profile - optional
  email?: string
  phone?: string
  fullName?: string
  heightCm?: number
  weightKg?: number
  gender?: 'male' | 'female' | 'non-binary' | 'prefer_not_to_say'
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'

  // Location
  location: {
    type: 'Point'
    coordinates: [number, number]
    city?: string
    country?: string
  }

  // Auth
  refreshToken?: string

  // Wallet & Solana
  walletConnectedAt?: Date
  skrIdentityAddress?: string
  tokenBalance: number
  lifetimeTokensEarned: number
  lifetimeTokensSpent: number

  // Walk stats
  stats: {
    totalWalks: number
    totalSteps: number
    totalDistanceMeters: number
    totalCalories: number
    totalDurationSeconds: number
    currentStreak: number
    longestStreak: number
    lastWalkDate?: Date
  }

  // Social
  followersCount: number
  followingCount: number

  // Reputation
  reputationScore: number
  spoofingFlags: number
  isBanned: boolean
  banReason?: string

  // Challenges
  challengeStats: {
    wins: number
    losses: number
    totalStaked: number
    totalWon: number
  }

  // Achievements
  achievements: Array<{
    achievementId: string
    name: string
    unlockedAt: Date
  }>

  // Notifications
  pushToken?: string
  notificationPrefs: {
    challenges: boolean
    rewards: boolean
    leaderboard: boolean
    marketing: boolean
  }

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Public profile returned to clients
export type PublicProfile = Pick<
  IUser,
  | 'walletAddress'
  | 'username'
  | 'displayName'
  | 'avatarUrl'
  | 'bio'
  | 'reputationScore'
  | 'tokenBalance'
  | 'stats'
  | 'achievements'
  | 'challengeStats'
  | 'followersCount'
  | 'followingCount'
  | 'createdAt'
> & { id: string }

// Input when creating a new user (wallet connect + profile setup)
export type CreateUserInput = Pick<
  IUser,
  'walletAddress' | 'username' | 'displayName' | 'avatarUrl' | 'bio'
>

// Input when updating profile
export type UpdateUserInput = Partial<
  Pick<
    IUser,
    | 'username'
    | 'displayName'
    | 'avatarUrl'
    | 'bio'
    | 'email'
    | 'phone'
    | 'fullName'
    | 'heightCm'
    | 'weightKg'
    | 'gender'
    | 'fitnessLevel'
  >
>
// Types for the IRB Home V1 sports platform
// Respects the hierarchy: Year -> Season -> Championship -> Championship Edition -> Stage -> Session
// Uses official terminology: Driver (not pilot/piloto in the public IRB Home), Team, Stage, Session, IRB_ID

export type SessionType = 'Practice' | 'Qualifying' | 'Warmup' | 'Race' | 'Sprint'

export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface HomePriorityAlert {
  id: string
  type: 'payment' | 'team_invite' | 'protest_decision' | 'session_change' | 'critical'
  title: string
  description: string
  actionLabel: string
  actionUrl: string
  isDismissible?: boolean
}

export interface HomeLiveSession {
  id: string
  championshipName: string
  editionName: string
  stageNumber: number
  stageName: string
  sessionType: SessionType
  sessionName: string
  trackName: string
  trackCountryCode: string
  lapsTotal?: number
  currentLap?: number
  timeRemaining?: string
  leaderDriverName: string
  leaderCarNumber: string
  leaderTeamName: string
  gapToSecond?: string
  streamUrl?: string
  timingUrl?: string
  spectateUrl?: string
  isMajor: boolean
}

export interface HomeNextRace {
  id: string
  championshipId: string
  championshipName: string
  editionName: string
  stageNumber: number
  stageName: string
  sessionType: SessionType
  trackName: string
  trackCountryCode: string
  trackImageUrl?: string
  startTime: string // ISO string or display string
  dateFormatted: string
  timeFormatted: string
  relativeTime: string // e.g. "Hoje · 21:00", "Amanhã · 20:00", "18 SET · 21:00"
  totalRegistered: number
  driverRegistered?: boolean
  driverCarNumber?: string
  driverTeamName?: string
  driverCarModel?: string
  simPlatform: string // e.g. "iRacing" (stored agnostic)
}

export interface HomeDriverSummary {
  irbId: string
  name: string
  slug: string
  avatarUrl: string
  teamName: string
  teamSlug: string
  carNumber: string
  primaryChampionship: {
    name: string
    position: number
    points: number
    trend: 'up' | 'down' | 'same'
  }
  nextRaceTime: string
  activeChampionshipsCount: number
  recentPodiumsCount: number
  pendingActionCount: number
}

export interface DriverStandingEntry {
  position: number
  previousPosition?: number
  driverId: string
  driverName: string
  irbId: string
  avatarUrl?: string
  teamName: string
  carNumber: string
  points: number
  wins: number
  podiums: number
}

export interface TeamStandingEntry {
  position: number
  previousPosition?: number
  teamId: string
  teamName: string
  slug: string
  logoUrl?: string
  points: number
  drivers: string[]
  wins: number
}

export interface PodiumDriver {
  position: 1 | 2 | 3
  driverName: string
  irbId: string
  teamName: string
  carNumber: string
  timeOrGap: string
  carModel?: string
}

export interface HomeLatestResult {
  id: string
  championshipId: string
  championshipName: string
  editionName: string
  stageNumber: number
  stageName: string
  sessionType: SessionType
  trackName: string
  completedDate: string
  status: 'official' // Official IRB sports result
  isOfficial: true
  fastestLap?: {
    driverName: string
    lapTime: string
  }
  podium: PodiumDriver[]
  fullResultsUrl: string
}

export interface HomeUpcomingRaceItem {
  id: string
  championshipName: string
  sessionType: SessionType
  trackName: string
  dateFormatted: string
  timeFormatted: string
  spotsRemaining?: number
  simPlatform: string
}

export interface HomeChampionshipCard {
  id: string
  name: string
  editionName: string
  category: 'GT' | 'Formula' | 'Endurance' | 'Touring' | 'Stock'
  status: 'Inscrições Abertas' | 'Em Andamento' | 'Fase Final' | 'Encerrado'
  nextRaceDate: string
  trackNextRace: string
  gridSize: number
  maxGrid: number
  bannerUrl: string
  logoUrl?: string
  featured: boolean
}

export interface HomeHistoricalResultItem {
  id: string
  championshipName: string
  editionName: string
  sessionType: SessionType
  stageName: string
  trackName: string
  winnerName: string
  winnerTeam: string
  dateFormatted: string
}

export interface HomeContentItem {
  id: string
  type: 'news' | 'video' | 'interview' | 'driver_spotlight' | 'team_spotlight'
  title: string
  subtitle: string
  category: string
  readingTimeOrDuration: string
  imageUrl: string
  publishedAt: string
  url: string
  featured?: boolean
}

export interface HomeExploreItem {
  id: string
  label: string
  description: string
  count?: string
  iconName: string
  path: string
  badge?: string
}

export type HomeViewStatus = 'idle' | 'loading' | 'error'

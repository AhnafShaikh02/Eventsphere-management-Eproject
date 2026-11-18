export type UserRole = 'admin' | 'exhibitor' | 'attendee';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  title?: string;
  phone?: string;
  gdprConsent: boolean;
  analyticsTelemetry?: boolean;
  marketingEmails?: boolean;
  consentUpdatedAt?: string;
  createdAt: string;
}

export interface AdminMonitoringSummary {
  service: string;
  encryptionAtRest: string;
  concurrentUsers: number;
  uptimeSeconds: number;
  totalApiRequests: number;
  totalApiErrors: number;
  errorRatePct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  memoryRssMb: number;
  heapUsedMb: number;
  backupFiles: string[];
  database: {
    mode: string;
    connected: boolean;
    database: string | null;
    lastSyncedAt: string | null;
  };
  smtp: {
    configured: boolean;
  };
}

export type ExpoStatus = 'upcoming' | 'live' | 'completed';

export interface ExpoEvent {
  id: string;
  title: string;
  date: string;
  endDate: string;
  location: string;
  description: string;
  theme: string;
  category: string;
  status: ExpoStatus;
  capacity?: number;
  bannerAccent: string;
  registeredUserIds: string[];
}

export type BoothStatus = 'available' | 'reserved' | 'occupied' | 'pending';

export interface ExpoBooth {
  id: string;
  expoId: string;
  number: string;
  zone: string;
  size: '3x3m Standard' | '6x3m Corner' | '6x6m Island';
  priceUsd: number;
  status: BoothStatus;
  row: number;
  col: number;
  exhibitorId: string | null;
  exhibitorName: string | null;
  trafficCount: number;
}

export interface ExhibitorProfile {
  id: string;
  userId: string;
  companyName: string;
  category:
    | 'Robotics & AI'
    | 'Clean Energy'
    | 'Cloud & Security'
    | 'Spatial Computing'
    | 'Biotech & MedTech';
  tagline: string;
  description: string;
  logoColor: string;
  logoUrl?: string;
  contactEmail: string;
  phone?: string;
  website: string;
  products: string[];
  staff: string[];
  documents?: string[];
  profileViews: number;
}

export interface ExhibitorApplication {
  id: string;
  expoId: string;
  exhibitorId: string;
  companyName: string;
  category: ExhibitorProfile['category'];
  productsSummary: string;
  documents: string[];
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  rejectionReason?: string;
  reviewerNote?: string;
  submittedAt: string;
}

export interface EventRegistration {
  id: string;
  expoId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ticketCode: string;
  status: 'confirmed' | 'cancelled';
  registeredAt: string;
}

export interface ExpoSession {
  id: string;
  expoId: string;
  title: string;
  speaker: string;
  speakerRole: string;
  topic: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  registeredUserIds: string[];
  bookmarkedUserIds: string[];
  updatedAt: string;
}

export interface SpeakerRecord {
  id: string;
  expoId: string;
  name: string;
  role: string;
  company: string;
  topic: string;
  bio: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientChannel: string;
  recipientLabel: string;
  body: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  targetUserId: string | 'all';
  title: string;
  message: string;
  kind: 'schedule' | 'booth' | 'application' | 'reminder' | 'system';
  readBy: string[];
  createdAt: string;
}

export interface FeedbackEntry {
  id: string;
  userId: string;
  userName: string;
  category: 'Suggestion' | 'Technical Issue' | 'Booth Inquiry';
  message: string;
  createdAt: string;
  status: 'open' | 'resolved';
}

export interface ActivityLogEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface DailyAnalyticsPoint {
  date: string;
  boothTraffic: number;
  sessionBookmarks: number;
  profileViews: number;
}

export interface AdminAttendeeRow {
  id: string;
  name: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
  createdAt: string;
  registeredExpoIds: string[];
  bookmarkedSessionCount: number;
}

export interface EventSphereSnapshot {
  expos: ExpoEvent[];
  booths: ExpoBooth[];
  exhibitors: ExhibitorProfile[];
  applications: ExhibitorApplication[];
  registrations: EventRegistration[];
  sessions: ExpoSession[];
  speakers: SpeakerRecord[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  feedback: FeedbackEntry[];
  activityLogs: ActivityLogEntry[];
  analyticsSeries: DailyAnalyticsPoint[];
  concurrentUsers: number;
}

export type VenueWeatherConditionCategory =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export interface VenueWeatherData {
  locationQuery: string;
  resolvedCity: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  precipitationMm: number;
  weatherCode: number;
  conditionLabel: string;
  conditionCategory: VenueWeatherConditionCategory;
  isDay: boolean;
  highC: number | null;
  lowC: number | null;
  observedAt: string;
  fetchedAt: string;
  source: string;
}


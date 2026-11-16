export type UserRole = 'admin' | 'exhibitor' | 'attendee';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  title?: string;
  gdprConsent: boolean;
  createdAt: string;
}

export interface ExpoEvent {
  id: string;
  title: string;
  date: string;
  endDate: string;
  location: string;
  description: string;
  theme: string;
  bannerAccent: string;
  registeredUserIds: string[];
}

export type BoothStatus = 'available' | 'reserved' | 'pending';

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
  category: 'Robotics & AI' | 'Clean Energy' | 'Cloud & Security' | 'Spatial Computing' | 'Biotech & MedTech';
  tagline: string;
  description: string;
  logoColor: string;
  contactEmail: string;
  website: string;
  products: string[];
  staff: string[];
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
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
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

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientChannel: string; // e.g., 'organizer' or exhibitorId or 'hall-general'
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

export interface EventSphereSnapshot {
  expos: ExpoEvent[];
  booths: ExpoBooth[];
  exhibitors: ExhibitorProfile[];
  applications: ExhibitorApplication[];
  sessions: ExpoSession[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  feedback: FeedbackEntry[];
  activityLogs: ActivityLogEntry[];
  analyticsSeries: DailyAnalyticsPoint[];
  concurrentUsers: number;
}

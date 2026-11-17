export type UserRole = 'admin' | 'exhibitor' | 'attendee';
export type BoothStatus = 'available' | 'reserved' | 'occupied' | 'pending';
export type ExpoStatus = 'upcoming' | 'live' | 'completed';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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

export interface ResetTokenRecord {
  id: string;
  userId: string;
  email: string;
  otpHash: string;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  resetSessionHash: string | null;
  resetSessionExpiresAt: number | null;
  used: boolean;
  createdAt: number;
}

export interface SyncRecord {
  syncKey: string;
  updatedAt: string;
  deviceLabel: string;
  checksum: string;
  payload: Record<string, unknown>;
}

export interface ServerDatabase {
  users: StoredUser[];
  resetTokens: ResetTokenRecord[];
  expos: Array<{
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
  }>;
  booths: Array<{
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
  }>;
  exhibitors: Array<{
    id: string;
    userId: string;
    companyName: string;
    category: 'Robotics & AI' | 'Clean Energy' | 'Cloud & Security' | 'Spatial Computing' | 'Biotech & MedTech';
    tagline: string;
    description: string;
    logoColor: string;
    contactEmail: string;
    phone?: string;
    website: string;
    products: string[];
    staff: string[];
    documents?: string[];
    profileViews: number;
  }>;
  applications: Array<{
    id: string;
    expoId: string;
    exhibitorId: string;
    companyName: string;
    category: 'Robotics & AI' | 'Clean Energy' | 'Cloud & Security' | 'Spatial Computing' | 'Biotech & MedTech';
    productsSummary: string;
    documents: string[];
    status: 'pending' | 'approved' | 'rejected' | 'info_requested';
    rejectionReason?: string;
    reviewerNote?: string;
    submittedAt: string;
  }>;
  registrations: Array<{
    id: string;
    expoId: string;
    userId: string;
    userName: string;
    userEmail: string;
    ticketCode: string;
    status: 'confirmed' | 'cancelled';
    registeredAt: string;
  }>;
  sessions: Array<{
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
  }>;
  speakers: Array<{
    id: string;
    expoId: string;
    name: string;
    role: string;
    company: string;
    topic: string;
    bio: string;
  }>;
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    recipientChannel: string;
    recipientLabel: string;
    body: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    targetUserId: string;
    title: string;
    message: string;
    kind: 'schedule' | 'booth' | 'application' | 'reminder' | 'system';
    readBy: string[];
    createdAt: string;
  }>;
  feedback: Array<{
    id: string;
    userId: string;
    userName: string;
    category: 'Suggestion' | 'Technical Issue' | 'Booth Inquiry';
    message: string;
    createdAt: string;
    status: 'open' | 'resolved';
  }>;
  activityLogs: Array<{
    id: string;
    actor: string;
    action: string;
    detail: string;
    timestamp: string;
  }>;
  analyticsSeries: Array<{
    date: string;
    boothTraffic: number;
    sessionBookmarks: number;
    profileViews: number;
  }>;
}

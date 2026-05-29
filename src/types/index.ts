// ============================================================
// Domain Models
// ============================================================

export type BookingStatus = 'confirmed' | 'checked in' | 'pending' | 'completed';
export type Channel = 'Airbnb' | 'Booking.com' | 'Naver' | 'Direct';
export type Nationality = 'Korea' | 'Taiwan' | 'Singapore' | 'China' | 'Japan' | 'Others' | string;
export type Currency = 'KRW' | 'USD' | 'EUR';
export type Language = 'ko' | 'en';

export interface Booking {
  id: string;
  propertyId?: string;
  guestName: string;
  checkIn: string;       // ISO date string YYYY-MM-DD
  checkOut: string;
  bookingDate?: string;
  guests: number;
  infants: number;
  nationality: Nationality;
  channel: Channel;
  status: BookingStatus;
  amount: number;
  commission: number;
  // iCal 동기화 필드
  externalId?: string;
  isAutoSynced?: boolean;
  rawIcalSummary?: string;
  memo?: string;
}

// ============================================================
// iCal Sync Models
// ============================================================

export interface SyncChannel {
  id: string;
  hostId: string;
  propertyId: string;
  channel: Channel;
  icalUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  hostId: string;
  channelId: string | null;
  syncedAt: string;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  error: string | null;
}

export interface SyncNotification {
  id: string;
  hostId: string;
  bookingId: string | null;
  guestName: string;
  checkIn: string;
  checkOut: string;
  channel: Channel;
  missingFields: string[];   // 'amount' | 'guests' | 'nationality'
  isRead: boolean;
  createdAt: string;
}

export interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  status: string;
  description?: string;
}

export interface Property {
  id: string;
  name: string;
  color?: string;
  baseGuests: number;
  basePrice: number;
  weekendPrice: number;
  extraGuestFee: number;
  noExtraGuestFee: boolean;
  checkInTime: string;
  checkOutTime: string;
  cleaningFee: number;
}

export interface Maintenance {
  id: string;
  propertyId?: string;
  startDate: string;
  endDate: string;
  label: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface Settings {
  notifications: boolean;
  language: Language;
  currency: Currency;
  profileName: string;
  profileRole: string;
  propertyName: string;
  plan?: string;
  eventColorMode?: 'channel' | 'property';
}

// ============================================================
// Store
// ============================================================

export interface StoreState {
  // Calendar
  currentYear: number;
  currentMonth: number;

  // Auth
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  authLoading: boolean;

  // Data
  properties: Property[];
  bookings: Booking[];
  maintenance: Maintenance[];

  // Modal state
  selectedDate: string | null;
  selectedBookingId: string | null;
  selectedMaintDate: string | null;
  selectedMaintenanceId: string | null;

  // Settings
  settings: Settings;

  // Actions
  initAuth: () => void;
  login: (email: string, password: string) => Promise<unknown>;
  signup: (email: string, password: string, name: string) => Promise<unknown>;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  logout: () => Promise<void>;

  setMonth: (year: number, month: number) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  goToday: () => void;

  fetchData: () => Promise<void>;
  migrateData: () => Promise<void>;

  updateProperty: (propId: string, pd: Partial<Property>) => Promise<void>;
  addProperty: (data: Omit<Property, 'id'>) => Promise<void>;
  deleteProperty: (propId: string) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => Promise<void>;
  updateBooking: (id: string, patch: Partial<Booking>) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;

  addMaintenance: (m: Omit<Maintenance, 'id'>) => Promise<void>;
  updateMaintenance: (id: string, patch: Partial<Maintenance>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  openDayModal: (dateStr: string) => void;
  closeDayModal: () => void;
  openBookingModal: (id: string) => void;
  closeBookingModal: () => void;
  openMaintModal: (dateStr: string) => void;
  openEditMaintModal: (id: string) => void;
  closeMaintModal: () => void;

  updateSettings: (patch: Partial<Settings>) => void;

  // Property visibility filter (null = all visible)
  visiblePropertyIds: string[] | null;
  setVisiblePropertyIds: (ids: string[] | null) => void;

  // Property display order (empty = use DB order)
  propertyOrder: string[];
  setPropertyOrder: (order: string[]) => void;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Data loading
  dataLoading: boolean;

  // iCal Sync
  syncChannels: SyncChannel[];
  syncLoading: boolean;
  lastSyncResults: { channel: string; added: number; updated: number; error?: string }[];
  fetchSyncChannels: () => Promise<void>;
  saveSyncChannel: (channel: Channel, icalUrl: string, propertyId?: string) => Promise<void>;
  deleteSyncChannel: (channelId: string) => Promise<void>;
  triggerSync: () => Promise<void>;

  // 알림 (DB 기반 — 오프라인/멀티 기기 대응)
  syncNotifications: SyncNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // 달력 셀 클릭 → 예약목록 연동
  selectedCalendarDate: string | null;
  setSelectedCalendarDate: (date: string | null) => void;
}

// ============================================================
// Analytics / Stats
// ============================================================

export interface MonthlyTrend {
  month: string;
  monthEn: string;
  year: number;
  gross: number;
  net: number;
  adr: number;
  occupancy: number;
  isCurrent: boolean;
  isFuture: boolean;
  otbOcc: number;
  otbGross: number;
  predictedOcc: number | null;
  predictedGross: number | null;
  predictedNet: number | null;
  forecastConfidence: number;
}

export interface PieDataItem {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface LeadTimeDataPoint {
  x: number;
  y: number;
  nights: number;
  channel: string;
  nationality: string;
  guests: number;
  guestName?: string;
}

export interface NatDistItem {
  name: string;
  pct: number;
}

export interface MonthlyTableRow {
  year: number;
  month: number;
  label: string;
  labelEn: string;
  sortKey: number;
  nationalityDist: NatDistItem[];
  channelDist: NatDistItem[];
  avgGuests: number;
  guestDist: NatDistItem[];
  adr: number;
  otaComm: number;
  net: number;
  gross: number;
  avgLeadTime: number;
  bookingCount: number;
  occupancy: number;
  channelPcts: Record<string, number>;
  channelTotal: number;
  adrByNationality: Record<string, number>;
  adrByChannel: Record<string, number>;
  adrByGuestCount: Record<string, number>;
}

export interface AnnualForecast {
  confirmedGross: number;
  confirmedNet: number;
  predictedGross: number;
  predictedNet: number;
  totalGross: number;
  totalNet: number;
  avgConfidence: number;
}

export interface DesktopStats {
  netIncome: number;
  grossRevenue: number;
  momNetChange: number;
  momNetPct: number;
  momGrossChange: number;
  occupancyRate: number;
  occupiedNights: number;
  totalBookings: number;
  momBookingsChange: number;
  momOccNightsChange: number;
  daysInMonth: number;
  adrThisMonth: number;
  adrYearAvg: number;
  otaCommission: number;
  otaCommPct: number;
  ytdGross: number;
  ytdNet: number;
  ytdOtaCommission: number;
  ytdOtaCommissionByChannel: Record<string, number>;
  monthlyTrends: MonthlyTrend[];
  channelPieData: PieDataItem[];
  totalChannelBookings: number;
  allTimeChannelPieData: PieDataItem[];
  nationalityPieData: PieDataItem[];
  totalNatBookings: number;
  allTimeNationalityPieData: PieDataItem[];
  allTimeTotal: number;
  leadTimeScatterData: LeadTimeDataPoint[];
  leadTimeStartX: number;
  leadTimeEndX: number;
  leadTimeNatKeys: string[];
  monthlyTableData: MonthlyTableRow[];
  currencySymbol: string;
  annualForecast: AnnualForecast;
  annualCumulativeData: {
    name: string;
    nameKo: string;
    actual: number | null;
    predicted: number | null;
    lastYear: number | null;
  }[];
}

export interface PaceTarget {
  key: string;
  offset: number;
  date: Date;
  label: string;
  isCurrent: boolean;
  revenue: number;
  profit: number;
  auc: number;
  finalOcc: number;
  daysInMonth: number;
  startMs: number;
  endMs: number;
  cutoffDay: number;
  dailyBookedNights: number[];
  dailyRevenue: number[];
}

export interface PaceDataPoint {
  leadDay: number;
  [key: string]: number | null;
}

export interface BookingPaceResult {
  paceData: PaceDataPoint[];
  targets: PaceTarget[];
  todayStr: string;
  todayOccupancyPct: number;
  todayRevenueVal: number;
  todayLeadDay: number;
}

export type InsightStatus = 'positive' | 'neutral' | 'negative';

export interface PaceInsight {
  // 1. Pace Variance: 최근 3개월 평균 대비 현재 예약 속도 차이
  paceVariancePct: number;     // 점유율 %p 차이 (예: +5.2)

  // Summary
  summaryText: string;         // 1줄 요약 (한국어)
  summaryTextEn: string;       // 1줄 요약 (영어)
  hasEnoughData: boolean;      // 데이터 충분 여부
}

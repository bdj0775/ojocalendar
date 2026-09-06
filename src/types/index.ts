// ============================================================
// Domain Models
// ============================================================

export type BookingStatus = 'confirmed' | 'checked in' | 'pending' | 'completed';
export type Channel = 'Airbnb' | 'Booking.com' | 'Naver' | 'Direct';

export interface ChannelSetting {
  id: string;
  channel: string;
  color: string;        // hex color
  commission: number;   // % (0–100)
  isBuiltIn: boolean;
}
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

// ============================================================
// Monetization (MONETIZATION_ROADMAP.md)
// ============================================================

export type SubscriptionPlan = 'legacy_free' | 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'pending' | 'expired';
export type PaymentMethod = 'manual' | 'toss';

export interface Subscription {
  id: string;
  hostId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentMethod: PaymentMethod | null;
  currentPeriodEnd: string | null;
  createdAt: string;
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
  eventColorMode?: 'channel' | 'property';
  peakSeasonStart?: string; // 'MM-DD', e.g. '07-01'
  peakSeasonEnd?: string;   // 'MM-DD', e.g. '08-15'
}

// ============================================================
// Onboarding
// ============================================================

export interface OnboardingDraft {
  profileName: string;
  language: 'ko' | 'en';
  roomNames: string[];       // 첫 번째가 대표 객실, 최대 3개
  baseGuests: number;
  basePrice: number;
  weekendPrice: number;
  extraGuestFee: number;
  cleaningFee: number;
  peakSeasonStart: string;   // 'MM-DD'
  peakSeasonEnd: string;     // 'MM-DD'
  checkInTime: string;
  checkOutTime: string;
  airbnbIcal: string;
  bookingIcal: string;
}

// ============================================================
// Bookings filter / sort types
// ============================================================

export type SortCol =
  | 'checkIn' | 'checkOut' | 'nights' | 'guestName' | 'guests'
  | 'channel' | 'amount' | 'commRate' | 'net'
  | 'adr' | 'leadTime' | 'bookingDate';

export type SortKey = 'checkIn_desc' | 'checkIn_asc' | 'amount_desc' | 'amount_asc';

export interface DesktopBookingsFilter {
  year: number | 'all';
  month: number | 'all';
  channel: Channel | 'all';
  prop: string;
  search: string;
  sortCol: SortCol;
  sortDir: 'asc' | 'desc';
}

export interface MobileBookingsFilter {
  year: number;
  channel: Channel | 'all';
  props: string[];
  search: string;
  sortKey: SortKey;
}

// ============================================================
// Store
// ============================================================

export type DesktopTab = 'dashboard' | 'bookings' | 'settings' | 'admin';

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

  // Modal state
  selectedDate: string | null;
  selectedBookingId: string | null;

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

  openDayModal: (dateStr: string) => void;
  closeDayModal: () => void;
  openBookingModal: (id: string) => void;
  closeBookingModal: () => void;

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

  // 데스크탑 활성 탭 (remount 후에도 유지)
  activeDesktopTab: DesktopTab;
  setActiveDesktopTab: (tab: DesktopTab) => void;

  // 예약목록 필터 (remount / 탭 전환 / 페이지 새로고침 후에도 유지)
  desktopBookingsFilter: DesktopBookingsFilter;
  setDesktopBookingsFilter: (patch: Partial<DesktopBookingsFilter>) => void;
  mobileBookingsFilter: MobileBookingsFilter;
  setMobileBookingsFilter: (patch: Partial<MobileBookingsFilter>) => void;

  // 온보딩
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  onboardingDraft: OnboardingDraft;
  patchOnboardingDraft: (patch: Partial<OnboardingDraft>) => void;
  resetOnboarding: () => void;

  // 첫 방문 힌트 (온보딩 직후 1회 표시)
  showWelcomeHint: boolean;
  dismissWelcomeHint: () => void;

  // 회원탈퇴
  deleteAccount: () => Promise<void>;

  // 결제/구독 (MONETIZATION_ROADMAP.md)
  subscription: Subscription | null;
  monetizationEnabled: boolean;
  fetchSubscription: () => Promise<void>;
  fetchAppSettings: () => Promise<void>;

  // 대시보드/예약목록 숙소 필터
  selectedDashboardPropertyId: string | null;
  setSelectedDashboardPropertyId: (id: string | null) => void;

  // 예약채널 설정
  channelSettings: ChannelSetting[];
  addChannelSetting: (setting: Omit<ChannelSetting, 'id' | 'isBuiltIn'>) => void;
  updateChannelSetting: (id: string, patch: Partial<Pick<ChannelSetting, 'channel' | 'color' | 'commission'>>) => void;
  deleteChannelSetting: (id: string) => void;
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
  /** 최근 달들이 같은 시점 이후 월말까지 추가로 채운 평균 폭(%p). 히스토리 없으면 null (예측 설명용) */
  expectedPickup: number | null;
  /** 픽업 평균에 쓰인 히스토리 달 수 (예측 설명용) */
  histMonthsUsed: number;
  /** 이 달 시작까지 남은 일수. 이미 시작했으면 0 (예측 설명용) */
  daysUntilStart: number;
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
  /** 곡선 관측 하한 leadDay. 양수 = 달 시작 전(D-N), 음수 = 월중 경과일(D+|N|), 지난 달 = -(일수-1) */
  cutoffDay: number;
  /** 인덱스 = leadDay + 30 (D+30 ~ D-180). useBookingPace의 MAX_ELAPSED 참조 */
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
  /** 점유율 분모에 쓴 객실 수 (useDesktopStats와 동일 규칙) */
  roomCount: number;
  todayStr: string;
  todayOccupancyPct: number;
  todayRevenueVal: number;
  /** 오늘 위치의 leadDay (월중이면 음수 = D+) */
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

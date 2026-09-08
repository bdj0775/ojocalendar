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

export type DesktopTab = 'dashboard' | 'bookings' | 'pricing' | 'settings' | 'admin';

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

  // 빈방 레이더 결정 기록 (pricing_actions)
  pricingActions: PricingAction[];
  fetchPricingActions: () => Promise<void>;
  savePricingAction: (input: Omit<PricingAction, 'id' | 'hostId' | 'createdAt'>) => Promise<void>;
  deletePricingAction: (id: string) => Promise<void>;

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

// ============================================================
// 빈방 레이더 (가격 탭 · PRICING_ROADMAP.md 3~5장)
// ============================================================

/** 요일 묶음 — 일~목 밤 / 금·토·공휴일 전날 밤 */
export type RadarDowGroup = 'weekday' | 'weekend';
/** 기준 기간 — 최근 6개월 / 최근 12개월 */
export type RadarWindow = '6m' | '12m';
/**
 * 할인 검토 여부 — 여유 / 관심 / 검토 / 강력검토 / 표본 부족.
 * 기준은 50% 선 하나와 통계적 확신(Wilson 95% 구간)이다:
 *   여유 = 구간 하한이 50% 이상 (열에 다섯은 팔린다고 확신)
 *   관심 = 추정치는 50% 이상이지만 하한이 50% 미만 (아마 괜찮지만 불확실)
 *   검토 = 추정치가 50% 미만이지만 상한이 50% 이상 (아마 필요하지만 불확실)
 *   적극검토 = 구간 상한이 50% 미만이거나, 추정치가 30% 미만
 */
export type RadarAdvice = 'easy' | 'watch' | 'review' | 'strong' | 'unknown';

export interface FillCurvePoint {
  /** 남은 날수 D (0 = 당일) */
  daysBefore: number;
  /** D일 전에 비어 있던 박 중 결국 팔린 비율 (0~100). 표본 부족이면 null */
  probability: number | null;
  /** D일 전에 비어 있던 박 수 (표본) */
  n: number;
  sold: number;
  /** Wilson 95% 구간 (0~100) */
  ciLow: number | null;
  ciHigh: number | null;
  /** 팔린 밤들 (금액 있는 것만): 날짜 · 1박 단가 · 최종 예약일(D-n) · 그 달 보통 단가 · 대비 % */
  soldSamples: SoldNightSample[];
}

export interface SoldNightSample {
  date: string;
  dow: number;
  /** 같은 예약의 밤들을 묶기 위한 예약 id */
  bookingId: string;
  adr: number;
  /** 며칠 전에 예약됐나 (0 = 당일) */
  lead: number;
  monthMedian: number | null;
  pct: number | null;
}

export interface FillCurve {
  group: RadarDowGroup;
  window: RadarWindow;
  /** D = 0..21 모든 정수 */
  points: FillCurvePoint[];
  /** 팔릴 가능성이 처음 50% 아래로 떨어지는 D. null = 당일까지 50% 위 */
  decisionDay: number | null;
  /** 이 곡선에 들어간 밤 수 (전체) */
  totalNights: number;
}

export interface RadarRow {
  date: string;              // YYYY-MM-DD
  dow: number;               // 0=일
  daysBefore: number;        // 오늘 = 0
  propertyId: string | null;
  propertyName: string;
  group: RadarDowGroup;
  isHolidayEve: boolean;
  probability: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  /** 표본: D일 전에 비어 있던 밤 수 / 그중 팔린 밤 수 */
  n: number;
  sold: number;
  windowUsed: RadarWindow | null;
  /** 이 요일 묶음의 결정 시점 (null = 당일까지 여유) */
  decisionDay: number | null;
  /** 아직 결정 시점 전인가 */
  beforeDecision: boolean;
  /** 지금 판단이 필요한가 — 결정 시점을 지났거나, 틈 때문에 할인 권장이 붙은 경우 */
  needsAction: boolean;
  advice: RadarAdvice;
  /** 이 밤에 이미 남긴 결정 (없으면 null) */
  action: PricingAction | null;
  /** 설정의 기본/주말 요금으로 본 현재 가격 (없으면 null) */
  currentPrice: number | null;
  /** 같은 상황에서 임박 예약된 밤들의 실제 거래가 (없으면 null). samples는 단가 오름차순 */
  soldPrices: { count: number; median: number; min: number; max: number; discounted: number; atOrAbove: number; samples: SoldNightSample[] } | null;
  /** 과거 임박 거래 중 현재가 이상에서 팔린 밤 수. 현재가·표본이 없으면 null */
  soldAtCurrentPrice: number | null;
  /** 현재가 이상 거래가 하나도 없어 한 단계 올렸는가 */
  priceOutOfRange: boolean;
  reason: string;
  reasonEn: string;
}

export interface RadarStripCell {
  date: string;
  dow: number;
  daysBefore: number;
  /** 이 날 빈 객실 수 / 전체 객실 수 */
  emptyCount: number;
  totalCount: number;
  /** 이 날 빈 객실 중 가장 급한 권장 */
  advice: RadarAdvice | null;
  /** '이 날은 빼기'로 제외한 객실 수 (휴무 등) */
  excludedCount: number;
}

export interface LastMinuteRadarResult {
  today: string;
  horizonDays: number;
  rows: RadarRow[];
  strip: RadarStripCell[];
  summary: {
    emptyNights: number;
    /** 지금 판단이 필요한 빈 밤 수 */
    needsAction: number;
    /** 요일 묶음별 결정 시점 (표시용) */
    decisionDay: Record<RadarDowGroup, number | null>;
  };
  /** 4개: (일~목, 금·토) × (6개월, 12개월) */
  curves: FillCurve[];
  /** 7일 이내에 팔린 밤의 단가가 그 달 보통 단가와 얼마나 달랐나 (%) */
  lateSale: { avgPct: number | null; n: number; points: number[] };
  /** 지난 결정과 그 결과 (최근 것부터) */
  decisionHistory: DecisionRecord[];
  dataQuality: {
    completedMonths: number;
    pricedBookings: number;
    /** 기준 기간 예약 중 자동 연동(접수일 = 동기화일) 비중 (0~100) */
    autoSyncedShare: number;
    enough: boolean;
    /** enough가 false일 때 안내용 — 데이터 시작 월 */
    firstMonth: string | null;
  };
}

/** 빈방 레이더 결정 기록 — 호스트가 빈 날에 내린 결정 (pricing_actions 테이블) */
export type PricingActionKind = 'discount' | 'hold' | 'exclude';

export interface PricingAction {
  id: string;
  hostId: string;
  propertyId: string | null;
  stayDate: string;            // YYYY-MM-DD
  action: PricingActionKind;
  discountPct: number | null;
  daysBefore: number | null;
  predictedP: number | null;   // 결정 당시 팔릴 가능성 (0~100)
  advice: RadarAdvice | null;
  createdAt: string;
}

/** 지난 결정 하나의 결과 — "내 결정이 맞았나" */
export interface DecisionRecord {
  action: PricingAction;
  /** 그 밤이 결국 팔렸나 (아직 오지 않은 날은 pending) */
  outcome: 'sold' | 'unsold' | 'pending';
  /** 팔렸다면 그 밤 단가가 그 달 보통 단가 대비 몇 % (금액 없으면 null) */
  adrPct: number | null;
}

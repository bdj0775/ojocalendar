import type { Booking } from '../types';

/**
 * 분석(점유율·매출·예측·페이스·리드타임)에 공통으로 쓰는 예약 판정 규칙.
 * 대시보드의 여러 훅이 같은 기준을 써야 화면마다 숫자가 어긋나지 않는다.
 */

/** 분석에 포함하는 예약 상태 */
export const isCountedStatus = (status: string): boolean =>
  status === 'confirmed' || status === 'checked in' || status === 'completed';

/** 이 박수 이상이면서 아래 조건을 만족하면 예약이 아니라 판매 차단으로 본다 */
export const BLOCK_MIN_NIGHTS = 14;

/**
 * iCal 판매 차단 블록인가.
 *
 * Booking.com은 예약과 판매 차단(오픈 기간 밖·휴무)을 모두 "CLOSED - Not available"로
 * 내보내고, 동기화는 이를 게스트명 'Not available' · 금액 0원 · confirmed로 저장한다.
 * 실제 예약은 길어야 1주 남짓이고 곧 금액이 입력되지만, 판매 차단은 금액 0원인 채로
 * 수십~수백 박이다(실측: 182박). 그대로 두면 그 기간 점유율이 전부 100%로 찍히고
 * 예측·페이스까지 오염된다(FORECAST.md 7절). 검증 스크립트는 이미 제외하고 있었다.
 */
export const isCalendarBlock = (b: Pick<Booking, 'guestName' | 'amount' | 'checkIn' | 'checkOut'>): boolean => {
  if ((b.guestName || '').trim().toLowerCase() !== 'not available') return false;
  if ((Number(b.amount) || 0) !== 0) return false;
  const nights = Math.round(
    (new Date(b.checkOut + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()) / 86400000,
  );
  return nights >= BLOCK_MIN_NIGHTS;
};

/** 분석에 포함할 예약인가 (유효 상태 + 판매 차단 제외) */
export const isAnalyticsBooking = (b: Booking): boolean =>
  isCountedStatus(b.status) && !isCalendarBlock(b);

/** 한 달에 체크인이 이만큼 있어야 실제 영업 중인 숙소로 본다 (useDesktopStats 오픈월 기준과 동일) */
export const MIN_OPERATING_CHECKINS = 3;

/**
 * 대시보드 분석 대상 예약을 고른다. 모든 분석 훅이 이 함수 하나로 범위를 정한다.
 *
 * - 특정 숙소를 선택했으면 그 숙소 예약만 (숙소 미지정 예약은 첫 숙소로 간주)
 * - 유효 상태 + 판매 차단 블록 제외 (isAnalyticsBooking)
 * - '전체'면 **어느 한 달이라도 체크인이 3건 이상이었던 숙소**의 예약만.
 *   테스트용으로 만든 숙소에 예약이 몇 건 있으면 그 숙소가 객실 수에 잡혀
 *   '전체' 점유율이 절반으로 떨어졌다(실사례: 10월 27/62박 = 44%).
 *   그런 숙소도 드롭다운에서 직접 선택하면 그대로 볼 수 있다.
 *   조건을 만족하는 숙소가 하나도 없으면(막 시작한 사용자) 거르지 않는다.
 */
export const selectDashboardBookings = <T extends Booking>(
  bookings: T[],
  firstPropId: string | undefined,
  selectedPropertyId: string | null,
): T[] => {
  const inScope = bookings
    .filter(b => {
      if (!selectedPropertyId) return true;
      const pid = b.propertyId || firstPropId;
      return !pid || pid === selectedPropertyId;
    })
    .filter(isAnalyticsBooking);
  if (selectedPropertyId) return inScope;

  // 숙소별 · 월별 체크인 건수
  const counts = new Map<string, Map<number, number>>();
  inScope.forEach(b => {
    const pid = b.propertyId || firstPropId || '';
    const d = new Date(b.checkIn + 'T12:00:00');
    const k = d.getFullYear() * 12 + d.getMonth();
    if (!counts.has(pid)) counts.set(pid, new Map());
    const m = counts.get(pid)!;
    m.set(k, (m.get(k) || 0) + 1);
  });
  const operating = new Set(
    [...counts.entries()]
      .filter(([, m]) => [...m.values()].some(c => c >= MIN_OPERATING_CHECKINS))
      .map(([pid]) => pid),
  );
  if (operating.size === 0) return inScope;
  return inScope.filter(b => operating.has(b.propertyId || firstPropId || ''));
};

/**
 * 월별 점유율 분모(객실 수)를 돌려주는 함수를 만든다.
 *
 * 특정 숙소를 선택했으면 항상 1. '전체'면 **그 달까지 첫 체크인이 있었던 숙소 수**.
 * 예전에는 "전 기간 중 예약이 있는 숙소 수" 하나를 모든 달에 썼기 때문에, 새 숙소를
 * 추가해 예약이 한 건만 생겨도 그 숙소가 없던 과거 달까지 점유율이 전부 절반으로 떨어졌다.
 */
export const makeRoomsFor = (
  bookings: Booking[],
  firstPropId: string | undefined,
  propertySelected: boolean,
): ((year: number, month: number) => number) => {
  if (propertySelected) return () => 1;

  // 숙소별 첫 체크인 월 (year*12+month)
  const openKeyByProp = new Map<string, number>();
  bookings.forEach(b => {
    const pid = b.propertyId || firstPropId;
    if (!pid) return;
    const d = new Date(b.checkIn + 'T12:00:00');
    const k = d.getFullYear() * 12 + d.getMonth();
    const prev = openKeyByProp.get(pid);
    if (prev === undefined || k < prev) openKeyByProp.set(pid, k);
  });
  const openKeys = [...openKeyByProp.values()];

  return (year: number, month: number) => {
    const k = year * 12 + month;
    return Math.max(1, openKeys.filter(ok => ok <= k).length);
  };
};

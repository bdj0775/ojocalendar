import type { Channel, ICalEvent } from '../../types';

export interface MappedBooking {
  propertyId: string;
  hostId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  bookingDate: string;
  guests: number;
  infants: number;
  nationality: string;
  channel: Channel;
  status: string;
  amount: number;
  commission: number;
  externalId: string;
  isAutoSynced: boolean;
  rawIcalSummary: string;
}

// 플랫폼별 게스트명 추출 — 실제 이름이 없으면 "새 예약" 반환
function extractGuestName(summary: string, channel: Channel): string {
  if (channel === 'Airbnb') {
    // "Reserved - 홍길동" / "예약됨 - 홍길동" 형식
    const m = summary.match(/(?:예약됨|Reserved|Reservation)\s*[-–]\s*(.+)/i);
    if (m) return m[1].trim();
  }

  if (channel === 'Booking.com') {
    // "CLOSED - 홍길동" 형식
    const m = summary.match(/(?:CLOSED|Closed)\s*[-–]\s*(.+)/i);
    if (m) return m[1].trim();
  }

  if (channel === 'Naver') {
    // "홍길동 - 예약번호" 형식
    const m = summary.match(/^(.+?)\s*[-–]\s*[\dA-Za-z]+$/);
    if (m) return m[1].trim();
  }

  // 게스트명을 특정할 수 없는 모든 경우 (Not available, Reserved, Blocked 등)
  // → "새 예약"으로 통일. 알림을 통해 상세 입력 유도.
  return '새 예약';
}

export function mapToBooking(
  event: ICalEvent,
  channel: Channel,
  propertyId: string,
  hostId: string,
): MappedBooking {
  const guestName = extractGuestName(event.summary, channel);

  return {
    propertyId,
    hostId,
    guestName,
    checkIn: event.dtstart,
    checkOut: event.dtend,
    bookingDate: new Date().toISOString().split('T')[0],
    guests: 1,
    infants: 0,
    nationality: 'Others',
    channel,
    status: 'confirmed',
    amount: 0,
    commission: 0,
    externalId: event.uid,
    isAutoSynced: true,
    rawIcalSummary: event.summary,
  };
}

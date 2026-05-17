// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: export-ical
// 이 앱의 예약 데이터를 ICS 형식으로 내보내는 공개 엔드포인트
//
// URL 형식: GET /functions/v1/export-ical?host={hostId}&property={propertyId}
//
// 사용법 (자동 예약 막기):
//   1. 이 URL을 복사
//   2. Airbnb 설정 > 캘린더 > 다른 캘린더 가져오기 > URL 붙여넣기
//   3. Booking.com extranet > 캘린더 > iCal 가져오기 > URL 붙여넣기
//   → 각 플랫폼이 주기적으로 이 URL을 가져가 해당 날짜를 자동 차단
//
// 배포: supabase functions deploy export-ical

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function formatICalDate(dateStr: string): string {
  // YYYY-MM-DD → YYYYMMDD
  return dateStr.replace(/-/g, '');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

serve(async (req) => {
  const url = new URL(req.url);
  const hostId = url.searchParams.get('host');
  const propertyId = url.searchParams.get('property');

  if (!hostId || !propertyId) {
    return new Response('host, property 파라미터가 필요합니다.', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, checkin, checkout, status')
    .eq('host_id', hostId)
    .eq('property_id', propertyId)
    .neq('status', 'cancelled')
    .order('checkin', { ascending: true });

  if (error) {
    return new Response('데이터 조회 실패', { status: 500 });
  }

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const vevents = (bookings ?? []).map(b => {
    const uid = `booking-${b.id}@antigravity-calendar`;
    // 공개 URL — 게스트명/채널 등 개인정보 제외, 날짜 차단 정보만 내보냄
    const summary = 'BLOCKED';
    const dtstart = formatICalDate(b.checkin);
    const dtend = formatICalDate(b.checkout);

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity Calendar//KR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:예약 캘린더',
    'X-WR-TIMEZONE:Asia/Seoul',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bookings.ics"',
      // 캐시 방지 (플랫폼이 항상 최신 데이터를 가져가도록)
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

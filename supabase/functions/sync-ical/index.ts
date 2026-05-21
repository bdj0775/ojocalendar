// @ts-nocheck — Deno 런타임 전용 파일. Node.js/Vite tsconfig 적용 안 됨.
// Supabase Edge Function: sync-ical
// 스케줄: 15분마다 자동 실행 (Supabase Dashboard > Edge Functions > Schedules)
// 배포: supabase functions deploy sync-ical

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_PROXY = 'https://corsproxy.io/?url=';

interface SyncChannelRow {
  id: string;
  host_id: string;
  property_id: string;
  channel: string;
  ical_url: string;
}

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  status: string;
  description?: string;
}

function parseICS(icsText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n');
  const lines = unfolded.split('\n');

  let inEvent = false;
  let current: Partial<ICalEvent & { dtstart_raw: string; dtend_raw: string }> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue; }
    if (trimmed === 'END:VEVENT') {
      if (current.uid && current.dtstart_raw && current.dtend_raw) {
        events.push({
          uid: current.uid,
          summary: current.summary ?? '예약',
          dtstart: parseDate(current.dtstart_raw),
          dtend: parseDate(current.dtend_raw),
          status: (current.status ?? 'CONFIRMED').toUpperCase(),
        });
      }
      inEvent = false; continue;
    }
    if (!inEvent) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.substring(0, colonIdx).split(';')[0].toUpperCase();
    const value = trimmed.substring(colonIdx + 1);
    if (key === 'UID')         current.uid = value;
    if (key === 'SUMMARY')     current.summary = value.replace(/\\n/g, ' ').replace(/\\,/g, ',');
    if (key === 'DTSTART')     current.dtstart_raw = value;
    if (key === 'DTEND')       current.dtend_raw = value;
    if (key === 'STATUS')      current.status = value;
    if (key === 'DESCRIPTION') current.description = value.replace(/\\n/g, ' ');
  }
  return events;
}

function parseDate(s: string): string {
  const d = s.replace(/[^0-9]/g, '');
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

async function fetchICS(url: string): Promise<string> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) { const t = await r.text(); if (t.includes('BEGIN:VCALENDAR')) return t; }
  } catch { /* fall through */ }
  const r = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
  return r.text();
}

function extractGuestName(summary: string, channel: string): string {
  if (channel === 'Airbnb') {
    const m = summary.match(/(?:예약됨|Reserved|Reservation)\s*[-–]\s*(.+)/i);
    if (m) return m[1].trim();
  }
  if (channel === 'Booking.com') {
    const m = summary.match(/(?:CLOSED|Closed)\s*[-–]\s*(.+)/i);
    if (m) return m[1].trim();
  }
  if (channel === 'Naver') {
    const m = summary.match(/^(.+?)\s*[-–]\s*[\dA-Za-z]+$/);
    if (m) return m[1].trim();
  }
  return '새 예약';
}

const CHANNEL_PRIORITY: Record<string, number> = { Airbnb: 1, 'Booking.com': 2, Naver: 3, Direct: 4 };



const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // 브라우저 CORS preflight — 반드시 200으로 응답해야 실제 POST가 진행됨
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const cronSecret  = Deno.env.get('CRON_SECRET');
  const authHeader  = req.headers.get('Authorization') ?? '';
  let filterHostId: string | null = null; // null = 전체 호스트 동기화 (cron 모드)

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // ── cron 스케줄러: 전체 동기화 ──────────────────────────
    filterHostId = null;
  } else {
    // ── 클라이언트 JWT: 해당 유저 채널만 동기화 ─────────────
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response('Unauthorized', { status: 401, headers: CORS });
    }
    filterHostId = user.id;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let query = supabase.from('sync_channels').select('*').eq('is_active', true);
  if (filterHostId) query = query.eq('host_id', filterHostId);
  const { data: channels, error } = await query;

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (!channels?.length) return new Response(JSON.stringify({ message: 'no active channels' }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  // Airbnb → Booking.com → Naver 순 정렬 (선행 채널이 날짜 선점 → 후행 채널 중복 스킵)
  const sorted = [...channels].sort((a, b) =>
    (CHANNEL_PRIORITY[a.channel] ?? 99) - (CHANNEL_PRIORITY[b.channel] ?? 99)
  );

  const results = [];

  for (const ch of sorted as SyncChannelRow[]) {
    let added = 0, updated = 0, skipped = 0;
    let syncError: string | null = null;

    try {
      const icsText = await fetchICS(ch.ical_url);
      const events = parseICS(icsText);

      for (const event of events) {
        if (event.status === 'CANCELLED') {
          await supabase.from('bookings').update({ status: 'completed' })
            .eq('host_id', ch.host_id).eq('external_id', event.uid);
          continue;
        }

        if (/not available/i.test(event.summary) && ch.channel === 'Airbnb') { skipped++; continue; }

        const guestName = extractGuestName(event.summary, ch.channel);

        const { data: existing } = await supabase
          .from('bookings').select('id, checkin, checkout, guestname')
          .eq('host_id', ch.host_id).eq('external_id', event.uid).maybeSingle();

        if (existing) {
          const normalize = (d: string) => d.split('T')[0];
          const isManuallyEdited = existing.guestname !== '새 예약';

          if (isManuallyEdited) {
            // 사용자가 수동 수정한 예약 — 날짜 변경 시에만 날짜만 업데이트, 이름 불변
            const datesChanged = normalize(existing.checkin) !== normalize(event.dtstart) ||
                                 normalize(existing.checkout) !== normalize(event.dtend);
            if (datesChanged) {
              await supabase.from('bookings')
                .update({ checkin: event.dtstart, checkout: event.dtend })
                .eq('id', existing.id);
              updated++;
            } else { skipped++; }
          } else {
            // 아직 미수정("새 예약") — iCal에 실제 이름이 있으면 반영
            const shouldUpdateName = guestName !== '새 예약';
            const datesChanged = normalize(existing.checkin) !== normalize(event.dtstart) ||
                                 normalize(existing.checkout) !== normalize(event.dtend);
            const nameChanged = shouldUpdateName && existing.guestname !== guestName;

            if (datesChanged || nameChanged) {
              const patch: Record<string, unknown> = { checkin: event.dtstart, checkout: event.dtend };
              if (shouldUpdateName) patch.guestname = guestName;
              await supabase.from('bookings').update(patch).eq('id', existing.id);
              updated++;
            } else { skipped++; }
          }
        } else {
          // 같은 채널 기존 예약 → external_id 재연결 (수동 수정 내용 보존)
          const { data: sameChOverlap } = await supabase
            .from('bookings').select('id')
            .eq('host_id', ch.host_id).eq('property_id', ch.property_id)
            .eq('channel', ch.channel)
            .lt('checkin', event.dtend).gt('checkout', event.dtstart)
            .limit(1);

          if (sameChOverlap?.length) {
            await supabase.from('bookings')
              .update({ external_id: event.uid, raw_ical_summary: event.summary })
              .eq('id', sameChOverlap[0].id);
            skipped++; continue;
          }

          // 다른 채널 기존 예약 → 스킵 (크로스채널 중복 방지)
          const { data: otherChOverlap } = await supabase
            .from('bookings').select('id')
            .eq('host_id', ch.host_id).eq('property_id', ch.property_id)
            .neq('channel', ch.channel)
            .lt('checkin', event.dtend).gt('checkout', event.dtstart)
            .limit(1);

          if (otherChOverlap?.length) { skipped++; continue; }

          const { data: newBooking, error: insErr } = await supabase.from('bookings').insert({
            host_id: ch.host_id, property_id: ch.property_id,
            guestname: guestName, checkin: event.dtstart, checkout: event.dtend,
            bookingdate: new Date().toISOString().split('T')[0],
            guests: 1, infants: 0, nationality: 'Others',
            channel: ch.channel, status: 'confirmed', amount: 0, commission: 0,
            external_id: event.uid, is_auto_synced: true, raw_ical_summary: event.summary,
          }).select('id').single();

          if (!insErr && newBooking) {
            const missingFields = guestName === '새 예약'
              ? ['guestName', 'amount', 'guests', 'nationality']
              : ['amount', 'guests', 'nationality'];
            await supabase.from('sync_notifications').insert({
              host_id: ch.host_id,
              booking_id: newBooking.id,
              guest_name: guestName,
              check_in: event.dtstart,
              check_out: event.dtend,
              channel: ch.channel,
              missing_fields: missingFields,
              is_read: false,
            });
            added++;
          }
        }
      }

      await supabase.from('sync_channels')
        .update({ last_synced_at: new Date().toISOString() }).eq('id', ch.id);

    } catch (e) {
      syncError = e instanceof Error ? e.message : String(e);
    }

    await supabase.from('sync_logs').insert({
      host_id: ch.host_id, channel_id: ch.id,
      added_count: added, updated_count: updated, skipped_count: skipped,
      error: syncError,
    });

    results.push({ channel: ch.channel, added, updated, skipped, error: syncError });
  }

  return new Response(JSON.stringify({ synced: results.length, results }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});

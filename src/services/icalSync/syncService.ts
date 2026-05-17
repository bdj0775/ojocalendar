import { supabase } from '../supabaseClient';
import { fetchICalWithProxy } from './icalFetcher';
import { parseICS } from './icsParser';
import { mapToBooking } from './eventMapper';
import type { Channel } from '../../types';

export interface SyncChannelRow {
  id: string;
  host_id: string;
  property_id: string;
  channel: Channel;
  ical_url: string;
  is_active: boolean;
}

export interface SyncResult {
  channelId: string;
  channel: Channel;
  added: number;
  updated: number;
  skipped: number;
  error?: string;
}


// Airbnb "Not available" = 타 채널 임포트 또는 수동 블록 → skip
// Booking.com은 필터 없이 통과 → overlap 체크로 에어비앤비 예약과 겹치면 skip
function isBlockEvent(summary: string, channel: Channel): boolean {
  if (channel === 'Airbnb') return /not available/i.test(summary);
  return false;
}

export async function syncChannel(channelConfig: SyncChannelRow): Promise<SyncResult> {
  const result: SyncResult = {
    channelId: channelConfig.id,
    channel: channelConfig.channel,
    added: 0,
    updated: 0,
    skipped: 0,
  };

  try {
    const icsText = await fetchICalWithProxy(channelConfig.ical_url);
    const events = parseICS(icsText);

    for (const event of events) {
      // 취소된 이벤트 처리
      if (event.status === 'CANCELLED') {
        await supabase
          .from('bookings')
          .update({ status: 'completed' })
          .eq('host_id', channelConfig.host_id)
          .eq('external_id', event.uid);
        continue;
      }

      if (isBlockEvent(event.summary, channelConfig.channel)) { result.skipped++; continue; }

      const booking = mapToBooking(event, channelConfig.channel, channelConfig.property_id, channelConfig.host_id);

      // 이미 존재하는 예약인지 확인 (external_id 기준)
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, checkin, checkout, guestname')
        .eq('host_id', channelConfig.host_id)
        .eq('external_id', event.uid)
        .maybeSingle();

      if (existing) {
        // 사용자가 수동 수정한 경우(guestname이 '새 예약'이 아님) 덮어쓰지 않음
        const isManuallyEdited = existing.guestname !== '새 예약';
        if (isManuallyEdited) {
          // 날짜가 실제로 변경된 경우에만 날짜 업데이트, 이름은 절대 덮어쓰지 않음
          const normalize = (d: string) => d.split('T')[0];
          const datesChanged = normalize(existing.checkin) !== normalize(booking.checkIn) ||
                               normalize(existing.checkout) !== normalize(booking.checkOut);
          if (datesChanged) {
            await supabase.from('bookings')
              .update({ checkin: booking.checkIn, checkout: booking.checkOut })
              .eq('id', existing.id);
            result.updated++;
          } else {
            result.skipped++;
          }
          continue;
        }

        // 아직 수동 수정 전("새 예약") — iCal에서 실제 이름을 가져온 경우만 업데이트
        const shouldUpdateName = booking.guestName !== '새 예약';
        const normalize = (d: string) => d.split('T')[0];
        const datesChanged = normalize(existing.checkin) !== normalize(booking.checkIn) ||
                             normalize(existing.checkout) !== normalize(booking.checkOut);
        const nameChanged = shouldUpdateName && existing.guestname !== booking.guestName;

        if (datesChanged || nameChanged) {
          const patch: Record<string, unknown> = {
            checkin: booking.checkIn,
            checkout: booking.checkOut,
            raw_ical_summary: booking.rawIcalSummary,
          };
          if (shouldUpdateName) patch.guestname = booking.guestName;
          await supabase.from('bookings').update(patch).eq('id', existing.id);
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        // 같은 채널의 기존 예약이 같은 날짜에 있으면 → external_id만 새 UID로 재연결 (수동 수정 내용 보존)
        const { data: sameChannelOverlap } = await supabase
          .from('bookings')
          .select('id')
          .eq('host_id', channelConfig.host_id)
          .eq('property_id', channelConfig.property_id)
          .eq('channel', channelConfig.channel)
          .lt('checkin', booking.checkOut)
          .gt('checkout', booking.checkIn)
          .limit(1);

        if (sameChannelOverlap?.length) {
          await supabase.from('bookings')
            .update({ external_id: booking.externalId, raw_ical_summary: booking.rawIcalSummary })
            .eq('id', sameChannelOverlap[0].id);
          result.skipped++;
          continue;
        }

        // 다른 채널의 기존 예약과 날짜 겹침 → 스킵 (크로스채널 중복 방지)
        const { data: otherChannelOverlap } = await supabase
          .from('bookings')
          .select('id')
          .eq('host_id', channelConfig.host_id)
          .eq('property_id', channelConfig.property_id)
          .neq('channel', channelConfig.channel)
          .lt('checkin', booking.checkOut)
          .gt('checkout', booking.checkIn)
          .limit(1);

        if (otherChannelOverlap?.length) {
          result.skipped++;
          continue;
        }

        const { data: newBooking, error } = await supabase.from('bookings').insert({
          host_id: booking.hostId,
          property_id: booking.propertyId,
          guestname: booking.guestName,
          checkin: booking.checkIn,
          checkout: booking.checkOut,
          bookingdate: booking.bookingDate,
          guests: booking.guests,
          infants: booking.infants,
          nationality: booking.nationality,
          channel: booking.channel,
          status: booking.status,
          amount: booking.amount,
          commission: booking.commission,
          external_id: booking.externalId,
          is_auto_synced: booking.isAutoSynced,
          raw_ical_summary: booking.rawIcalSummary,
        }).select('id').single();

        if (!error && newBooking) {
          result.added++;
          const missingFields = booking.guestName === '새 예약'
            ? ['guestName', 'amount', 'guests', 'nationality']
            : ['amount', 'guests', 'nationality'];
          await supabase.from('sync_notifications').insert({
            host_id: booking.hostId,
            booking_id: newBooking.id,
            guest_name: booking.guestName,
            check_in: booking.checkIn,
            check_out: booking.checkOut,
            channel: booking.channel,
            missing_fields: missingFields,
            is_read: false,
          });
        }
      }
    }

    // 마지막 동기화 시각 업데이트
    await supabase
      .from('sync_channels')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', channelConfig.id);

    // 동기화 로그 기록
    await supabase.from('sync_logs').insert({
      host_id: channelConfig.host_id,
      channel_id: channelConfig.id,
      added_count: result.added,
      updated_count: result.updated,
      skipped_count: result.skipped,
    });

  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    // 로그 실패는 무시 (Supabase 쿼리 빌더는 .catch()를 지원하지 않으므로 try-catch로 감쌈)
    try {
      await supabase.from('sync_logs').insert({
        host_id: channelConfig.host_id,
        channel_id: channelConfig.id,
        added_count: 0,
        updated_count: 0,
        skipped_count: 0,
        error: result.error,
      });
    } catch { /* ignore */ }
  }

  return result;
}

export async function syncAllChannels(hostId: string): Promise<SyncResult[]> {
  const { data: channels, error } = await supabase
    .from('sync_channels')
    .select('*')
    .eq('host_id', hostId)
    .eq('is_active', true);

  if (error || !channels?.length) return [];

  // Airbnb → Booking.com → Naver 순으로 순차 동기화 (선행 채널이 날짜 선점 → 후행 채널 중복 스킵)
  const PRIORITY: Record<string, number> = { Airbnb: 1, 'Booking.com': 2, Naver: 3, Direct: 4 };
  const sorted = [...channels].sort((a, b) =>
    (PRIORITY[a.channel] ?? 99) - (PRIORITY[b.channel] ?? 99)
  );

  const results: SyncResult[] = [];
  for (const ch of sorted) {
    results.push(await syncChannel(ch as SyncChannelRow));
  }
  return results;
}

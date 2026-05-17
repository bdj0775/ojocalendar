-- ==========================================
-- iCal Sync Migration (멱등성 보장 — 여러 번 실행해도 안전)
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ==========================================

-- 1. 예약 채널(iCal URL) 설정 테이블
CREATE TABLE IF NOT EXISTS sync_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel         VARCHAR(100) NOT NULL,
  ical_url        TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  last_synced_at  TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. 동기화 이력 로그 테이블
CREATE TABLE IF NOT EXISTS sync_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id     UUID REFERENCES sync_channels(id) ON DELETE SET NULL,
  synced_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  added_count    INTEGER DEFAULT 0,
  updated_count  INTEGER DEFAULT 0,
  skipped_count  INTEGER DEFAULT 0,
  error          TEXT
);

-- 3. 알림 테이블
CREATE TABLE IF NOT EXISTS sync_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES bookings(id) ON DELETE CASCADE,
  guest_name     TEXT NOT NULL,
  check_in       DATE NOT NULL,
  check_out      DATE NOT NULL,
  channel        VARCHAR(100) NOT NULL,
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  is_read        BOOLEAN DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. bookings 테이블에 iCal 동기화용 컬럼 추가
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_id      TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_auto_synced   BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS raw_ical_summary TEXT;

-- 5. external_id 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS bookings_external_id_idx
  ON bookings (host_id, external_id)
  WHERE external_id IS NOT NULL;

-- 6. RLS 활성화
ALTER TABLE sync_channels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_notifications ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책 (기존 정책 삭제 후 재생성 — 멱등성 보장)
DROP POLICY IF EXISTS "Users can manage own sync_channels"      ON sync_channels;
DROP POLICY IF EXISTS "Users can manage own sync_logs"          ON sync_logs;
DROP POLICY IF EXISTS "Users can manage own sync_notifications" ON sync_notifications;

CREATE POLICY "Users can manage own sync_channels"
  ON sync_channels FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Users can manage own sync_logs"
  ON sync_logs FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Users can manage own sync_notifications"
  ON sync_notifications FOR ALL USING (auth.uid() = host_id);

-- ==========================================
-- 정리: 이전에 잘못 생성된 "차단된 날짜" 예약 삭제
-- (iCal "Not available" / "Blocked" 이벤트가 booking으로 잘못 저장된 경우)
-- 이 구문은 최초 1회만 실행하세요.
-- ==========================================
DELETE FROM bookings WHERE guestname = '차단된 날짜' AND is_auto_synced = true;
DELETE FROM sync_notifications WHERE guest_name = '차단된 날짜';

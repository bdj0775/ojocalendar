-- Phase 5 — 관리자가 다른 회원의 예약을 대신 추가/수정/삭제할 때마다 기록을 남기는 감사 로그.
-- 클라이언트(anon/authenticated)는 읽기/쓰기 모두 불가 — Edge Function(Service Role)만 기록.
-- 필요 시 Supabase 대시보드 Table Editor에서 직접 조회.
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action VARCHAR(50) NOT NULL,        -- 'booking_create' | 'booking_update' | 'booking_delete' 등
    target_host_id UUID,
    target_email TEXT,
    detail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- 의도적으로 정책 없음 (클라이언트 접근 전면 차단, Service Role만 우회 가능)

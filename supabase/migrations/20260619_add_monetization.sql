-- ==========================================
-- [Phase 1] 결제/구독 시스템 기반 테이블
-- MONETIZATION_ROADMAP.md Phase 1 참고
-- ==========================================

-- 1. 전역 설정 (싱글톤 1행) — 마스터 스위치
--    id를 boolean(true) 고정값으로 둬서 행이 1개만 존재하도록 강제
CREATE TABLE IF NOT EXISTS app_settings (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
    monetization_enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO app_settings (id, monetization_enabled)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 로그인한 모든 사용자가 스위치 상태를 읽을 수 있어야 클라이언트에서 게이팅 판단 가능
CREATE POLICY "Authenticated users can read app_settings"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE 정책은 의도적으로 만들지 않음 — 클라이언트에서 절대 못 바꾸게 막고,
-- 운영자가 Supabase 대시보드 SQL 에디터에서 직접 값을 바꾸는 방식으로만 ON/OFF (Phase 5)

-- 2. 구독 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL DEFAULT 'free',           -- 'legacy_free' | 'free' | 'pro'
    status VARCHAR(20) NOT NULL DEFAULT 'active',       -- 'active' | 'pending' | 'expired'
    payment_method VARCHAR(20),                          -- 'manual' | 'toss'
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독 상태는 읽기만 가능. 수정 정책은 없음 — 클라이언트가 직접 plan/status를
-- 바꿀 수 있으면 누구나 자기 자신을 'pro'로 바꿀 수 있게 되므로 절대 허용하지 않음.
-- 변경은 Phase 3(관리자 수기 활성화) / Phase 4(결제 Edge Function, SECURITY DEFINER) 에서만 수행.
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = host_id);

-- 3. 회원가입 트리거 확장 — 가입 시점의 스위치 상태를 그대로 구독에 영구 고정 (그랜드파더링 핵심)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  monetization_on BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');

  SELECT monetization_enabled INTO monetization_on FROM public.app_settings WHERE id = true;

  -- 가입 시점에 스위치가 꺼져있으면 'legacy_free'로 영구 고정 (이후 스위치를 켜도 절대 바뀌지 않음)
  INSERT INTO public.subscriptions (host_id, plan, status)
  VALUES (new.id, CASE WHEN monetization_on THEN 'free' ELSE 'legacy_free' END, 'active');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 기존 가입자 백필 — 이 마이그레이션 적용 이전 가입자는 전부 베타 가입자이므로 legacy_free로 고정
INSERT INTO public.subscriptions (host_id, plan, status)
SELECT id, 'legacy_free', 'active' FROM public.profiles
ON CONFLICT (host_id) DO NOTHING;

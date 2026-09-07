-- 가격 탭 · 빈방 레이더 "결정 기록" (PRICING_ROADMAP.md 2장 3번)
-- 호스트가 빈 날에 대해 내린 결정(할인했다 / 그냥 뒀다 / 이 날은 빼기)을 남겨,
-- 나중에 "할인한 날은 실제로 팔렸나"를 되돌아볼 수 있게 한다.
-- 실행 방법: Supabase Dashboard > SQL Editor (멱등 — 여러 번 실행해도 안전)

CREATE TABLE IF NOT EXISTS pricing_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id  UUID REFERENCES properties(id) ON DELETE CASCADE,
  stay_date    DATE NOT NULL,                       -- 결정 대상인 밤
  action       VARCHAR(20) NOT NULL,                -- 'discount' | 'hold' | 'exclude'
  discount_pct INTEGER,                             -- action='discount'일 때 (10/15/20 …)
  days_before  INTEGER,                             -- 결정 당시 남은 날수
  predicted_p  INTEGER,                             -- 결정 당시 앱이 보여준 팔릴 가능성 (0~100)
  advice       VARCHAR(20),                         -- 결정 당시 앱 권장 (hold/wait/discount10 …)
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (host_id, property_id, stay_date)          -- 한 밤에 결정 하나 (바꾸면 덮어씀)
);

CREATE INDEX IF NOT EXISTS pricing_actions_host_date_idx ON pricing_actions (host_id, stay_date);

ALTER TABLE pricing_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own pricing_actions" ON pricing_actions;
CREATE POLICY "Users can manage own pricing_actions"
  ON pricing_actions FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

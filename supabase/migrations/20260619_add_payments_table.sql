-- Phase 5 — 관리자 페이지의 "이번달 결제 현황"을 보여주려면 결제 1건씩의 기록(원장)이 필요함.
-- subscriptions 테이블은 "현재 상태"만 들고 있어서 과거 결제 내역을 알 수 없음.
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 0) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    toss_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 본인 결제 내역은 읽기만 가능. 기록 생성은 Edge Function(toss-billing, Service Role)만 수행.
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = host_id);

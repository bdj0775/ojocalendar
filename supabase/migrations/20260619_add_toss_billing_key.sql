-- Phase 3 (토스페이먼츠 연동) — 정기결제 재청구에 필요한 billingKey 저장 컬럼
-- 클라이언트(RLS SELECT)에는 노출하지 않음: 앱 코드에서 select 시 이 컬럼을 명시적으로 제외할 것
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_key TEXT;

-- Phase 5 — 랜딩페이지(비로그인 방문자)가 베타 무료 배너를 띄울지 판단하려면
-- app_settings.monetization_enabled를 읽어야 함. 민감한 값이 아니므로(단순 on/off 플래그)
-- 비로그인 사용자(anon)에게도 읽기 허용. 기존 "Authenticated users can read app_settings" 정책과
-- 별개로 추가되는 정책이라 기존 정책은 그대로 둠 (Postgres RLS는 여러 permissive 정책을 OR로 결합).
CREATE POLICY "Anyone (incl. anonymous) can read app_settings"
  ON app_settings FOR SELECT
  USING (true);

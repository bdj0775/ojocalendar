// 클라이언트 측 UX 용도(자동 리다이렉트, 메뉴 노출 여부)로만 사용.
// 실제 권한 검증은 여기가 아니라 supabase/functions/admin-settings의 ADMIN_EMAIL 환경변수(서버)에서 수행됨.
// 이 값이 노출되어도 보안에 영향 없음 — 어차피 토글 액션은 서버에서 다시 검증함.
// ⚠️ 이 값을 바꾸면 Supabase의 Edge Function 환경변수 ADMIN_EMAIL도 같이 바꿔야 한다.
//    (Supabase 대시보드 → Edge Functions → Secrets). 한쪽만 바꾸면 메뉴는 보이는데
//    실제 동작이 전부 권한 오류로 실패한다.
export const ADMIN_EMAIL = 'dongjjoo@naver.com';

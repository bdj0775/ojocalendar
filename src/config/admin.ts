// 클라이언트 측 UX 용도(자동 리다이렉트, 메뉴 노출 여부)로만 사용.
// 실제 권한 검증은 여기가 아니라 supabase/functions/admin-settings의 ADMIN_EMAIL 환경변수(서버)에서 수행됨.
// 이 값이 노출되어도 보안에 영향 없음 — 어차피 토글 액션은 서버에서 다시 검증함.
export const ADMIN_EMAIL = 'bdj0775@nate.com';

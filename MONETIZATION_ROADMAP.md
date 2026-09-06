# MONETIZATION_ROADMAP.md — 결제/수익화 시스템 구축 로드맵

> 작성일: 2026-06-19
> 함께 읽을 문서: [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md), [CLAUDE.md](./CLAUDE.md)
> **운영 중 정책(가격/한도/ON-OFF)을 바꿔야 한다면 이 로드맵 대신 [BILLING_SYSTEM.md](./BILLING_SYSTEM.md) 한 파일만 보면 됩니다.** 이 문서는 "어떻게 만들었는지" 이력이고, BILLING_SYSTEM.md는 "지금 어떻게 운영하는지" 매뉴얼입니다.

## 핵심 운영 시나리오 (이 로드맵의 전제)

1. **지금**: 결제 로직을 전부 만들어두지만, **관리자 마스터 스위치(`monetization_enabled`)를 OFF** 상태로 무료 배포.
2. 베타 기간 가입자는 가입 시점에 "영구 무료" 자격이 **자동으로 고정(grandfather)** 됨. 이후 스위치를 켜도 이 사람들은 계속 무료.
3. 사용자가 충분히 모이면 관리자가 스위치를 **ON** → 그 시점 이후 신규 가입자부터 유료 플랜 적용.
4. 베타 기간 동안 랜딩페이지에 "OO까지 가입하면 평생 무료" 식으로 마케팅.

이 시나리오가 성립하려면 "가입 시점에 무료/유료 여부가 영구히 박제되는" 데이터 구조가 핵심입니다. 단순히 지금 OFF 해놓고 나중에 ON 하면 기존 가입자도 같이 막혀버리는 구조는 안 됩니다 — 이 로드맵은 그걸 막는 걸 1순위로 설계합니다.

---

## Phase 0 — 결정 사항 (작업 시작 전 확정 필요)

| 항목 | 현재 상태 | 결정 필요 시점 |
|---|---|---|
| 무료/유료 기준선 | 임시안: 숙소 1개=무료, 2개 이상=유료 | Phase 2 착수 전 |
| 가격 | 미정 | Phase 2 착수 전 |
| 스위치 ON 트리거 (사용자 수? 날짜?) | 미정 ("사용자가 모이면") | Phase 5 착수 전, 운영자 재량 |
| 1차 결제 수단 | 수동(계좌이체+수기 활성화) — 사업자등록 전이라 PG 불가 | 확정됨 |
| 2차 결제 수단 (PG 자동결제) | 토스페이먼츠 등, 사업자등록 완료 후 전환 | Phase 4, 보류 중 |

---

## Phase 1 — 데이터 모델 기반 작업 ✅ 코드 작성 완료 (DB 적용 대기)

**목표:** 가입 시점에 무료/유료 자격이 영구 고정되는 구조를 DB에 만든다.

- [x] `app_settings` 테이블 신설 (싱글톤 row): `monetization_enabled boolean` — [supabase/migrations/20260619_add_monetization.sql](supabase/migrations/20260619_add_monetization.sql)
- [x] `subscriptions` 테이블 신설: `host_id`, `plan` (`legacy_free` / `free` / `pro`), `status` (`active`/`pending`/`expired`), `payment_method` (`manual`/`toss`), `current_period_end`, `created_at`
- [x] 신규 가입 시 트리거 확장: `handle_new_user()`가 가입 순간 `monetization_enabled`이 OFF면 `plan='legacy_free'`로 영구 저장
- [x] 기존(마이그레이션 이전) 가입자 백필 — 전부 `legacy_free`로 고정
- [x] 새 테이블에 RLS 정책 적용 — `app_settings`는 읽기만 허용(authenticated), `subscriptions`는 본인 것만 읽기 허용. **두 테이블 모두 클라이언트 쓰기 정책을 의도적으로 만들지 않음** (누구나 자기 자신을 'pro'로 바꿔버리는 걸 막기 위함 — 변경은 Phase 3/4/5에서 관리자/Edge Function을 통해서만)
- [x] 앱 코드 연동: `src/types/index.ts`에 `Subscription` 타입 추가, `useStore.ts`에 `subscription`/`monetizationEnabled` 상태 + `fetchSubscription`/`fetchAppSettings` 추가, `fetchData()`에서 자동 호출
- [ ] **운영자 액션 필요**: [supabase/migrations/20260619_add_monetization.sql](supabase/migrations/20260619_add_monetization.sql) 내용을 Supabase 대시보드 → SQL Editor에서 직접 실행 (CLAUDE.md 규칙상 스키마 변경은 코드가 아닌 대시보드에서 적용)

---

## Phase 2 — 무료/유료 한도 게이팅 로직 ✅ 완료

**목표:** "숙소 N개까지 무료" 규칙을 실제로 막는 코드.

- [x] `canAddProperty` 판별: [src/hooks/useEntitlements.ts](src/hooks/useEntitlements.ts) — `FREE_PROPERTY_LIMIT = 1`
  - `monetizationEnabled === false` → 항상 허용 (현재 베타 상태)
  - `plan === 'legacy_free'` 또는 `'pro'` → 항상 허용
  - 그 외(`'free'`) → `FREE_PROPERTY_LIMIT` 초과 시 차단
- [x] "숙소 추가" 플로우에 게이트 적용 — [Settings.tsx](src/pages/Settings/Settings.tsx), [DesktopSettings.tsx](src/pages/DesktopSettings/DesktopSettings.tsx). 온보딩은 항상 숙소 1개만 생성하므로(코드 확인됨) 게이트 불필요.
- [x] 한도 초과 시 보여줄 페이월 모달: [src/components/Modals/PaywallModal.tsx](src/components/Modals/PaywallModal.tsx) — 현재는 수동결제(이메일 문의) 안내. 가격은 아직 미정이라 안내문에 가격 미표기.
- [x] Settings/DesktopSettings 상단 플랜 배지를 로컬 `settings.plan`(조작 가능) 대신 서버 `subscription.plan`(조작 불가)으로 교체

---

## Phase 3 — 결제 수단: 토스페이먼츠 연동 (테스트 모드로 먼저 완성) [방향 전환됨 2026-06-19]

> 원래 계획한 "수동결제(계좌이체)"는 운영자 결정으로 채택하지 않음. 대신 토스페이먼츠 PG를
> **테스트 키로 지금 전부 만들고**, 사업자등록 완료 후 라이브 키로 교체하는 전략으로 변경.
> 테스트 키는 사업자등록 없이 이메일 가입만으로 발급 가능 (실제 결제는 안 되고 흐름만 테스트 가능).

- [x] **운영자 액션**: [developers.tosspayments.com](https://developers.tosspayments.com) 가입 → 테스트 클라이언트 키/시크릿 키 발급 ("API 개별 연동 키" 사용 — 결제위젯 키는 별도 신청 필요해서 보류)
- [x] 발급받은 키를 `.env.local`에 등록, `.env.example`에 키 이름 추가
- [x] 프론트엔드: [src/services/tossPayments.ts](src/services/tossPayments.ts) — `requestBillingAuth('카드', ...)` 호출, [PaywallModal.tsx](src/components/Modals/PaywallModal.tsx) 업그레이드 버튼에서 트리거
- [x] 리다이렉트 처리 페이지: [src/pages/Billing/BillingSuccess.tsx](src/pages/Billing/BillingSuccess.tsx), [BillingFail.tsx](src/pages/Billing/BillingFail.tsx) — `/billing/success`, `/billing/fail` 라우트
- [x] 백엔드: [supabase/functions/toss-billing/index.ts](supabase/functions/toss-billing/index.ts) — 빌링키 발급 승인 + 결제 요청을 서버에서 처리 (시크릿 키는 Edge Function 환경변수에만 존재)
- [x] 결제 성공 시 `subscriptions` 테이블 업데이트 (`plan='pro'`, `payment_method='toss'`, `billing_key`, `current_period_end`)
- [x] 재청구용 `billing_key` 컬럼 추가: [supabase/migrations/20260619_add_toss_billing_key.sql](supabase/migrations/20260619_add_toss_billing_key.sql) — 클라이언트에는 노출하지 않음(select에서 제외)
- [x] **운영자 액션**: 마이그레이션 SQL 실행, Edge Function 배포, `TOSS_SECRET_KEY` 시크릿 등록 — 전부 완료 (2026-06-19)
- [x] 테스트 카드로 결제 위젯 → 빌링키 발급 → 구독 활성화까지 전체 흐름 e2e 테스트 완료 (2026-06-19) — Pro 배지로 전환, 숙소 한도 해제 확인됨. 단, 가짜 카드번호는 "지원하지 않는 카드"로 거부되므로 테스트 시 실제 보유 카드 번호 사용 필요(테스트 키라 과금 안 됨)
- ⚠️ Toss API 요청/응답 구조는 SDK 타입 정의(`@tosspayments/payment__types`) 기준으로 작성함. 실제 테스트 키로 호출 전까지는 미검증 상태.

---

## Phase 4 — 라이브 전환 (실제 결제 시작)

**목표:** Phase 3에서 테스트 키로 완성한 코드를 사업자등록 완료 후 그대로 라이브로 전환.

- [ ] 사업자등록 완료
- [ ] 토스페이먼츠 가맹점 심사 신청 및 승인
- [ ] 테스트 키 → 라이브 키로 교체 (환경변수만 변경, 코드 수정 불필요하도록 Phase 3에서 설계)
- [ ] 정기 결제 자동 갱신 (Supabase Scheduled Function/Cron)
- [ ] 결제 실패 처리 (`status='past_due'`, 알림)
- [ ] 실 결제 1건으로 최종 검증

---

## Phase 5 — 관리자 마스터 스위치 & 베타 마케팅 ✅ 코드 작성+배포 완료 (DB 마이그레이션 대기)

- [x] `/admin` 라우트 + 관리자 전용 화면: [src/pages/Admin/AdminSettings.tsx](src/pages/Admin/AdminSettings.tsx)
  - 관리자 이메일은 [src/config/admin.ts](src/config/admin.ts) `ADMIN_EMAIL` (현재 `bdj0775@nate.com`)
  - 비관리자가 `/admin` 접근 시 조용히 `/`로 리다이렉트 (페이지 존재 자체를 노출하지 않음)
  - (변경 2026-06-19) 로그인 시 자동 리다이렉트는 제거 — 관리자도 일반 사용자와 동일한 화면으로 진입. 대신 네비게이션에 "관리자" 메뉴를 추가해 수동 진입: 데스크탑은 [DesktopTabNav.tsx](src/components/DesktopTabNav/DesktopTabNav.tsx)의 탭 옆, 모바일은 [MobileSidebar.tsx](src/components/Layout/MobileSidebar.tsx)의 "설정" 버튼 아래 — 둘 다 `userProfile.email === ADMIN_EMAIL`일 때만 노출
- [x] `monetization_enabled` 토글 UI — Edge Function [admin-settings](supabase/functions/admin-settings/index.ts)로 서버사이드 권한 재검증 후 변경
- [x] 회원 현황 통계(전체/영구무료/무료/Pro) + 이번달 결제 현황 — Edge Function [admin-stats](supabase/functions/admin-stats/index.ts)
  - 집계를 위해 `payments`(결제 원장) 테이블 신설: [supabase/migrations/20260619_add_payments_table.sql](supabase/migrations/20260619_add_payments_table.sql), `toss-billing`이 결제 성공 시마다 1건씩 기록
- [x] 특정 회원 수동 플랜 전환/해지(이메일 입력 → Pro/무료/영구무료) — Edge Function [admin-set-plan](supabase/functions/admin-set-plan/index.ts)
- [x] 가격 설정 UI — 자리만 마련(비활성 카드), 실제 기능은 보류. 필요 시 요청하면 착수
- [x] 회원 데이터 열람(이메일로 회원 검색 → 예약 조회) — **읽기 전용으로 최종 확정 (2026-06-19)**
  - 로그인 권한을 가져오는 매직링크 임퍼소네이션은 보안/법적 리스크로 채택 안 함
  - 처음엔 예약 추가/수정/삭제까지 만들었으나, "사고 방지를 위해 쓰기 기능 자체를 원천 봉쇄"하기로 운영자 결정 → `admin-manage-booking` Edge Function은 Supabase에서 완전히 삭제(undeploy)하고 로컬 코드도 제거함
  - 남은 건 [admin-user-lookup](supabase/functions/admin-user-lookup/index.ts) 조회 기능뿐이며, 조회마다 `admin_audit_log`에 조용히 기록(사용자에게는 비공개, 분쟁 시 운영자 본인의 증명 자료용): [supabase/migrations/20260619_add_admin_audit_log.sql](supabase/migrations/20260619_add_admin_audit_log.sql)
  - [PrivacyPolicy.tsx](src/pages/Legal/PrivacyPolicy.tsx) 8번 조항에 "고객 지원 목적 열람 가능" 일반 조항 추가 — 개별 통지는 안 하되 정책상 근거를 미리 명시
  - 회원 검색은 이메일 입력 대신 드롭다운 목록 선택 방식 — [admin-list-users](supabase/functions/admin-list-users/index.ts)
  - (추가 2026-06-19) 목록뿐 아니라 **실제 캘린더 화면으로도 시각 확인** 가능: [AdminCalendarPreview.tsx](src/pages/Admin/AdminCalendarPreview.tsx)가 기존 `CalendarGrid`/`useBookingBars`를 재사용해 그 회원의 달력을 그려줌. 날짜·예약바를 클릭해도 핸들러가 비어있어(`noop`) 아무 동작도 하지 않음 — 시각적으로 보기만 가능, 데이터 변경 경로 자체가 없음
- [x] 랜딩페이지 베타 혜택 배너 ("베타 기간 중 가입하면 평생 무료") — `monetizationEnabled === false`일 때만 표시, [LandingPage.tsx](src/landing/LandingPage.tsx)
  - 비로그인 방문자도 스위치 상태를 읽어야 해서 `app_settings`에 공개 읽기 RLS 정책 추가: [supabase/migrations/20260619_app_settings_public_read.sql](supabase/migrations/20260619_app_settings_public_read.sql)
- [ ] **운영자 액션 필요**: 위 2개 마이그레이션 SQL을 Supabase 대시보드에서 실행
- [ ] 스위치 ON 실행 — 운영자가 사용자 수/날짜 기준으로 직접 결정 (아직 안 함)

---

## Phase 6 — 빌링 운영 정책

- [ ] 구독 만료/결제 실패 시 데이터 처리 정책 결정 (읽기 전용 잠금 vs 완전 차단)
- [ ] 환불/취소 규정 — [TermsOfService.tsx](src/pages/Legal/TermsOfService.tsx)에 조항 추가 필요 (LAUNCH_CHECKLIST.md에도 기재됨)
- [ ] 만료 임박 알림 (이메일)

---

## Phase 7 — 테스트 & 점검

- [ ] 스위치 OFF 상태에서 가입 → 이후 스위치 ON → 해당 유저 여전히 무료인지 확인 (그랜드파더링 핵심 시나리오)
- [ ] 무료 한도 초과 시 페이월 노출 확인
- [ ] 수동결제 전체 흐름 1회 실제 테스트
- [ ] (PG 연동 후) 토스 테스트 키로 결제/환불 시나리오 테스트

---

## 진행 방식

이 문서를 위에서부터 Phase 순서대로 하나씩 진행합니다. 각 Phase 착수 전 Phase 0의 관련 결정사항이 확정되어 있는지 먼저 확인합니다. 완료된 체크박스는 이 파일에서 직접 체크하며 진행 상황을 기록합니다.

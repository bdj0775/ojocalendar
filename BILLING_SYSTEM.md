# BILLING_SYSTEM.md — 결제/구독 시스템 운영 매뉴얼

> **이 문서 하나만 읽으면 결제 시스템 구조를 파악하고 정책(가격/기간/한도/결제수단)을 수정할 수 있습니다.**
> 로드맵 전체 진행 현황은 [MONETIZATION_ROADMAP.md](./MONETIZATION_ROADMAP.md), 법적/운영 체크리스트는 [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) 참고.
> 작성일: 2026-06-19 — 정책이 바뀔 때마다 "1. 현재 운영 상태" 표를 갱신할 것.

---

## 1. 현재 운영 상태 (한눈에 보기)

| 항목 | 현재 값 |
|---|---|
| 유료화 마스터 스위치 | ⚠️ **현재 ON** (2026-06-19 테스트용으로 켜둔 채 아직 안 끔 — 8번 섹션의 SQL로 OFF 복귀 필요) |
| 무료 한도 | 숙소 1개 (`FREE_PROPERTY_LIMIT`) |
| 가격 | 미정 (임시값 9,900원 코드에 박혀있음) |
| 결제 수단 | 토스페이먼츠 PG 연동 — **테스트 키로 실제 e2e 테스트 완료** (실 결제는 사업자등록 후 Phase 4에서) |
| 베타 가입자 처리 | 가입 시점에 `plan='legacy_free'`로 **영구 고정** (스위치 켜져도 안 바뀜) |
| 정기 만료/자동 갱신 | 미구현 (Phase 6 예정) |
| PG(토스 등) 자동결제 | **테스트 모드로 구현+검증 완료.** 라이브 전환만 사업자등록 후 (Phase 4) |

---

## 2. 핵심 파일 지도 (정책 수정 시 여기만 보면 됨)

| 무엇을 바꾸고 싶을 때 | 여기를 수정 |
|---|---|
| 무료 한도 숫자 | [src/hooks/useEntitlements.ts](src/hooks/useEntitlements.ts) → `FREE_PROPERTY_LIMIT` 상수 |
| 페이월에 보이는 안내 문구 | [src/components/Modals/PaywallModal.tsx](src/components/Modals/PaywallModal.tsx) |
| 가격 (월 구독료) | [src/config/billing.ts](src/config/billing.ts) `PRO_PLAN_PRICE` **그리고** [supabase/functions/toss-billing/index.ts](supabase/functions/toss-billing/index.ts) 안의 동일 상수 — 두 곳 다 수정 필요 |
| 결제 흐름 전체(빌링키 발급/청구/구독 활성화) | [supabase/functions/toss-billing/index.ts](supabase/functions/toss-billing/index.ts) |
| 카드 등록 트리거 / 리다이렉트 처리 | [src/services/tossPayments.ts](src/services/tossPayments.ts), [src/pages/Billing/BillingSuccess.tsx](src/pages/Billing/BillingSuccess.tsx), [BillingFail.tsx](src/pages/Billing/BillingFail.tsx) |
| 게이팅이 실제로 걸리는 위치 | [src/pages/Settings/Settings.tsx](src/pages/Settings/Settings.tsx), [src/pages/DesktopSettings/DesktopSettings.tsx](src/pages/DesktopSettings/DesktopSettings.tsx) — "+ 객실 추가" 버튼 |
| DB 테이블 구조 (스키마) | [supabase/migrations/20260619_add_monetization.sql](supabase/migrations/20260619_add_monetization.sql) — `app_settings`(전체 스위치 1행), `subscriptions`(회원별 plan/status) |
| 앱이 구독 상태를 읽어오는 코드 | [src/store/useStore.ts](src/store/useStore.ts) → `subscription`, `monetizationEnabled`, `fetchSubscription()`, `fetchAppSettings()` |
| 관련 타입 | [src/types/index.ts](src/types/index.ts) → `Subscription`, `SubscriptionPlan`, `SubscriptionStatus`, `PaymentMethod` |

**중요:** `subscriptions`, `app_settings` 테이블은 클라이언트가 직접 수정 못 하도록 일부러 막아뒀습니다(RLS에 쓰기 정책 없음). 모든 변경은 Supabase 대시보드 SQL Editor에서 운영자가 직접 실행해야 합니다 — 그래서 아래 SQL 명령어들이 "운영 방법"의 전부입니다.

---

## 3. 마스터 스위치 ON/OFF (Supabase 대시보드 → SQL Editor)

```sql
-- 유료화 시작 (이 시점 이후 가입자부터 무료 한도 적용됨. 기존 가입자는 영향 없음)
UPDATE app_settings SET monetization_enabled = true WHERE id = true;

-- 다시 무료로 전환 (베타 복귀 등)
UPDATE app_settings SET monetization_enabled = false WHERE id = true;
```

**이제 전용 관리자 화면도 있습니다**: `/admin`에 관리자 이메일(`bdj0775@nate.com`)로 로그인하면 화면에서 토글 가능합니다. 위 SQL은 화면이 안 될 때를 위한 비상용으로 남겨둡니다.

---

## 4. 무료 한도 / 가격 정책 변경

- **무료 숙소 개수 변경**: `src/hooks/useEntitlements.ts`의 `FREE_PROPERTY_LIMIT = 1` 숫자만 수정 후 배포. DB 변경 불필요.
- **가격 결정/변경**: 가격은 DB에 저장하지 않음(수동결제라 운영자가 직접 안내하는 구조). 가격이 정해지면 `PaywallModal.tsx`의 안내 문구에 직접 추가.
- **한도 기준 자체를 바꾸기** (예: 숙소 개수 대신 "대시보드 특정 기능"으로): `useEntitlements.ts`의 `isUnlimited` / `propertyLimit` 로직을 교체하고, 적용 위치(Settings 페이지들)에 새 게이트를 추가.

---

## 5. 결제 처리 — 토스페이먼츠 (구현 완료, 배포 전)

계좌이체 수동결제는 운영자 결정으로 채택하지 않음. 토스페이먼츠 PG를 테스트 키로 구축
완료했고, 사업자등록 완료 후 라이브 키로 교체하는 전략으로 진행 중 (MONETIZATION_ROADMAP.md Phase 3).

**실제 흐름:**
1. 사용자가 페이월에서 "카드 등록하고 결제하기" 클릭 → `src/services/tossPayments.ts`의 `startBillingAuth()` 호출 → 토스 카드 등록 화면으로 이동
2. 카드 등록 완료 → `/billing/success?authKey=...&customerKey=...`로 리다이렉트 → `BillingSuccess.tsx`가 Edge Function `toss-billing` 호출
3. `toss-billing` Edge Function이 ① 빌링키 발급 ② 즉시 1회 결제(첫 달 구독료) ③ `subscriptions` 테이블을 `plan='pro', status='active', payment_method='toss', billing_key=..., current_period_end=+1개월`로 업데이트
4. 실패 시 `/billing/fail`로 리다이렉트

**운영자가 배포 전 해야 할 것:**
- Supabase 대시보드 SQL Editor에서 `supabase/migrations/20260619_add_toss_billing_key.sql` 실행
- `supabase functions deploy toss-billing` 으로 Edge Function 배포 (Supabase CLI 필요)
- Supabase 대시보드 → Edge Functions → toss-billing → 환경변수에 `TOSS_SECRET_KEY` 등록 (`.env.local`과 별개로 Supabase 쪽에도 등록해야 함 — Edge Function은 `.env.local`을 읽지 않음)
- 테스트 카드로 결제 위젯 → 빌링키 발급 → 구독 활성화까지 1회 직접 테스트

- 테스트 키는 사업자등록 없이 https://developers.tosspayments.com 이메일 가입만으로 발급 가능
- 시크릿 키는 클라이언트에 절대 노출하지 않음 — Edge Function 환경변수에만 존재
- 가격은 `src/config/billing.ts`의 `PRO_PLAN_PRICE`와 Edge Function 안의 동일한 상수, 두 곳 다 수정해야 함 (현재 9,900원은 가격 미정 상태의 임시값)

**키가 없거나 PG가 일시적으로 안 될 때를 위한 비상 절차** (특정 회원을 운영자가 직접 Pro로 전환):

```sql
UPDATE subscriptions
SET plan = 'pro', status = 'active', payment_method = 'manual',
    current_period_end = '2026-07-19'  -- 다음 결제일/만료일
WHERE host_id = '<해당 유저의 UUID>';
```

- 회원 UUID 찾는 법: Supabase 대시보드 → Authentication → Users → 이메일로 검색 → User UID 복사.
- `current_period_end`를 지나면 자동으로 다시 막히는 로직은 **아직 없음** (Phase 6 예정) — 지금은 운영자가 만료일을 직접 챙겨서 갱신해야 함.

---

## 6. 라이브 전환 (Phase 4, 미착수)

- 선행 조건: 사업자등록 + 토스페이먼츠 가맹점 심사 승인
- 전환 방법: 환경변수의 테스트 키를 라이브 키로 교체 (코드 수정 없이 되도록 Phase 3에서 설계)
- 이 섹션은 Phase 4를 실제로 진행할 때 구체적인 구현 내용으로 업데이트할 것

---

## 7. 자주 발생할 정책 변경 시나리오 체크리스트

| 시나리오 | 해야 할 일 |
|---|---|
| 가격을 정하거나 바꾸고 싶다 | `PaywallModal.tsx` 문구만 수정. DB 변경 없음 |
| 무료 한도를 2개로 늘리고 싶다 | `FREE_PROPERTY_LIMIT` 값만 수정 |
| "1개월 무료체험 후 자동 과금" 같은 기간제를 만들고 싶다 | `subscriptions.current_period_end` 컬럼은 이미 있음. 단, 만료 자동 감지/잠금 로직은 없으므로 추가 개발 필요 (Phase 6) |
| 결제수단을 자동화(PG)하고 싶다 | Phase 4 전체를 새로 진행 (사업자등록 선행) |
| 베타를 끝내고 정식 유료화하고 싶다 | 섹션 3의 ON 스위치 실행 |
| 특정 회원만 무료로 전환/연장해주고 싶다 (이벤트, VIP 등) | 섹션 5의 UPDATE 문을 그 회원 UUID로 실행 |

---

## 8. 테스트 후 정리할 것 (운영자 직접 처리 예정)

2026-06-19 e2e 테스트를 위해 `bdj0775@nate.com` 계정에 다음 두 가지를 임시로 변경했습니다. 베타 운영을 계속하려면 원래대로 되돌려야 합니다:

```sql
-- 1. 유료화 스위치 다시 끄기
UPDATE app_settings SET monetization_enabled = false WHERE id = true;

-- 2. 테스트 계정을 다시 영구무료(legacy_free)로 복원
UPDATE subscriptions SET plan = 'legacy_free'
WHERE host_id = (SELECT id FROM profiles WHERE email = 'bdj0775@nate.com');
```

(2번을 건너뛰고 `plan='pro'`인 채로 둬도 운영에 지장은 없습니다 — 본인 계정이니 그냥 Pro 혜택을 계속 받는 것뿐입니다. 다만 스위치(1번)는 꼭 꺼야 베타 무료 운영이 유지됩니다.)

---

## 9. 관리자 페이지 (`/admin`)

- 접근: 관리자 이메일(`src/config/admin.ts`의 `ADMIN_EMAIL`)로 로그인하면 일반 사용자와 똑같은 화면이 보이고, 네비게이션(데스크탑 상단 탭 옆 / 모바일 사이드바 "설정" 버튼 아래)에 "관리자" 메뉴가 추가로 보임 — 그걸 눌러서 진입. 다른 계정은 메뉴 자체가 안 보이고, 주소를 직접 입력해도 `/`로 조용히 튕겨짐.
- 보안 핵심: 실제 변경 권한은 프론트엔드가 아니라 각 Edge Function이 호출자 이메일을 서버 환경변수 `ADMIN_EMAIL`과 대조해서 재검증함 — 프론트 코드를 조작해도 우회 불가.
- 기능: 유료화 스위치 ON/OFF, 회원 현황 통계(전체/영구무료/무료/Pro), 이번달 결제 건수·총액, 특정 회원 이메일로 플랜 수동 전환/해지.
- 가격 변경 UI는 아직 비활성(자리만 마련) — 실제 변경은 `src/config/billing.ts` + `toss-billing` Edge Function 두 곳을 코드로 수정.
- 관련 Edge Function: `admin-settings`(스위치), `admin-stats`(통계), `admin-set-plan`(개별 회원 전환), `admin-list-users`(전체 회원 목록), `admin-user-lookup`(회원 데이터 열람 — 읽기 전용).
- 회원 검색은 이메일 직접 입력이 아니라 **드롭다운에서 목록 선택** 방식 (2026-06-19 변경 — 이메일 외워서 타이핑하기 불편하다는 피드백 반영).

**회원 데이터 열람 (읽기 전용, 최종 결정)**: 관리자가 이메일로 회원을 찾아 그 회원의 예약을 "조회"만
할 수 있습니다. 다음 두 가지는 운영자 결정으로 의도적으로 막아뒀습니다:
- 회원의 로그인 권한 자체를 가져오는 방식(매직링크 임퍼소네이션) — 보안/법적 리스크가 커서 채택 안 함
- 관리자가 회원의 예약을 대신 추가/수정/삭제하는 기능 — "사고 방지"를 위해 코드 자체를 삭제(`admin-manage-booking` Edge Function 제거). 고객이 수정을 요청해도 운영자가 직접 고치지 않고, 회원 본인이 하도록 안내하는 방향.

목록에서 회원을 선택하면 그 회원의 **실제 캘린더 화면**(달력에 예약 바가 그려진 모습)을 그대로
볼 수 있습니다 ([AdminCalendarPreview.tsx](src/pages/Admin/AdminCalendarPreview.tsx)) — "예약이 달력에
이상하게 표시된다"는 문의를 시각적으로 확인할 때 유용합니다. 날짜나 예약 바를 클릭해도 빈 함수가
연결되어 있어 아무 일도 일어나지 않습니다(수정 경로 자체가 코드에 없음).

조회할 때마다 `admin_audit_log` 테이블에 조용히 기록됩니다(누가/언제/어떤 회원을 봤는지) — 사용자에게
공개하지는 않지만, 분쟁이 생겼을 때 운영자가 "언제 어떤 이유로 봤는지" 스스로 증명할 수 있는 내부
기록용입니다. 이 로그는 클라이언트에서 조회 불가 — 필요 시 Supabase 대시보드 Table Editor에서 직접 확인.
[PrivacyPolicy.tsx](src/pages/Legal/PrivacyPolicy.tsx)에도 "고객 지원 목적으로 열람할 수 있다"는 일반
조항을 추가해 법적 근거를 미리 마련해뒀습니다(개별 통지 의무는 아님).

---

## 10. 관련 문서

- [MONETIZATION_ROADMAP.md](./MONETIZATION_ROADMAP.md) — Phase별 전체 로드맵과 진행 현황(체크박스)
- [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) — 법적 페이지, 사업자등록 등 런칭 전반 체크리스트
- [CLAUDE.md](./CLAUDE.md) — RLS, DB 컬럼 매핑 등 전체 코딩 레드라인 규칙

# PROJECT_STATUS.md — 오조캘린더 복귀 인수인계 문서

> 작성일: 2026-09-06
> 목적: 오래 방치한 프로젝트를 다시 이어서 개발하기 위한 현황 파악 문서
> 최초 작성 시 코드는 한 줄도 수정하지 않았습니다(빌드/타입체크/dev 서버 실행만 수행).
> 이후 2026-09-06에 방치돼 있던 미커밋 작업을 **내용 변경 없이 git 커밋으로만** 정리했습니다(4-2).
> 함께 읽을 문서: [CLAUDE.md](./CLAUDE.md) · [BILLING_SYSTEM.md](./BILLING_SYSTEM.md) · [MONETIZATION_ROADMAP.md](./MONETIZATION_ROADMAP.md) · [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) · [FORECAST.md](./FORECAST.md)

---

## 0. 30초 요약 (이것만 먼저)

- **마지막 커밋: 2026-06-15. 마지막 파일 수정: 2026-06-20.** 약 2개월 반 방치.
- ✅ **빌드 통과 / ESLint 통과 / dev 서버 정상 기동.** 앱은 지금 당장 돌아갑니다.
- ⚠️ **`tsc --noEmit` 타입 에러 38개.** 단, **35개는 방치 전부터 있던 것**이고 새로 생긴 건 3개뿐. 빌드 스크립트가 `vite build`만 실행하고 `tsc`를 안 돌려서 계속 통과해온 상태.
- ✅ **미커밋 작업은 2026-09-06에 6개 커밋으로 정리 완료** (4-2 참고). 단 **아직 GitHub에 push하지 않았습니다** — push하면 Vercel이 자동 배포되므로 의도적으로 보류 중.
- ✅ **유료화 스위치 ON 방치 건은 실질 위험 없음으로 확인.** 사용자가 운영자 본인 1명뿐이고, 프론트엔드가 애초에 미배포 상태였습니다.

### 복귀 시 확인된 사실 (2026-09-06)

| 항목 | 확인 결과 |
|---|---|
| 실제 사용자 수 | **운영자 본인 1명뿐** |
| Vercel 배포 상태 | **6/15 커밋 버전.** 결제·관리자·법적 페이지는 **아직 인터넷에 올라가 있지 않음** |
| 문서의 "배포 완료" 의미 | **Supabase Edge Function** 배포를 말한 것. 프론트엔드는 미배포 |
| 유료화 스위치 위험도 | **낮음** — 화면 자체가 미배포라 영향받을 사용자가 없었음 |

> 원격 저장소(`github.com/bdj0775/ojocalendar`) main의 최신 커밋이 6/15(02912b0)임을 직접 확인했습니다.
> 즉 **서버측 결제 함수는 올라가 있는데 그것을 호출할 화면은 안 올라가 있는** 상태입니다.

---

## 1. 이 프로젝트는 무엇인가

**오조캘린더(OZO Calendar)** 는 펜션·게스트하우스 등 **숙소 운영자를 위한 예약 관리 + 수익 분석 PWA**입니다. 운영자가 여러 판매 채널(에어비앤비, 부킹닷컴, 네이버, 직접예약)에 흩어진 예약을 iCal 주소로 연동하면 자동으로 한 캘린더에 모아주고, 그 데이터를 기반으로 점유율·매출·리드타임·예약 속도(Pace) 같은 지표와 **향후 몇 달치 예약 예측**까지 계산해 대시보드로 보여줍니다. 모바일에서는 앱처럼 설치되는 PWA로, 데스크탑에서는 별도의 넓은 레이아웃으로 동작하며, 백엔드는 Supabase(PostgreSQL + Auth + RLS)를 씁니다. 현재는 **베타 무료로 운영하면서 유료 구독(토스페이먼츠) 전환을 준비하던 단계**입니다.

---

## 2. 기술 스택 & 폴더 구조

### 2-1. 스택

| 항목 | 버전 |
|---|---|
| React | 19.2 |
| TypeScript | 6.0 |
| Vite | 8.0 (rolldown 기반) |
| Tailwind CSS | 4.2 (`@tailwindcss/vite`) |
| 상태관리 | Zustand 5 (`persist`) |
| 라우팅 | React Router 7 |
| 차트 | Recharts 3.8 |
| 아이콘 | lucide-react 1.0 |
| 백엔드 | Supabase (`@supabase/supabase-js` 2.103) |
| 결제 | `@tosspayments/payment-sdk` 1.9 ← **방치 직전 새로 추가된 의존성** |
| PWA | `vite-plugin-pwa` 1.3 (workbox, autoUpdate) |
| 배포 | Vercel (main 브랜치 자동 배포) |

명령어: `npm run dev` (5173) / `npm run build` / `npm run lint` / `npm run preview`

### 2-2. 폴더 구조 (src 116개 파일)

```
src/
├── App.tsx                       # 라우팅 + 인증 게이트 (RootGate/RequireAuth/OnboardingGuard)
├── main.tsx
├── types/index.ts                # 모든 도메인 타입 (491줄) — 단일 소스
├── store/useStore.ts             # ★ 전역 상태 단일 스토어 (741줄)
│
├── config/                       # ← 신규
│   ├── billing.ts                #   PRO_PLAN_PRICE = 9900 (임시값)
│   └── admin.ts                  #   ADMIN_EMAIL = 'bdj0775@nate.com'
│
├── hooks/
│   ├── useDesktopStats.ts        # ★ 모든 KPI·예측·차트 계산 허브 (784줄)
│   ├── useBookingPace.ts         #   예약 속도 차트
│   ├── useLeadTimeReport.ts      #   리드타임 분석
│   ├── usePaceInsight.ts
│   ├── useEntitlements.ts        # ← 신규 무료/유료 권한 판별
│   ├── useTranslation.ts         #   i18n (ko/en)
│   ├── useMediaQuery.ts          #   데스크탑 분기 기준 (1024px)
│   └── useInstallPrompt.ts
│
├── pages/
│   ├── Calendar/ Dashboard/ Bookings/ Settings/     # 모바일
│   ├── DesktopOverview/ DesktopDashboard/           # 데스크탑
│   │   DesktopBookings/ DesktopSettings/
│   ├── Login/ Auth/ Onboarding/ NewBooking/
│   ├── Legal/                    # ← 신규 PrivacyPolicy, TermsOfService
│   ├── Billing/                  # ← 신규 BillingSuccess, BillingFail
│   └── Admin/                    # ← 신규 AdminSettings, AdminCalendarPreview
│
├── landing/                      # 랜딩페이지 (같은 SPA 안에 존재)
│   ├── LandingPage.tsx
│   ├── sections/                 # Navbar/Hero/ThreeCard/Testimonials/Cta/Footer
│   │                             #   + Features/Pricing/Dashboard/TrustedBy (※ 현재 미사용, 4장 참고)
│   ├── components/               # FeatureCard, PricingCard, Interactive*Demo (신규)
│   └── config/content.ts
│
├── components/
│   ├── CalendarGrid/             # 달력 그리드 + useBookingBars (예약 바 배치 로직)
│   ├── Modals/                   # 예약 상세/편집/빠른입력/일자상세 + PaywallModal(신규)
│   ├── Layout/ DesktopTabNav/ Splash/ Toast/ ui/ icons/ ...
│
├── services/
│   ├── supabaseClient.ts         # Supabase 싱글톤
│   ├── tossPayments.ts           # ← 신규 카드 등록(빌링키) 트리거
│   └── icalSync/                 # ★ iCal 동기화 (레드라인)
│       ├── syncService.ts        #   syncChannel / syncAllChannels
│       ├── icsParser.ts  icalFetcher.ts  eventMapper.ts
│
├── styles/tokens/                # color/spacing/typography/border/elevation CSS 변수
└── utils/                        # colors, holidays, translations, dummyData

supabase/
├── functions/                    # Edge Functions (Deno)
│   ├── sync-ical/  export-ical/  delete-user/
│   ├── toss-billing/             # ← 신규 빌링키 발급 + 결제 + 구독 활성화
│   └── admin-settings/ admin-stats/ admin-set-plan/
│       admin-list-users/ admin-user-lookup/   # ← 전부 신규
└── migrations/                   # 20260619_* 5개가 신규
```

**루트의 `.mjs` 스크립트들**(`generate_dummyData.mjs`, `import_csv_to_supabase.mjs`, `restore_june2026.mjs` 등)은 앱 번들과 무관한 **일회성 데이터 마이그레이션/검증 도구**입니다. 실제 CSV 원본(`오조록 매출_지출 - 시트1.csv`)도 함께 커밋돼 있습니다.

---

## 3. 핵심 로직 위치 지도

| 무엇 | 어디 | 비고 |
|---|---|---|
| **전역 상태 전부** | [src/store/useStore.ts](src/store/useStore.ts) | 인증, 데이터 fetch, CRUD, 동기화, 온보딩, 구독까지 전부 여기. Context 금지 규칙 |
| **인증 흐름** | `useStore.ts` `initAuth()` (39행~) | ⚠️ 레드라인. OAuth race condition 가드 존재 |
| **DB 컬럼 매핑** | `useStore.ts` `fetchData()` (205행~) | ⚠️ 레드라인. DB는 snake_case, JS는 camelCase 수동 매핑 |
| **KPI·예측·차트 계산** | [src/hooks/useDesktopStats.ts](src/hooks/useDesktopStats.ts) | ★ 모바일·데스크탑 공유. `computeForecast()` — 픽업6, 상세는 FORECAST.md |
| **예측 알고리즘 설명** | [FORECAST.md](./FORECAST.md) | 픽업6 알고리즘·정확도·점검 절차. **수정 전 필독** |
| **iCal 동기화** | [src/services/icalSync/syncService.ts](src/services/icalSync/syncService.ts) | ⚠️ 레드라인. 채널 우선순위 순차 실행, `guestname !== '새 예약'` 수동수정 보호 |
| **달력 예약 바 배치** | [src/components/CalendarGrid/useBookingBars.ts](src/components/CalendarGrid/useBookingBars.ts) | 관리자 미리보기 화면에서도 재사용 |
| **무료/유료 권한 판별** | [src/hooks/useEntitlements.ts](src/hooks/useEntitlements.ts) | `FREE_PROPERTY_LIMIT = 1` |
| **결제 서버 로직** | [supabase/functions/toss-billing/index.ts](supabase/functions/toss-billing/index.ts) | 시크릿 키는 여기 환경변수에만 |
| **관리자 권한 재검증** | `supabase/functions/admin-*/index.ts` | 프론트가 아니라 서버에서 이메일 대조 |
| **모바일/데스크탑 분기** | `App.tsx` + `useMediaQuery('(min-width: 1024px)')` | 페이지 자체가 분리돼 있음 |

---

## 4. 마지막 작업 지점 / 미완성 / 남은 TODO

### 4-1. 타임라인

```
2026-06-15  마지막 커밋 (02912b0 — 히어로 섹션 애니메이션 다듬기)
2026-06-19  ★ 대규모 작업일: 법적 페이지 + 결제 시스템 Phase 1~3,5 + 관리자 페이지
            토스 테스트키 e2e 결제 테스트 성공
2026-06-20  랜딩 리뉴얼 작업 (ThreeCard/Testimonials/Interactive 데모) ← 여기서 멈춤
2026-09-06  (오늘) 복귀
```

**즉, 마지막으로 손대던 것은 "랜딩페이지 리뉴얼"이고, 그 직전에 끝낸 큰 작업은 "결제/관리자 시스템"입니다.**

### 4-2. 방치돼 있던 미커밋 작업 → 커밋 완료 (2026-09-06)

복귀 시점에 **수정 16개 + 신규 20여 개 파일**이 커밋 없이 떠 있었습니다. 2026-09-06에
기능 단위로 나눠 커밋했습니다. **코드 내용은 전혀 바꾸지 않았고 git에 저장만 했습니다.**

| 커밋 | 내용 |
|---|---|
| `feat(legal)` | 개인정보처리방침 / 이용약관 페이지 + 푸터 연결 |
| `feat(billing)` Phase 1-2 | 구독 데이터 모델(app_settings/subscriptions) + 무료/유료 한도 게이팅 |
| `feat(billing)` Phase 3 | 토스페이먼츠 정기결제 연동 (테스트 키) |
| `feat(admin)` Phase 5 | 관리자 페이지 + 서버 권한 검증 Edge Functions 5종 |
| `feat(landing)` | 랜딩페이지 리뉴얼 — **미완성 상태임을 커밋 메시지에 명시** |
| `docs` | 결제/런칭 문서 3종 + 본 문서 |

부수적으로 `supabase/.temp/`(Supabase CLI 로컬 캐시)를 `.gitignore`에 추가했습니다.

> ⚠️ **아직 `git push`는 하지 않았습니다.** 이 저장소는 main에 push하면 Vercel이 자동
> 배포하므로, push = 인터넷 공개입니다. 배포 준비가 됐을 때 별도로 판단해서 실행하세요.
> (push 전 점검 항목은 6장 STEP 3 참고)

### 4-3. 미완성 / 깨진 부분

| # | 내용 | 심각도 | 위치 |
|---|---|---|---|
| 1 | **유료화 마스터 스위치가 ON인 채 방치** (6/19 테스트용) — 배포 전 OFF로 되돌릴 것. ~~🔴~~ **실사용자가 본인 1명뿐이고 프론트가 미배포라 실피해는 없었음** | 🟡 낮음(배포 시 🔴) | Supabase `app_settings` / [BILLING_SYSTEM.md](./BILLING_SYSTEM.md) 8장 |
| 2 | **랜딩 섹션 4개가 고아 상태** — `FeaturesSection`, `PricingSection`, `DashboardSection`, `TrustedBySection`이 어디서도 import되지 않음. `LandingPage.tsx` 주석 번호가 1,2,4,5,6으로 **3번이 비어 있음** → 리뉴얼 하다 만 흔적 | 🟠 중간 | [src/landing/LandingPage.tsx](src/landing/LandingPage.tsx) |
| 3 | **TS 타입 에러 38개** (빌드는 통과) — 아래 4-4 상세 | 🟠 중간 | 17개 파일 |
| 4 | 구독 **만료 자동 감지/잠금 로직 없음** — `current_period_end` 컬럼은 있으나 지나도 안 막힘. 운영자가 수동으로 챙겨야 함 | 🟠 중간 | Phase 6 미착수 |
| 5 | 정기결제 **자동 갱신 없음** (Cron/Scheduled Function 미구현) | 🟠 중간 | Phase 4 |
| 6 | 결제 **실패 처리**(`past_due`, 알림) 없음 | 🟡 낮음 | Phase 4 |
| 7 | 가격이 **미정 임시값 9,900원**이며 **두 곳에 하드코딩** (`src/config/billing.ts` + `toss-billing` Edge Function) — 한쪽만 고치면 불일치 | 🟡 낮음 | |
| 8 | 관리자 **가격 설정 UI가 비활성 자리만** 마련됨 | 🟡 낮음 | `AdminSettings.tsx` |
| 9 | 에러 모니터링(Sentry)·분석(GA4) **없음** | 🟡 낮음 | LAUNCH_CHECKLIST #2,#3 |
| 10 | **테스트 코드 전무** (단위/E2E 모두) | 🟡 낮음 | |
| 11 | `sitemap.xml`, `robots.txt` 없음 | 🟡 낮음 | |
| 12 | 법적 문서가 **변호사 미검토 초안**, 사업자 정보 미기재, 환불 조항 없음 | 🟠 중간(결제 시 🔴) | `src/pages/Legal/` |
| 13 | 커스텀 도메인 미연결 → `support@ozocalendar.com` **실제 수신 여부 불명** | 🟠 중간 | |
| 14 | Supabase **백업 정책 미확인** | 🟠 중간 | |
| 15 | 번들 청크 500KB 초과 경고 (index 558KB, recharts 411KB) | 🟡 낮음 | code splitting 미적용 |
| 16 | `caniuse-lite` 6개월 경과 경고 | ⚪ 사소 | `npx update-browserslist-db@latest` |
| 17 | **랜딩 후기 3건이 실제 사용자 후기가 아님** — "실제 사용 후기" 라벨로 실명·소속과 함께 표기돼 있으나 현재 사용자는 운영자 본인 1명뿐. 공개 배포 시 표시광고법상 문제 소지 | 🟠 중간(배포 시 🔴) | [TestimonialsSection.tsx](src/landing/sections/TestimonialsSection.tsx) |

### 4-4. 타입 에러 상세 (38개)

**빌드가 통과하는 이유**: `npm run build`가 `vite build`만 실행하고 `tsc`를 돌리지 않습니다. Vite 8(rolldown)은 타입을 검사하지 않고 제거만 하므로 에러가 드러나지 않습니다.

**중요한 사실 — 대부분 방치 이전부터 있던 것입니다.** 마지막 커밋(02912b0)을 별도 워크트리에 체크아웃해 검증한 결과:

| 시점 | 에러 수 |
|---|---|
| 마지막 커밋(HEAD) 상태 | **35개** |
| 현재 작업트리 | **38개** |
| → 미커밋 작업이 새로 만든 것 | **3개** (전부 신규 랜딩 데모 파일) |

새로 생긴 3개:
```
src/landing/components/InteractiveCalendarDemo.tsx(43,17):  Cannot find namespace 'NodeJS'
src/landing/components/InteractiveModalDemo.tsx(9,17):      Cannot find namespace 'NodeJS'
src/landing/components/InteractiveDashboardDemo.tsx(266,38): Recharts ChartData 타입 불일치
```

기존 35개의 파일별 분포:
```
8  src/pages/Bookings/Bookings.tsx            (implicit any, CardProps에 없는 commission 등)
5  src/landing/sections/HeroSection.tsx       (Recharts isFront prop)
5  src/components/Modals/DayDetailModal.tsx
4  src/components/Modals/CompactQuickBookingModal.tsx
3  src/components/Modals/QuickBookingModal.tsx
2  src/pages/Login/FeatureCarousel.tsx        (NodeJS 네임스페이스)
2  src/components/Modals/BookingEditModal.tsx
1  각: PaceChart / DesktopDashboard / Calendar / PaceDetailsModal / OverlapDetector / DistributionDetailModal
```

**유형별 원인**
- `Cannot find namespace 'NodeJS'` (3건): 브라우저 프로젝트인데 `NodeJS.Timeout` 사용. `@types/node` 없음 → `ReturnType<typeof setTimeout>`으로 바꾸면 해결.
- Recharts `isFront` prop (7건): Recharts v3에서 타입 정의가 바뀜(런타임엔 동작). 라이브러리 메이저 업그레이드 후유증으로 보임.
- `Calendar.tsx(92)`: `openEditMaintModal`이 `StoreState`에 없음 → **스토어에서 제거됐는데 호출부가 남은 실제 죽은 코드**. 클릭 시 런타임 에러 가능성 있음 → 확인 필요.
- `Bookings.tsx`: `useState` setter에 함수형 업데이트를 넘겼는데 타입이 안 맞는 등 실제 버그 냄새가 나는 것 섞여 있음.

> 즉 "방치해서 깨진 것"이 아니라 **원래부터 타입 검사를 안 하고 달려온 상태**입니다. 다만 `Calendar.tsx`의 `openEditMaintModal`처럼 실제 런타임에 터질 수 있는 것이 섞여 있으니 선별 점검이 필요합니다.

### 4-5. 운영자 액션 대기 항목 (문서에 명시된 미완료)

- [ ] `20260619_add_admin_audit_log.sql` Supabase 대시보드에서 실행 여부 확인
- [ ] `20260619_app_settings_public_read.sql` 실행 여부 확인
- [ ] 유료화 스위치 OFF 복귀 (위 4-3 #1)
- [ ] 테스트 계정 `bdj0775@nate.com` plan을 `legacy_free`로 복원 (선택)

> ※ 나머지 마이그레이션(`add_monetization`, `add_payments_table`, `add_toss_billing_key`)은 e2e 결제 테스트가 성공했다는 기록으로 보아 **이미 적용된 것으로 추정**되나, 실제 적용 여부는 대시보드에서 직접 확인 필요.

---

## 5. 빌드·실행 점검 결과 (2026-09-06 실측)

| 점검 | 결과 | 상세 |
|---|---|---|
| `npm run build` | ✅ **성공** | 4.9초, exit 0. dist 생성. PWA sw.js 15개 precache |
| `npm run lint` (ESLint) | ✅ **성공** | 경고·에러 0건 |
| `npx tsc --noEmit` | ❌ **에러 38개** | 빌드엔 영향 없음(4-4 참고). 35개는 방치 전부터 존재 |
| `npm run dev` (Vite) | ✅ **성공** | 1.6초 기동, HTTP 200 정상 응답 |
| `node_modules` | ✅ 설치돼 있음 | 재설치 불필요 |
| `.env.local` | ✅ 4개 키 모두 존재 | Supabase URL/ANON_KEY, TOSS_CLIENT_KEY(test_), TOSS_SECRET_KEY(test_) |
| `.gitignore` | ✅ 안전 | `*.local` 패턴으로 `.env.local` 제외됨 |
| `console.log` 잔존 | ✅ 0건 | (단 `console.error`는 의도적으로 사용 중) |
| 코드 내 TODO/FIXME | ✅ 사실상 없음 | 주석 2건 모두 "가격 임시값" 안내 |

**빌드 시 경고 (에러 아님)**
- 청크 500KB 초과: `index-*.js` 558KB, `recharts-*.js` 411KB
- `caniuse-lite` 6개월 경과

**결론: 지금 당장 `npm run dev`로 개발 재개 가능한 상태입니다.** 환경 재구축이 필요 없습니다.

---

## 6. 추천하는 다음 단계 순서

> 2026-09-06 갱신 — **사용자가 본인 1명 + 프론트엔드 미배포**로 확인되어, 초기 판단보다
> 리스크가 훨씬 낮습니다. "사고 수습"이 아니라 "하던 작업 이어가기" 모드로 진행하면 됩니다.

### ✅ STEP 0 — 미커밋 작업 커밋 (2026-09-06 완료)

2개월 반치 작업에 세이브 포인트가 없던 것이 유일한 실질 리스크였고, 6개 커밋으로
정리했습니다 (4-2 참고). **push는 아직 하지 않았습니다.**

### 🟠 STEP 1 — 랜딩페이지 리뉴얼 마무리 (다음 작업)

마지막으로 손대던 지점입니다. **랜딩을 별도 프로젝트로 분리하지 말고 현재 구조에서
이어가는 것을 권장합니다** (판단 근거는 아래 6-1).

1. `LandingPage.tsx`의 비어 있는 "3번" 섹션 자리에 무엇을 넣을지 결정
2. 고아 상태 섹션 4개(`FeaturesSection`, `PricingSection`, `DashboardSection`,
   `TrustedBySection`) 되살릴지 삭제할지 결정 — 그대로 두면 다음에 또 헷갈립니다
3. 후기 섹션(4-3 #17) 처리 — 실제 후기로 교체하거나, "예시" 표기로 바꾸거나, 섹션 제거

### 🟠 STEP 2 — 타입 에러 중 진짜 버그만 선별 (반나절)

38개를 전부 고칠 필요는 없습니다. 우선순위:

1. **`Calendar.tsx:92` `openEditMaintModal`** — 스토어에 없는 함수를 호출 중.
   실제 런타임 에러 가능성이 있어 가장 먼저 확인
2. `NodeJS.Timeout` 3건 → `ReturnType<typeof setTimeout>` (기계적 치환, 즉시 해결)
3. `Bookings.tsx` 8건 — 실제 버그 냄새가 섞여 있어 확인 필요
4. Recharts `isFront` 7건 — 런타임엔 동작하므로 후순위

> build 스크립트에 `tsc`를 넣는 것은 **위 정리가 끝난 뒤에.** 지금 넣으면 배포가 즉시 깨집니다.

### 🟢 STEP 3 — 첫 배포 (push)

여기서 처음으로 결제·관리자·법적 페이지가 인터넷에 올라갑니다. **push 전 점검:**

- [ ] 유료화 스위치 OFF 확인 — `SELECT * FROM app_settings;`
- [ ] DB 마이그레이션 5종 적용 여부 확인
      ```sql
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('app_settings','subscriptions','payments','admin_audit_log');
      ```
- [ ] 후기 섹션(4-3 #17) 처리 완료
- [ ] 관리자 이메일이 실제 로그인 계정과 일치하는지 (`bdj0775@nate.com`)
- [ ] Vercel 환경변수에 `VITE_TOSS_CLIENT_KEY` 등록 (로컬 `.env.local`은 배포에 안 쓰임)
- [ ] `/admin`에 비관리자로 접근 시 리다이렉트되는지 실제 확인

### 🟢 STEP 4 — 정식 런칭 준비 (방향 결정 후)

- 사업자등록 → 토스 가맹점 심사 → 라이브 키 교체 (Phase 4). **라이브 결제의 유일한 병목**
- Phase 6: 구독 만료 자동 감지/잠금 (현재 만료일이 지나도 안 막힘)
- 법적 문서에 사업자 정보 + 환불 조항 추가 (결제 시작 전 필수)
- Supabase 백업 정책 확인, `support@` 메일 수신 확인
- 여유 시: Sentry, GA4, sitemap/robots, 테스트 코드, 코드 스플리팅

---

### 6-1. 랜딩페이지를 별도 프로젝트로 분리해야 하나? → **지금은 아니오**

[ROADMAP.md](./ROADMAP.md)에 적힌 분리 계획의 근거는 **SEO**입니다. React SPA는 검색엔진이
내용을 읽기 어려워서, 검색 유입이 중요한 랜딩만 Next.js로 분리하는 것이 SaaS 표준 패턴이고
그 판단 자체는 옳습니다. 다만 **지금 시점에 실행할 이유는 없습니다.**

| 분리를 미루는 이유 | 설명 |
|---|---|
| 받을 그릇이 없음 | SEO의 목적은 검색 유입 → 가입인데, 사업자등록·결제 라이브·배포 어느 것도 안 된 상태 |
| 지금 만든 게 깨짐 | 베타 배너가 `useStore`로 Supabase 스위치를 읽고, Interactive 데모들이 앱 컴포넌트를 재사용 중. 분리하려면 이 연결을 다시 설계해야 함 |
| 관리 비용 2배 | 1인 운영에 프로젝트·배포·도메인이 각각 2개가 됨 |
| 미뤄도 손해 없음 | 섹션들이 독립 컴포넌트라 나중에 옮겨도 비용이 거의 같음 |

**분리를 검토할 시점:** 정식 런칭 후 실제로 검색 유입을 늘려야 할 때, 또는 커스텀 도메인을
구매해 `ozocalendar.com`(랜딩) / `app.ozocalendar.com`(앱)으로 나눌 때.

## 7. 확인이 필요한 질문 목록

> 코드만 봐서는 판단할 수 없어 운영자 본인만 답할 수 있는 것들입니다.

### ✅ 해결됨 (2026-09-06 확인 완료)

| 질문 | 답 |
|---|---|
| 유료화 스위치를 그 뒤 끄셨나요? | 기억 없음. 다만 **실사용자 1명(본인) + 프론트 미배포**라 실피해 없음. 배포 전 OFF만 하면 됨 |
| 미커밋 작업을 커밋해도 되나요? | **예 → 6개 커밋으로 완료.** 버릴 코드 없음 확인 |
| 현재 Vercel 배포 버전은? | **6/15 커밋 버전.** 결제·관리자·법적 페이지는 미배포 (원격 저장소에서 직접 확인) |
| 실제 사용자가 있나요? | **본인 1명뿐** |
| 랜딩을 별도 프로젝트로 분리해야 하나? | **지금은 아니오** — 근거는 6-1 |

### 🟠 랜딩페이지 (마지막 작업 지점)

5. **`LandingPage.tsx`의 비어 있는 "3번" 섹션 자리에 원래 무엇을 넣으려 하셨나요?** (`DashboardSection`이 만들어져 있는데 안 쓰이고 있습니다)
6. **`FeaturesSection`, `PricingSection`을 되살릴 계획인가요, 아니면 삭제해도 되나요?** 특히 `PricingSection`은 가격 정책과 연결됩니다.
7. **랜딩 리뉴얼이 "거의 다 됐다"고 보시나요, "이제 시작"이라고 보시나요?**

### 🟡 비즈니스 결정

8. **Pro 플랜 가격을 정하셨나요?** 현재 9,900원은 임시값이며 두 곳에 하드코딩돼 있습니다.
9. **무료 한도 "숙소 1개"가 최종안인가요?** (`FREE_PROPERTY_LIMIT = 1`)
10. **사업자등록/통신판매업 신고를 진행하셨나요?** 라이브 결제의 전제 조건입니다.
11. **베타 "평생 무료" 혜택을 언제까지 줄 계획인가요?** 스위치를 켜는 시점 = 혜택 종료 시점입니다.

### 🟢 운영/인프라

12. **커스텀 도메인(`ozocalendar.com`)을 구매하셨나요?** 랜딩 문구와 지원 이메일이 이 도메인 기준으로 쓰여 있습니다.
13. **Supabase 요금제가 무엇인가요?** (무료 플랜이면 자동 백업이 제한적이고, **7일 이상 미접속 시 프로젝트가 일시정지**될 수 있습니다 — 2개월 반 방치했으므로 특히 확인 필요)
14. **토스페이먼츠 계정은 아직 살아 있나요?** 테스트 키 유효기간/정책이 바뀌었을 수 있습니다.
15. **관리자 이메일이 `bdj0775@nate.com`가 맞나요?** (git 커밋 이메일은 `bdj0775@gmail.com`이라 서로 다릅니다 — 의도된 것인지 확인 필요)
16. **`.mjs` 데이터 임포트 스크립트들과 CSV 원본을 계속 저장소에 둘 건가요?** 실데이터가 포함돼 있어 보입니다.

### ⚪ 기술 방향

17. **타입 에러 38개를 정리할 의향이 있나요?** 이 상태로 계속 갈지, 정리하고 CI에 타입체크를 넣을지 결정이 필요합니다.
18. **테스트 코드를 도입할 계획이 있나요?** 특히 예측 알고리즘과 iCal 동기화는 회귀 위험이 큰 영역입니다.
19. **랜딩페이지를 별도 Next.js 프로젝트로 분리**하려던 초기 계획([ROADMAP.md](./ROADMAP.md))은 아직 유효한가요? 현재는 같은 SPA 안에 있습니다.

---

## 8. 참고 — 반드시 지켜야 할 레드라인 (CLAUDE.md 요약)

복귀 후 코드를 만질 때 특히 조심할 4곳:

1. **iCal 동기화** (`syncService.ts`) — `guestname !== '새 예약'` 조건이 수동 수정 보호의 핵심. 채널 순차 실행 순서를 바꾸면 중복 예약 발생 가능
2. **인증 흐름** (`useStore.ts` `initAuth()`) — OAuth race condition 가드 제거 시 소셜 로그인 무한 로딩
3. **DB 컬럼 매핑** — snake_case ↔ camelCase 수동 매핑. 한쪽만 바꾸면 데이터가 조용히 사라짐
4. **RLS 정책** — 새 테이블 추가 시 반드시 함께. 없으면 전체 사용자 데이터 공개

그 외: `new Date('YYYY-MM-DD')` 직접 사용 금지 (반드시 `+ 'T12:00:00'`), `any` 금지, `console.log` 커밋 금지.
